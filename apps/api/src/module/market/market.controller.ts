import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

// ── GET /markets ───────────────────────────────────────────────────────────
// Query: ?active=true|false  (omit = all markets)

export async function getMarketsController(req: Request, res: Response, next: NextFunction) {
    try {
        const { active } = req.query;

        const markets = await prisma.market.findMany({
            where: active !== undefined ? { isActive: active === "true" } : {},
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ markets });
    } catch (err) {
        next(err);
    }
}

// ── GET /markets/:slug ─────────────────────────────────────────────────────
// Returns market + last price + 24h volume

export async function getMarketController(req: Request, res: Response, next: NextFunction) {
    try {
        const { slug } = req.params;

        const market = await prisma.market.findUnique({ where: { slug } });
        if (!market)
            return res.status(404).json({ error: "Market not found" });

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [lastFill, volumeAgg] = await Promise.all([
            prisma.fill.findFirst({
                where: { marketId: market.id },
                orderBy: { createdAt: "desc" },
            }),
            prisma.fill.aggregate({
                where: { marketId: market.id, createdAt: { gte: since } },
                _sum: { qty: true },
            }),
        ]);

        return res.status(200).json({
            ...market,
            lastPrice: lastFill?.price ?? null,
            volume24h: volumeAgg._sum.qty ?? 0,
        });
    } catch (err) {
        next(err);
    }
}

// ── POST /markets ──────────────────────────────────────────────────────────

export async function createMarketController(req: Request, res: Response, next: NextFunction) {
    try {
        const { slug, imageUrl } = req.body;

        const exists = await prisma.market.findUnique({ where: { slug } });
        if (exists)
            return res.status(409).json({ error: "Market already exists" });

        const market = await prisma.market.create({
            data: { slug, imageUrl },
        });

        return res.status(201).json({ market });
    } catch (err) {
        next(err);
    }
}