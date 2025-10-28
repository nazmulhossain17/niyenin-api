import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { paginationHelpers } from "../../../helpers/paginationHelper";
import { IGenericResponse } from "../../../interfaces/common";
import { IPaginationOptions } from "../../../interfaces/pagination";
import { IUserFilterRequest } from "./user.interface";

interface User {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}


export const getAllUsersDB = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<User[]>> => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filtersData } = filters;

  const conditions: any[] = [];

  // 🔍 Search filter (by first name, last name, email, or phone)
  if (searchTerm) {
    conditions.push(
      or(
        ilike(users.firstName, `%${searchTerm}%`),
        ilike(users.lastName, `%${searchTerm}%`),
        ilike(users.email, `%${searchTerm}%`),
        ilike(users.phone, `%${searchTerm}%`)
      )
    );
  }

  // 🧩 Other filters (e.g. isActive, roleId, etc.)
  for (const [key, value] of Object.entries(filtersData)) {
    if (value !== undefined && value !== null && users[key as keyof typeof users]) {
      conditions.push(eq(users[key as keyof typeof users], value as any));
    }
  }

  // 🧮 Get filtered and paginated users
  const result = await db
    .select()
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .offset(skip);

  // 📊 Total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = totalResult[0]?.count ?? 0;

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};