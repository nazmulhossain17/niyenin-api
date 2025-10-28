import { Request, Response, NextFunction } from "express";
import { ZodError, ZodObject } from "zod";

export const validateBody =
  (schema: ZodObject<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    // console.log("🔹 Incoming body:", req.body); // 👈 Debug body
    console.log("🔹 Incoming query:", req.query);
    console.log("🔹 Incoming params:", req.params);

    try {
      // Instead of wrapping in { body: req.body }, parse req.body directly
      schema.parse(req.body);

      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        console.error("❌ Zod validation error:", error.issues);

        return res.status(400).json({
          success: false,
          error: error.issues.map((err: any) => ({
            path: err.path,
            message: err.message,
            received: req.body[err.path[0]], // 👈 log what was received
          })),
        });
      }

      console.error("❌ Other validation error:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Validation failed",
      });
    }
  };
