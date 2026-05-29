import { z } from "zod";

export const OnrampSchema = z.object({
    userId: z.string().min(1),
    amount: z.number().positive(),
});

export type OnrampInput = z.infer<typeof OnrampSchema>;