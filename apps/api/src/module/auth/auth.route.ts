import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import {LoginSchema, SignupSchema} from "@perps/schema"
import { login, signup } from "./auth.controller.js";

const router: Router = Router();

router.post("/login", validate(LoginSchema), login)
router.post("/signup", validate(SignupSchema), signup)

export default router