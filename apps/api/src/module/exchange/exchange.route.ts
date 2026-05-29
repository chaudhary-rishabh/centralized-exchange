import { Router } from "express";
import { onrampController } from "./onramp.controller.js";
import { orderController } from "./order.controller.js";

const router: Router = Router();

router.post("/onramp", onrampController);
router.post("/order", orderController);

export default router;