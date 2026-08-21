import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import paystackRouter from "./payments/paystack.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";

// --------------------------------------------------
// Security / middleware
// --------------------------------------------------

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    app: "Veylora",
    service: "Backend API",
    status: "online",
    environment: NODE_ENV
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "veylora-backend",
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------
// Payment routes
// --------------------------------------------------

app.use("/api/payments", paystackRouter);

// --------------------------------------------------
// 404 handler
// --------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("Server error:", error);

    res.status(500).json({
      success: false,
      message:
        NODE_ENV === "production"
          ? "Internal server error"
          : error.message
    });
  }
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("Veylora Backend");
  console.log("====================================");
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Payments: http://localhost:${PORT}/api/payments`);
  console.log("====================================");
});

export default app;