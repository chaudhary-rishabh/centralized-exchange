import "dotenv/config";
import express, { type Request, type Response } from "express";
import { prisma } from "@perps/db";
import authRoute from "./module/auth/auth.route.js";
import exchangeRoute from "./module/exchange/exchange.route.js";
import { startListener } from "./listener.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 5000;

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: true, message: "server is up and running!" });
});

app.get("/health/db", async (_req: Request, res: Response) => {
    try {
        await prisma.market.findFirst();
        res.status(200).json({ status: true, message: "Db connected and running" });
    } catch {
        res.status(500).json({ status: false, message: "Something went wrong" });
    }
});

app.use("/perps/v2/auth", authRoute);
app.use("/perps/v2/exchange", exchangeRoute);

app.listen(PORT, () => {
    console.log(`[api] Server listening on port ${PORT}`);
    // Start the from_engine listener in the background after server is ready.
    startListener().catch((err) => {
        console.error("[api] Listener crashed:", err);
        process.exit(1);
    });
});
