import { Router } from "express";
import { validate } from "../middleware/validate";
import { CreateMarketSchema, GetMarketsSchema } from "../schemas/market.schema";
import {
    getMarketsController,
    getMarketController,
    createMarketController,
} from "../controllers/market.controller";

const router = Router();

router.get("/", validate(GetMarketsSchema, "query"), getMarketsController);
router.get("/:slug", getMarketController);
router.post("/", validate(CreateMarketSchema), createMarketController);

export default router;