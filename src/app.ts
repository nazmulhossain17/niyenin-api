import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./app/modules/whoami/whoami.controller";
import userRouter from "./app/modules/user/user.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middlewares
app.use(cors(
  {
    origin: "http://localhost:3000",
    credentials: true,
  }
));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", authRouter)
app.use("/api/v1", userRouter);


// Test route
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Server is working!");
});

// Catch-all 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
