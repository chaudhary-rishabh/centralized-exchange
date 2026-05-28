import { prisma } from "@perps/db";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            })
        }
        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
            return res.status(401).json({
                status: false,
                message: "Incorrect Username or Password"
            })
        }

        const token = jwt.sign({
            userId: user.id,
        }, process.env.JWT_SECRET!, {expiresIn: '1d'})

        res.status(200).json({
            status: true,
            message: "User logged in successfully",
            token: token 
        })
    } catch (error: unknown) {
        res.status(500).json({
            status: false,
            message: "Something went wrong"
        })
    }
}

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, email, password } = req.body;

        const encrypt = await bcrypt.hash(password, 10)

        const response = await prisma.user.create({
            data: {
                username,
                email,
                password: encrypt
            }
        })

        res.status(201).json({
            status: true,
            message: "User created successfully",
            response: response.id
        })
    } catch (error: unknown) {
        res.status(500).json({
            status: false,
            message: "Something went wrong"
        })
    }
}