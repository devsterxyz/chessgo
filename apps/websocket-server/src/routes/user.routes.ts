import { Router } from "express";
import {
  createGuestUser,
  logoutUser,
  registerUser,
  signInUser
} from "../controllers/user.controller.js";




const router = Router()

router.route("/register").post(registerUser)
router.route("/signIn").post(signInUser)
router.route("/logout").post(logoutUser)
router.route("/guest").post(createGuestUser)


export default router
