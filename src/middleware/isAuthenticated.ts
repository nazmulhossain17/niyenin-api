import { NextFunction, Request, Response } from "express";
import config from "../config/config";
import jwt from "jsonwebtoken";
import { users } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decodedToken = jwt.verify(token, config.jwt.secret!) as {
      id: number;
      role: "admin" | "vendor" | "customer";
    };

    if (!decodedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ Use Drizzle query instead of Prisma findUnique
    const account = await db
      .select()
      .from(users)
      .where(eq(users.id, decodedToken.id))
      .limit(1);

    if (!account || account.length === 0) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach account info to request if needed
    (req as any).user = account[0];

    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized! Token expired" });
  }
};

export default isAuthenticated;