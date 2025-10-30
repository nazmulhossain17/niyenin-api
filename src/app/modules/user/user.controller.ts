import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  updateUserSchema,
} from "./user.validation";
import { db } from "../../../db";
import { rolesTable, users } from "../../../db/schema";
import jwt from "jsonwebtoken";
import { comparePassword, hashPassword } from "../../../utils/auth.utils";
import config from "../../../config/config";
import generateCookieOptions from "../../../lib/genreateCookieOptions";


/* ============================
 * REGISTER USER
 * ============================ */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { firstName, lastName, email, password, phone, address } = parsed.data;

    // 🔍 Check if email or phone already exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0)
      return res.status(409).json({ error: "Email already exists" });

    if (phone) {
      const phoneExists = await db.select().from(users).where(eq(users.phone, phone));
      if (phoneExists.length > 0)
        return res.status(409).json({ error: "Phone number already exists" });
    }

    // 🔍 Get "customer" role from roles table
    const [customerRole] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.name, "customer"));

    if (!customerRole) {
      return res
        .status(500)
        .json({ error: "Default customer role not found. Please contact administrator." });
    }

    // 🔐 Hash password
    const hashedPassword = await hashPassword(password);

    // 🧾 Insert user
    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        address,
        roleId: customerRole.roleId,
      })
      .returning({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        address: users.address,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};

/* ============================
 * LOGIN USER
 * ============================ */
export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { email, password } = parsed.data;

    // ✅ JOIN rolesTable to get user role info
    const [user] = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profilePic: users.profilePic,
        password: users.password,
        isActive: users.isActive,
        roleName: rolesTable.name,
      })
      .from(users)
      .leftJoin(rolesTable, eq(users.roleId, rolesTable.roleId))
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isActive)
      return res.status(403).json({ error: "Account is deactivated" });

    // ✅ Check password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    // ✅ Generate JWT token
    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleName: user.roleName,
      profilePic: user.profilePic,
    };

    const jwtUserToken = jwt.sign({ user: tokenPayload }, config.jwt.secret!, {
      expiresIn: "7d",
    });

    // 🍪 Set HTTP-only cookie
    res.cookie(config.cookie_token_name!, jwtUserToken, generateCookieOptions());

    return res.json({
      message: "Login successful",
      payload: { user: tokenPayload, token: jwtUserToken },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

/* ============================
 * GET PROFILE
 * ============================ */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [user] = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        address: users.address,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Failed to retrieve profile" });
  }
};

/* ============================
 * UPDATE PROFILE
 * ============================ */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.userId, userId))
      .returning({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        address: users.address,
        isActive: users.isActive,
        updatedAt: users.updatedAt,
      });

    if (!updated) return res.status(404).json({ error: "User not found" });

    return res
      .status(200)
      .json({ user: updated, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

/* ============================
 * CHANGE PASSWORD
 * ============================ */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
    }

    const userId = req.user!.userId;
    const { currentPassword, newPassword } = parsed.data;

    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid)
      return res.status(400).json({ error: "Current password is incorrect" });

    const hashedNew = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedNew, updatedAt: new Date() })
      .where(eq(users.userId, userId));

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Failed to change password" });
  }
};

/* ============================
 * GET LOGGED-IN USER (whoAmI)
 * ============================ */
export const getLoggedInUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        address: users.address,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get logged in user error:", error);
    return res.status(500).json({ error: "Failed to retrieve logged in user" });
  }
};