import { z } from "zod";

export const SignupSchema = z.object({
    username: z.string().min(2, "Min 2 char required").max(100, "Must be less than 100"),
    email: z.email(),
    password: z.string().min(8, "Password must be at least 10 char long").max(100, "Password must be less than 100")
})

export const LoginSchema = z.object({
    email: z.email(),
    password: z.string().min(8, "password cannot be greater than 8 char").max(100, "Password must be less than 100 char")
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>