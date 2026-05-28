import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod"

export const validate = (schema: ZodType) => 
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                status: false,
                message: "Invalid request body"
            })
        }

        req.body = result.data
        next()
    }
    