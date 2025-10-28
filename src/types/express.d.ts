import "express";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      email?: string;
      role?: string;
    }

    interface Request {
      user?: UserPayload;
      token?: string;
      userRole?: {
        level: number | null;
        name: string | null;
      } | null;
    }
  }
}
