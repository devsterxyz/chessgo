import { Router } from "express";
import { getPublicProfile, searchProfiles } from "../controllers/profile.controller.js";

const router = Router();

// GET /profile/search?q=...  → must come BEFORE /:username to avoid shadowing
router.route("/search").get(searchProfiles);

// GET /profile/:username  → public profile page data
router.route("/:username").get(getPublicProfile);

export default router;
