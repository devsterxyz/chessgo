import { Router } from "express";
import { registerUser, signInUser } from "../controllers/user.controller.js";




const router = Router()

router.route("/register").post(registerUser)
router.route("/signIn").post(signInUser)
router.route("/logout")


export default router
