import { Router } from "express";
import {
  changePassword,
  getProfile,
  login,
  registerUser,
  updateProfile,
} from "./user.controller";
import isAuthenticated from "../../../middleware/isAuthenticated";


const router = Router();

// Public routes
// router.get("/logged-in-user", isAuthenticated, getLoggedInUser)
router.get("/profile", isAuthenticated, getProfile);
router.post("/register", registerUser);
router.post("/login", login);



export default router;
