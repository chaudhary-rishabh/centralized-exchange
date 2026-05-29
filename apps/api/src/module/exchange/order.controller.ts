import type { Request, Response, NextFunction } from "express";
import { prisma } from "@perps/db";
import { redis } from "../../redis.js";
import type { ToEngine } from "../../types.js";

export async function orderController(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, marketSlug, side, orderType, price, qty } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: "User not found" });

        const market = await prisma.market.findUnique({ where: { slug: marketSlug } });
        if (!market)
            return res.status(404).json({ error: "Market not found" });
        if (!market.isActive)
            return res.status(400).json({ error: "Market is not active" });

        const lockAmount =
            orderType !== "Limit" ? 0 :
                side === "Bid" ? price * qty :
                    qty;

        if (lockAmount > 0 && user.balance.toNumber() < lockAmount)
            return res.status(400).json({ error: "Insufficient balance" });

        if (lockAmount > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    balance: { decrement: lockAmount },
                    lockedBalance: { increment: lockAmount },
                },
            });
        }

        const order = await prisma.order.create({
            data: {
                userId,
                marketId: market.id,
                side,
                orderType,
                status: "Open",
                price: price ?? null,
                qty,
                filledQty: 0,
                initialMargin: lockAmount,
                slippage: 0,
            },
        });

        const msg: ToEngine = {
            type: "ORDER",
            userId,
            marketId: market.id,
            side,
            orderType,
            price: price ?? null,
            qty,
            orderId: order.id,
        };

        await redis.xadd("stream:to_engine", "*", "data", JSON.stringify(msg));

        return res.status(200).json({ orderId: order.id });
    } catch (err) {
        next(err);
    }
}
