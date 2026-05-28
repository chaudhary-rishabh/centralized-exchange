import express, { type Request, type Response } from "express";
import {prisma} from "@perps/db";
import authRoute from "./module/auth/auth.route.js"

const app = express();
const PORT = process.env.PORT ?? 5000;


app.use("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: true,
        messaeg: "server is up and running!"
    })
})

app.use("/health/db", async(req: Request, res: Response) => {
    try {
        const response = await prisma.market.findFirst();
        if (!response) {
            res.status(404).json({
                status: false,
                message: "db not found"
            })
        }
        res.status(200).json({
            status: true,
            message: "Db connected and running"
        })
    } catch (error: unknown) {
        res.status(500).json({
            status: false,
            message: "Something went wrong"
        })
    }
})

app.use("/perps/v2/auth", authRoute)

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})