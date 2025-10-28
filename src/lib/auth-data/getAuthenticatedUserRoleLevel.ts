import { eq } from "drizzle-orm";
import { db } from "../../db";
import { rolesTable, users } from "../../db/schema";

export const getAuthenticatedUserRoleLevel = async ({ userId }: { userId: string }) => {
  const [userRole] = await db
    .select({
      level: rolesTable.level,
      name: rolesTable.name,
    })
    .from(users)
    .leftJoin(rolesTable, eq(rolesTable.roleId, users.roleId))
    .where(eq(users.userId, userId)) // ✅ ok if id is uuid/text
    .limit(1);

  return userRole;
};
