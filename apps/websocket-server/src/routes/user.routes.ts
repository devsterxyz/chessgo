import { Router } from "express";
import {
  createGuestUser,
  getUserProfile,
  logoutUser,
  registerUser,
  signInUser
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/user.middleware.js";




const router = Router()

router.route("/register").post(registerUser)
router.route("/signIn").post(signInUser)
router.route("/logout").post(logoutUser)
router.route("/guest").post(createGuestUser)
router.route("/getProfile").get(verifyJWT, getUserProfile)


export default router
