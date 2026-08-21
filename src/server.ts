import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";

import { env } from "./config/env.js";
import { setupMessaging } from "./messaging/socket.js";
import { setupWebRTC } from "./calls/webrtc.js";
import paystackRouter from "./payments/paystack.js";


const app = express();

const httpServer =
  http.createServer(app);


const io =
  new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true
    }
  });


app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());


app.get(
  "/health",
  (_req, res) => {
    res.json({
      success: true,
      service: "Veylora API",
      environment: env.NODE_ENV
    });
  }
);


app.use(
  "/api/payments",
  paystackRouter
);


setupMessaging(io);

setupWebRTC(io);


app.use(
  (_req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }
);


httpServer.listen(
  env.PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Veylora API running on port ${env.PORT}`
    );
  }
);