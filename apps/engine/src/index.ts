import "dotenv/config";
import { prisma } from "@perps/db";
import { redis } from "./redis.js";

const STREAM_IN  = "stream:to_engine";
const STREAM_OUT = "stream:from_engine";
const GROUP      = "engine-group";
const CONSUMER   = "engine-consumer-1";

const MAKER_FEE = 0.0002;
const TAKER_FEE = 0.0005;

type ToEngine =
  | { type: "ONRAMP"; userId: number; amount: number; txnId: string }
  | { type: "ORDER"; userId: number; marketId: number; side: string; orderType: string; price: number | null; qty: number; orderId: number };

type FromEngine =
  | { type: "ONRAMP_DONE"; userId: number; newBalance: number }
  | { type: "ORDER_RESULT"; orderId: number; status: string; filledQty: number; fills: { price: number; qty: number; makerOrderId: number }[] }
  | { type: "ERROR"; ref: string; message: string };

async function publish(msg: FromEngine) {
    await redis.xadd(STREAM_OUT, "*", "data", JSON.stringify(msg));
}

async function handleOnramp(msg: Extract<ToEngine, { type: "ONRAMP" }>) {
    const user = await prisma.user.findUnique({ where: { id: msg.userId } });
    if (!user) throw new Error(`User ${msg.userId} not found`);

    await prisma.user.update({
        where: { id: msg.userId },
        data: { balance: { increment: msg.amount } },
    });

    const updated = await prisma.user.findUnique({ where: { id: msg.userId }, select: { balance: true } });
    await publish({ type: "ONRAMP_DONE", userId: msg.userId, newBalance: updated!.balance.toNumber() });
}

async function handleOrder(msg: Extract<ToEngine, { type: "ORDER" }>) {
    const { userId, marketId, side, orderType, price, qty, orderId } = msg;

    // Fetch resting orders on the opposite side.
    const restingOrders = await prisma.order.findMany({
        where: {
            marketId,
            side: side === "Bid" ? "Ask" : "Bid",
            status: { in: ["Open", "PartiallyFilled"] },
            ...(orderType === "Limit" && side === "Bid" && price !== null && { price: { lte: price } }),
            ...(orderType === "Limit" && side === "Ask" && price !== null && { price: { gte: price } }),
        },
        orderBy: [
            { price: side === "Bid" ? "asc" : "desc" },
            { createdAt: "asc" },
        ],
    });

    let remainingQty = qty;
    const fills: { price: number; qty: number; makerOrderId: number }[] = [];

    for (const resting of restingOrders) {
        if (remainingQty <= 0) break;

        const restingRemaining = resting.qty.toNumber() - resting.filledQty.toNumber();
        const fillQty   = Math.min(remainingQty, restingRemaining);
        const fillPrice = resting.price!.toNumber();
        const tradeValue = fillPrice * fillQty;
        const makerFee   = tradeValue * MAKER_FEE;
        const takerFee   = tradeValue * TAKER_FEE;

        await prisma.fill.create({
            data: {
                marketId,
                makerOrderId: resting.id,
                takerOrderId: orderId,
                makerId: resting.userId,
                takerId: userId,
                qty: fillQty,
                price: fillPrice,
                makerFee,
                takerFee,
            },
        });

        fills.push({ price: fillPrice, qty: fillQty, makerOrderId: resting.id });

        const newRemaining = restingRemaining - fillQty;
        await prisma.order.update({
            where: { id: resting.id },
            data: {
                filledQty: { increment: fillQty },
                status: newRemaining === 0 ? "Filled" : "PartiallyFilled",
            },
        });

        if (side === "Bid") {
            // Maker was selling (Ask): unlock their qty, credit trade value minus fee.
            await prisma.user.update({
                where: { id: resting.userId },
                data: {
                    lockedBalance: { decrement: fillQty },
                    balance: { increment: tradeValue - makerFee },
                },
            });

            if (orderType === "Limit" && price !== null) {
                // Taker was a Limit Bid: locked price*qty, refund overpay.
                const wasLocked = price * fillQty;
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        lockedBalance: { decrement: wasLocked },
                        balance: { increment: wasLocked - tradeValue },
                    },
                });
            }
        } else {
            // side === "Ask" — maker was buying (Bid).
            await prisma.user.update({
                where: { id: resting.userId },
                data: { lockedBalance: { decrement: tradeValue } },
            });

            await prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: tradeValue - takerFee } },
            });
        }

        remainingQty -= fillQty;
    }

    const filledQty   = qty - remainingQty;
    const finalStatus =
        remainingQty === 0              ? "Filled"
        : filledQty > 0                ? "PartiallyFilled"
        : orderType === "Market"       ? "Cancelled"
        :                                "Open";

    await prisma.order.update({
        where: { id: orderId },
        data: { filledQty, status: finalStatus as "Open" | "PartiallyFilled" | "Filled" | "Cancelled" },
    });

    await publish({ type: "ORDER_RESULT", orderId, status: finalStatus, filledQty, fills });
}

async function processMessage(id: string, fields: string[]) {
    const dataIndex = fields.indexOf("data");
    if (dataIndex === -1) throw new Error("No 'data' field in message");
    const raw = fields[dataIndex + 1];
    if (!raw) throw new Error("Empty 'data' field");

    const msg = JSON.parse(raw) as ToEngine;

    if (msg.type === "ONRAMP") {
        await handleOnramp(msg);
    } else if (msg.type === "ORDER") {
        await handleOrder(msg);
    } else {
        throw new Error(`Unknown message type: ${(msg as { type: string }).type}`);
    }
}

async function createConsumerGroup() {
    try {
        await redis.xgroup("CREATE", STREAM_IN, GROUP, "0", "MKSTREAM");
        console.log(`[engine] Consumer group '${GROUP}' created`);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("BUSYGROUP")) {
            console.log(`[engine] Consumer group '${GROUP}' already exists`);
        } else {
            throw err;
        }
    }
}

async function run() {
    await createConsumerGroup();
    console.log(`[engine] Listening on ${STREAM_IN} as consumer '${CONSUMER}'`);

    while (true) {
        const reply = await redis.xreadgroup(
            "GROUP", GROUP, CONSUMER,
            "BLOCK", 0,
            "COUNT", 1,
            "STREAMS", STREAM_IN, ">"
        ) as [string, [string, string[]][]][] | null;

        if (!reply) continue;

        for (const [, entries] of reply) {
            for (const [id, fields] of entries) {
                try {
                    await processMessage(id, fields);
                    // xAck only after successful processing.
                    await redis.xack(STREAM_IN, GROUP, id);
                } catch (err) {
                    // Do NOT ack — message stays in PEL for redelivery.
                    console.error(`[engine] Failed to process message ${id}:`, err);
                    try {
                        await publish({
                            type: "ERROR",
                            ref: id,
                            message: err instanceof Error ? err.message : String(err),
                        });
                    } catch (pubErr) {
                        console.error("[engine] Failed to publish error:", pubErr);
                    }
                }
            }
        }
    }
}

run().catch((err) => {
    console.error("[engine] Fatal error:", err);
    process.exit(1);
});
