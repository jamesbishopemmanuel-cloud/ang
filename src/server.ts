import express, {
  Request,
  Response,
  NextFunction
} from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import paystackRouter from "./payments/paystack.js";
import { setupMessaging } from "./messaging/socket.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

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

// Payment system
app.use("/api/payments", paystackRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

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

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  },
  transports: ["websocket", "polling"]
});

setupMessaging(io);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("Veylora Backend");
  console.log("====================================");
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Payments: /api/payments`);
  console.log("Realtime messaging: Socket.IO");
  console.log("====================================");
});

export { app, io };