import { Request, Response } from "express";
import express from "express";
import { db } from "../../../db";
import { StatusCodes } from "http-status-codes";
import { rolesTable, users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../../../middleware/auth";

const router = express.Router();

const handleGetWhoAmI = async (req: Request, res: Response) => {
  const user = req.user!;

  // Fetch user's role info
  const [role] = await db
    .select({
      level: rolesTable.level,
      name: rolesTable.name,
    })
    .from(users)
    .leftJoin(rolesTable, eq(rolesTable.roleId, users.roleId))
    .where(eq(users.userId, user.userId))
    .limit(1);

  return res.status(StatusCodes.OK).json({
    message: "Authorized",
    payload: {
      user: { ...user, role },
      token: req.token,
    },
  });
};

// Define the /whoami route
router.get("/whoami", auth.onlyUserAuth, handleGetWhoAmI);

export default router;