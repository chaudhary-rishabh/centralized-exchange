import { z } from "zod";

export const OrderSchema = z
    .object({
        userId: z.string().min(1),
        market: z.string().min(1),
        side: z.enum(["BUY", "SELL"]),
        type: z.enum(["MARKET", "LIMIT"]),
        price: z.number().positive().optional(),
        quantity: z.number().positive(),
    })
    .refine(
        (data) => data.type !== "LIMIT" || data.price !== undefined,
        { message: "LIMIT order requires price", path: ["price"] }
    );

export type OrderInput = z.infer<typeof OrderSchema>;