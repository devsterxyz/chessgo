import { Router } from "express";
import {
  createGuestUser,
  getUserProfile,
  logoutUser,
  registerUser,
  signInUser,
  updateUser
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/user.middleware.js";




const router = Router()

router.route("/register").post(registerUser)
router.route("/signIn").post(signInUser)
router.route("/logout").post(logoutUser)
router.route("/guest").post(createGuestUser)
router.route("/getProfile").get(verifyJWT, getUserProfile)
router.route("/updateProfile").put(verifyJWT, updateUser)


export default router
