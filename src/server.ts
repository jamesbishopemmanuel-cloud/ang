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
import { setupWebRTC } from "./calls/webrtc.js";


dotenv.config();


const app = express();

const PORT = Number(process.env.PORT || 3000);

const NODE_ENV =
  process.env.NODE_ENV || "development";


// ================================
// Middleware
// ================================

app.use(
  helmet()
);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);


app.use(
  express.json({
    limit: "5mb"
  })
);


app.use(
  express.urlencoded({
    extended: true
  })
);


// ================================
// Health Check
// ================================

app.get(
  "/",
  (_req: Request, res: Response) => {

    res.json({
      app: "Veylora",
      status: "online",
      service: "Backend API",
      environment: NODE_ENV
    });

  }
);


app.get(
  "/health",
  (_req: Request, res: Response) => {

    res.status(200).json({

      success: true,

      service:
        "Veylora Backend",

      realtime:
        "Socket.IO Online",

      timestamp:
        new Date().toISOString()

    });

  }
);


// ================================
// Payment API
// ================================

app.use(
  "/api/payments",
  paystackRouter
);


// ================================
// HTTP + Socket.IO Server
// ================================

const httpServer =
  http.createServer(app);



const io =
  new Server(httpServer, {

    cors: {

      origin: true,

      credentials: true

    },

    transports:[
      "websocket",
      "polling"
    ]

  });



// ================================
// Realtime Services
// ================================


// Chat messages
setupMessaging(io);


// Voice & Video calls
setupWebRTC(io);



// ================================
// 404 Handler
// ================================

app.use(
  (
    _req: Request,
    res: Response
  ) => {

    res.status(404).json({

      success:false,

      message:
        "Route not found"

    });

  }
);



// ================================
// Error Handler
// ================================

app.use(

  (
    error: Error,

    _req: Request,

    res: Response,

    _next: NextFunction

  ) => {


    console.error(
      "SERVER ERROR:",
      error
    );


    res.status(500).json({

      success:false,

      message:
        NODE_ENV === "production"
        ? "Internal server error"
        : error.message

    });


  }

);



// ================================
// Start Server
// ================================

httpServer.listen(
  PORT,
  "0.0.0.0",
  () => {


    console.log(
      "================================="
    );

    console.log(
      "Veylora Backend Running"
    );

    console.log(
      "================================="
    );


    console.log(
      `Environment: ${NODE_ENV}`
    );


    console.log(
      `Port: ${PORT}`
    );


    console.log(
      "Payments: ACTIVE"
    );


    console.log(
      "Messaging: ACTIVE"
    );


    console.log(
      "Voice/Video Calls: ACTIVE"
    );


    console.log(
      "================================="
    );


  }
);


export {
  app,
  io
};