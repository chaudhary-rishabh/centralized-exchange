import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                status: true,
                message: "Token required"
            })
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET!
        ) as { userId: number };

        req.userId = decoded.userId;

        next();
    } catch (error: unknown) {
        res.status(500).json({
            status: false,
            message: "Something went wrong"
        })
    }
}