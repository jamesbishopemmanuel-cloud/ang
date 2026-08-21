import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import storyRoutes from "./routes/stories.js";
import channelRoutes from "./routes/channels.js";
import aiRoutes from "./routes/ai.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import adminRoutes from "./routes/admin.js";

const app = express();

app.disable("x-powered-by");

app.use(
  helmet()
);

app.use(
  cors({
    origin:
      config.corsOrigin === "*"
        ? true
        : config.corsOrigin,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "1mb"
  })
);

const limiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });

app.use(limiter);

app.get(
  "/health",
  (_req, res) => {
    res.json({
      status: "ok",
      service: "veylora-backend",
      timestamp:
        new Date().toISOString()
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/stories",
  storyRoutes
);

app.use(
  "/api/channels",
  channelRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(errorHandler);

export default app;