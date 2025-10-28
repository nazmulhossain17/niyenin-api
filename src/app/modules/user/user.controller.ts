import type { Request, Response } from "express";
import { eq, and, count } from "drizzle-orm";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  updateUserSchema,
} from "./user.validation";
import { db } from "../../../db";
import { rolesTable, users } from "../../../db/schema";
import jwt from "jsonwebtoken";
import { comparePassword, generateAccessToken, hashPassword } from "../../../utils/auth.utils";
import config from "../../../config/config";
import generateCookieOptions from "../../../lib/genreateCookieOptions";


// ✅ Register new user
export const registerUser = async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { firstName, lastName, email, password, phone, address } = parsed.data;

    // Check duplicate email/phone
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0)
      return res.status(409).json({ error: "Email already exists" });

    if (phone) {
      const phoneExists = await db.select().from(users).where(eq(users.phone, phone));
      if (phoneExists.length > 0)
        return res.status(409).json({ error: "Phone number already exists" });
    }

    // Get the customer role from the database
    const [customerRole] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.name, 'customer'));

    if (!customerRole) {
      return res.status(500).json({ error: "Default customer role not found. Please contact administrator." });
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        address,
        roleId: customerRole.roleId, // Use the actual roleId, not 'default'
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

    return res.status(201).json({ user: newUser });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};
// ✅ Login user
export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profilePic: users.profilePic,
        password: users.password,
        isActive: users.isActive,
        roleLevel: rolesTable.name, // ✅ we’ll now join this correctly
      })
      .from(users)
      .leftJoin(rolesTable, eq(users.roleId, rolesTable.roleId)) // ✅ JOIN added here
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isActive)
      return res.status(401).json({ error: "Account is deactivated" });

    const isValid = await comparePassword(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const jwt_user_token = jwt.sign(
      {
        user: {
            profilePic: user.profilePic,
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        }
      }, config.jwt.secret!
    )

    res.cookie(config.cookie_token_name!, jwt_user_token, generateCookieOptions())

    return res.json({
        payload: { user: { ...user, password: undefined }, token: jwt_user_token },
        message: 'loge in success',
      });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

// ✅ Get profile
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

// ✅ Update profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success){
      const message = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: message });
      }

    const updated = await db
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

    if (!updated.length)
      return res.status(404).json({ error: "User not found" });

    return res
      .status(200)
      .json({ user: updated[0], message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

// ✅ Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success){
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

const getLoggedInUser = async (req: Request, res: Response) => {
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