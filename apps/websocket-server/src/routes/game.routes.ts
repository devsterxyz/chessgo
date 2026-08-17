import { Router } from "express"
import { getPlayerGameHistory } from "../controllers/game.controller.js"

const router = Router()

router.route("/history/:username").get(getPlayerGameHistory)

export default router
