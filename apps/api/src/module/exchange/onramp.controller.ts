import type { Request, Response, NextFunction } from "express";
import { prisma } from "@perps/db";
import { redis } from "../../redis.js";
import { randomUUID } from "crypto";
import type { ToEngine } from "../../types.js";

export async function onrampController(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, amount } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: "User not found" });

        const txnId = randomUUID();

        const msg: ToEngine = { type: "ONRAMP", userId, amount, txnId };
        await redis.xadd("stream:to_engine", "*", "data", JSON.stringify(msg));

        return res.status(200).json({ txnId });
    } catch (err) {
        next(err);
    }
}
