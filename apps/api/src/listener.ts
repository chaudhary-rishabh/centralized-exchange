import { prisma } from "@perps/db";
import { redis } from "./redis.js";
import type { WebSocket } from "ws";
import type { FromEngine } from "./types.js";

// Map of userId -> connected WebSocket so the listener can push results.
export const clients = new Map<number, WebSocket>();

export async function startListener() {
    // Start from "$" so we only receive messages produced after this process starts.
    let lastId = "$";

    console.log("[listener] Waiting for results on stream:from_engine");

    while (true) {
        const reply = await redis.xread(
            "BLOCK", 0,
            "COUNT", 10,
            "STREAMS", "stream:from_engine", lastId
        ) as [string, [string, string[]][]][] | null;

        if (!reply) continue;

        for (const [, entries] of reply) {
            for (const [id, fields] of entries) {
                lastId = id;

                const dataIndex = fields.indexOf("data");
                if (dataIndex === -1) continue;

                const raw = fields[dataIndex + 1];
                if (!raw) continue;

                let msg: FromEngine;
                try {
                    msg = JSON.parse(raw) as FromEngine;
                } catch {
                    console.error("[listener] Failed to parse message:", raw);
                    continue;
                }

                await handleResult(msg);
            }
        }
    }
}

async function handleResult(msg: FromEngine) {
    if (msg.type === "ONRAMP_DONE") {
        // Engine already wrote the balance update to Postgres; just broadcast.
        const ws = clients.get(msg.userId);
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "ONRAMP_DONE", newBalance: msg.newBalance }));
        }
        return;
    }

    if (msg.type === "ORDER_RESULT") {
        // Engine already wrote filledQty/status to Postgres; just read for broadcast context.
        const order = await prisma.order.findUnique({
            where: { id: msg.orderId },
            select: { userId: true, qty: true, filledQty: true },
        });
        if (!order) return;

        const ws = clients.get(order.userId);
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
                type: "ORDER_RESULT",
                orderId: msg.orderId,
                status: msg.status,
                filledQty: msg.filledQty,
                remainingQty: order.qty.toNumber() - order.filledQty.toNumber(),
                fills: msg.fills,
            }));
        }
        return;
    }

    if (msg.type === "ERROR") {
        console.error(`[listener] Engine error ref=${msg.ref}: ${msg.message}`);
    }
}
