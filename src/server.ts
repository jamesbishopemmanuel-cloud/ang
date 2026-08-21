import "dotenv/config";

import express, {
  Request,
  Response,
  NextFunction
} from "express";

import http from "http";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Server as SocketIOServer } from "socket.io";

/*
|--------------------------------------------------------------------------
| App
|--------------------------------------------------------------------------
*/

const app = express();
const httpServer = http.createServer(app);

const PORT = Number(process.env.PORT || 8080);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "CHANGE_THIS_IN_PRODUCTION";

const CLIENT_URL =
  process.env.CLIENT_URL || "*";

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY || "";

const AI_API_URL =
  process.env.AI_API_URL || "";

const AI_API_KEY =
  process.env.AI_API_KEY || "";

const TURN_URL =
  process.env.TURN_URL || "";

const TURN_USERNAME =
  process.env.TURN_USERNAME || "";

const TURN_CREDENTIAL =
  process.env.TURN_CREDENTIAL || "";

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin:
      CLIENT_URL === "*"
        ? true
        : CLIENT_URL,
    credentials: true
  })
);

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface User {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
  verified: boolean;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

interface AuthUser {
  id: string;
  phone: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

/*
|--------------------------------------------------------------------------
| Temporary storage
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This is suitable for testing only.
|
| For production, move users, messages,
| OTPs and subscriptions to PostgreSQL/Prisma.
|
|--------------------------------------------------------------------------
*/

const users =
  new Map<string, User>();

const usersByPhone =
  new Map<string, string>();

const messages: ChatMessage[] = [];

const otpStore =
  new Map<
    string,
    {
      codeHash: string;
      expiresAt: number;
      attempts: number;
    }
  >();

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function createId(
  prefix: string
): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizePhone(
  phone: string
): string {
  return phone
    .trim()
    .replace(/[^\d+]/g, "");
}

function hashOtp(
  code: string
): string {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

function signToken(
  user: User
): string {
  return jwt.sign(
    {
      sub: user.id,
      phone: user.phone
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

/*
|--------------------------------------------------------------------------
| Authentication middleware
|--------------------------------------------------------------------------
*/

function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header =
    req.headers.authorization;

  if (
    !header ||
    !header.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      error:
        "Authentication required"
    });
  }

  const token =
    header.substring(7);

  try {
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      ) as jwt.JwtPayload;

    if (
      typeof decoded.sub !==
        "string" ||
      typeof decoded.phone !==
        "string"
    ) {
      return res.status(401).json({
        error:
          "Invalid authentication token"
      });
    }

    req.user = {
      id: decoded.sub,
      phone: decoded.phone
    };

    next();
  } catch {
    return res.status(401).json({
      error:
        "Invalid or expired token"
    });
  }
}

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (_req: Request, res: Response) => {
    res.json({
      name: "Veylora API",
      status: "online",
      version: "14.0.0"
    });
  }
);

app.get(
  "/health",
  (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "veylora-backend",
      realtime: true,
      time:
        new Date().toISOString()
    });
  }
);

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/register",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        name,
        phone,
        password
      } = req.body;

      if (
        typeof name !== "string" ||
        typeof phone !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          error:
            "name, phone and password are required"
        });
      }

      if (
        name.trim().length < 2
      ) {
        return res.status(400).json({
          error:
            "Name is too short"
        });
      }

      if (
        password.length < 8
      ) {
        return res.status(400).json({
          error:
            "Password must contain at least 8 characters"
        });
      }

      const normalizedPhone =
        normalizePhone(phone);

      if (!normalizedPhone) {
        return res.status(400).json({
          error:
            "Invalid phone number"
        });
      }

      if (
        usersByPhone.has(
          normalizedPhone
        )
      ) {
        return res.status(409).json({
          error:
            "Account already exists"
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user: User = {
        id: createId("usr"),
        name: name.trim(),
        phone:
          normalizedPhone,
        passwordHash,
        createdAt:
          new Date().toISOString(),
        verified: false
      };

      users.set(
        user.id,
        user
      );

      usersByPhone.set(
        normalizedPhone,
        user.id
      );

      const token =
        signToken(user);

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          verified:
            user.verified
        },
        token
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      return res.status(500).json({
        error:
          "Registration failed"
      });
    }
  }
);

app.post(
  "/api/auth/login",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const phone =
        normalizePhone(
          String(
            req.body?.phone || ""
          )
        );

      const password =
        String(
          req.body?.password || ""
        );

      const userId =
        usersByPhone.get(phone);

      if (!userId) {
        return res.status(401).json({
          error:
            "Invalid phone number or password"
        });
      }

      const user =
        users.get(userId);

      if (!user) {
        return res.status(401).json({
          error:
            "Account not found"
        });
      }

      const valid =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!valid) {
        return res.status(401).json({
          error:
            "Invalid phone number or password"
        });
      }

      const token =
        signToken(user);

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          verified:
            user.verified
        },
        token
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        error:
          "Login failed"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/request-otp",
  async (
    req: Request,
    res: Response
  ) => {
    const phone =
      normalizePhone(
        String(
          req.body?.phone || ""
        )
      );

    if (!phone) {
      return res.status(400).json({
        error:
          "Valid phone number required"
      });
    }

    const code =
      crypto.randomInt(
        100000,
        1000000
      ).toString();

    otpStore.set(phone, {
      codeHash:
        hashOtp(code),
      expiresAt:
        Date.now() +
        5 * 60 * 1000,
      attempts: 0
    });

    /*
     * DEVELOPMENT ONLY.
     *
     * In production, send the code through
     * your SMS/WhatsApp provider.
     */
    console.log(
      `[OTP DEVELOPMENT ONLY] ${phone}: ${code}`
    );

    return res.json({
      success: true,
      message:
        "OTP requested successfully"
    });
  }
);

app.post(
  "/api/auth/verify-otp",
  (
    req: Request,
    res: Response
  ) => {
    const phone =
      normalizePhone(
        String(
          req.body?.phone || ""
        )
      );

    const code =
      String(
        req.body?.code || ""
      );

    const record =
      otpStore.get(phone);

    if (!record) {
      return res.status(400).json({
        error:
          "OTP not found or expired"
      });
    }

    if (
      Date.now() >
      record.expiresAt
    ) {
      otpStore.delete(phone);

      return res.status(400).json({
        error:
          "OTP expired"
      });
    }

    record.attempts++;

    if (
      record.attempts > 5
    ) {
      otpStore.delete(phone);

      return res.status(429).json({
        error:
          "Too many OTP attempts"
      });
    }

    if (
      hashOtp(code) !==
      record.codeHash
    ) {
      return res.status(400).json({
        error:
          "Invalid OTP"
      });
    }

    otpStore.delete(phone);

    const userId =
      usersByPhone.get(phone);

    if (userId) {
      const user =
        users.get(userId);

      if (user) {
        user.verified = true;
      }
    }

    return res.json({
      success: true,
      verified: true
    });
  }
);

app.get(
  "/api/auth/me",
  authenticate,
  (
    req: AuthRequest,
    res: Response
  ) => {
    const user =
      users.get(
        req.user!.id
      );

    if (!user) {
      return res.status(404).json({
        error:
          "User not found"
      });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        verified:
          user.verified,
        createdAt:
          user.createdAt
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| Messages REST API
|--------------------------------------------------------------------------
*/

app.get(
  "/api/messages/:conversationId",
  authenticate,
  (
    req: AuthRequest,
    res: Response
  ) => {
    const conversationId =
      req.params
        .conversationId;

    const result =
      messages.filter(
        message =>
          message.conversationId ===
          conversationId
      );

    return res.json({
      messages: result
    });
  }
);

app.post(
  "/api/messages",
  authenticate,
  (
    req: AuthRequest,
    res: Response
  ) => {
    const {
      conversationId,
      text
    } = req.body;

    if (
      typeof conversationId !==
        "string" ||
      typeof text !==
        "string"
    ) {
      return res.status(400).json({
        error:
          "conversationId and text are required"
      });
    }

    const cleanText =
      text.trim();

    if (!cleanText) {
      return res.status(400).json({
        error:
          "Message cannot be empty"
      });
    }

    const message:
      ChatMessage = {
      id: createId("msg"),
      conversationId,
      senderId:
        req.user!.id,
      text: cleanText,
      createdAt:
        new Date().toISOString()
    };

    messages.push(message);

    io.to(
      `conversation:${conversationId}`
    ).emit(
      "message:new",
      message
    );

    return res.status(201).json({
      message
    });
  }
);

/*
|--------------------------------------------------------------------------
| WebRTC ICE servers
|--------------------------------------------------------------------------
*/

app.get(
  "/api/calls/ice-servers",
  authenticate,
  (
    _req: AuthRequest,
    res: Response
  ) => {
    const iceServers: Array<{
      urls: string;
      username?: string;
      credential?: string;
    }> = [
      {
        urls:
          "stun:stun.l.google.com:19302"
      }
    ];

    if (
      TURN_URL &&
      TURN_USERNAME &&
      TURN_CREDENTIAL
    ) {
      iceServers.push({
        urls: TURN_URL,
        username:
          TURN_USERNAME,
        credential:
          TURN_CREDENTIAL
      });
    }

    return res.json({
      iceServers
    });
  }
);

/*
|--------------------------------------------------------------------------
| Paystack
|--------------------------------------------------------------------------
*/

app.post(
  "/api/payments/paystack/initialize",
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    if (
      !PAYSTACK_SECRET_KEY
    ) {
      return res.status(503).json({
        error:
          "Paystack is not configured"
      });
    }

    try {
      const {
        email,
        amount,
        plan
      } = req.body;

      if (
        typeof email !==
          "string" ||
        typeof amount !==
          "number"
      ) {
        return res.status(400).json({
          error:
            "email and amount are required"
        });
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Invalid amount"
        });
      }

      const reference =
        `vey_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;

      const response =
        await fetch(
          "https://api.paystack.co/transaction/initialize",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                email,
                amount:
                  Math.round(
                    amount
                  ),
                reference,
                metadata: {
                  userId:
                    req.user!.id,
                  plan:
                    typeof plan ===
                    "string"
                      ? plan
                      : null
                }
              })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.status
      ) {
        console.error(
          "Paystack error:",
          data
        );

        return res.status(502).json({
          error:
            "Could not initialize payment"
        });
      }

      return res.json({
        authorization_url:
          data.data
            .authorization_url,
        access_code:
          data.data
            .access_code,
        reference:
          data.data.reference
      });
    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      return res.status(500).json({
        error:
          "Payment initialization failed"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

app.post(
  "/api/ai/generate",
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    if (
      !AI_API_URL ||
      !AI_API_KEY
    ) {
      return res.status(503).json({
        error:
          "AI provider is not configured"
      });
    }

    const prompt =
      String(
        req.body?.prompt || ""
      ).trim();

    const type =
      typeof req.body?.type ===
      "string"
        ? req.body.type
        : "chat";

    if (!prompt) {
      return res.status(400).json({
        error:
          "Prompt is required"
      });
    }

    try {
      const response =
        await fetch(
          AI_API_URL,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${AI_API_KEY}`,
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify({
                prompt,
                type
              })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        return res.status(502).json({
          error:
            "AI provider request failed"
        });
      }

      return res.json({
        success: true,
        result: data
      });
    } catch (error) {
      console.error(
        "AI error:",
        error
      );

      return res.status(500).json({
        error:
          "AI generation failed"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

const io =
  new SocketIOServer(
    httpServer,
    {
      cors: {
        origin:
          CLIENT_URL === "*"
            ? true
            : CLIENT_URL,
        credentials: true
      }
    }
  );

/*
|--------------------------------------------------------------------------
| Socket authentication
|--------------------------------------------------------------------------
*/

io.use(
  (
    socket,
    next
  ) => {
    try {
      const token =
        socket.handshake
          .auth?.token;

      if (
        typeof token !==
        "string"
      ) {
        return next(
          new Error(
            "Authentication required"
          )
        );
      }

      const decoded =
        jwt.verify(
          token,
          JWT_SECRET
        ) as jwt.JwtPayload;

      if (
        typeof decoded.sub !==
          "string" ||
        typeof decoded.phone !==
          "string"
      ) {
        return next(
          new Error(
            "Invalid authentication token"
          )
        );
      }

      socket.data.user = {
        id: decoded.sub,
        phone: decoded.phone
      };

      next();
    } catch {
      next(
        new Error(
          "Invalid authentication token"
        )
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| Socket events
|--------------------------------------------------------------------------
*/

io.on(
  "connection",
  socket => {
    const user =
      socket.data.user as AuthUser;

    console.log(
      `Socket connected: ${user.id}`
    );

    /*
     * Personal room
     */

    socket.join(
      `user:${user.id}`
    );

    /*
     * User online
     */

    io.emit(
      "presence:online",
      {
        userId: user.id
      }
    );

    /*
     * Join conversation
     */

    socket.on(
      "conversation:join",
      (
        conversationId: string
      ) => {
        if (
          typeof conversationId !==
          "string" ||
          !conversationId
        ) {
          return;
        }

        socket.join(
          `conversation:${conversationId}`
        );
      }
    );

    /*
     * Leave conversation
     */

    socket.on(
      "conversation:leave",
      (
        conversationId: string
      ) => {
        if (
          typeof conversationId !==
          "string"
        ) {
          return;
        }

        socket.leave(
          `conversation:${conversationId}`
        );
      }
    );

    /*
     * Send real-time message
     */

    socket.on(
      "message:send",
      (
        payload: {
          conversationId?: string;
          text?: string;
        }
      ) => {
        const conversationId =
          payload?.conversationId;

        const text =
          payload?.text?.trim();

        if (
          typeof conversationId !==
            "string" ||
          typeof text !==
            "string" ||
          !text
        ) {
          socket.emit(
            "message:error",
            {
              error:
                "Invalid message"
            }
          );

          return;
        }

        if (
          text.length > 5000
        ) {
          socket.emit(
            "message:error",
            {
              error:
                "Message is too long"
            }
          );

          return;
        }

        const message:
          ChatMessage = {
          id: createId("msg"),
          conversationId,
          senderId:
            user.id,
          text,
          createdAt:
            new Date().toISOString()
        };

        messages.push(
          message
        );

        io.to(
          `conversation:${conversationId}`
        ).emit(
          "message:new",
          message
        );
      }
    );

    /*
     * Typing started
     */

    socket.on(
      "typing:start",
      (
        conversationId: string
      ) => {
        if (
          typeof conversationId !==
          "string"
        ) {
          return;
        }

        socket
          .to(
            `conversation:${conversationId}`
          )
          .emit(
            "typing:start",
            {
              conversationId,
              userId:
                user.id
            }
          );
      }
    );

    /*
     * Typing stopped
     */

    socket.on(
      "typing:stop",
      (
        conversationId: string
      ) => {
        if (
          typeof conversationId !==
          "string"
        ) {
          return;
        }

        socket
          .to(
            `conversation:${conversationId}`
          )
          .emit(
            "typing:stop",
            {
              conversationId,
              userId:
                user.id
            }
          );
      }
    );

    /*
     * WebRTC call invitation
     */

    socket.on(
      "call:invite",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
          type?: "voice" | "video";
          conversationId?: string;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string" ||
          (
            payload.type !==
              "voice" &&
            payload.type !==
              "video"
          )
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "call:incoming",
          {
            callId:
              payload.callId,
            callerId:
              user.id,
            type:
              payload.type,
            conversationId:
              payload.conversationId ||
              null
          }
        );
      }
    );

    /*
     * Accept call
     */

    socket.on(
      "call:accept",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string"
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "call:accepted",
          {
            callId:
              payload.callId,
            userId:
              user.id
          }
        );
      }
    );

    /*
     * Reject call
     */

    socket.on(
      "call:reject",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string"
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "call:rejected",
          {
            callId:
              payload.callId,
            userId:
              user.id
          }
        );
      }
    );

    /*
     * End call
     */

    socket.on(
      "call:end",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string"
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "call:ended",
          {
            callId:
              payload.callId,
            userId:
              user.id
          }
        );
      }
    );

    /*
     * WebRTC offer
     */

    socket.on(
      "webrtc:offer",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
          offer?: unknown;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string" ||
          !payload.offer
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "webrtc:offer",
          {
            callId:
              payload.callId,
            senderId:
              user.id,
            offer:
              payload.offer
          }
        );
      }
    );

    /*
     * WebRTC answer
     */

    socket.on(
      "webrtc:answer",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
          answer?: unknown;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string" ||
          !payload.answer
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "webrtc:answer",
          {
            callId:
              payload.callId,
            senderId:
              user.id,
            answer:
              payload.answer
          }
        );
      }
    );

    /*
     * WebRTC ICE candidate
     */

    socket.on(
      "webrtc:ice-candidate",
      (
        payload: {
          targetUserId?: string;
          callId?: string;
          candidate?: unknown;
        }
      ) => {
        if (
          typeof payload?.targetUserId !==
            "string" ||
          typeof payload?.callId !==
            "string" ||
          !payload.candidate
        ) {
          return;
        }

        io.to(
          `user:${payload.targetUserId}`
        ).emit(
          "webrtc:ice-candidate",
          {
            callId:
              payload.callId,
            senderId:
              user.id,
            candidate:
              payload.candidate
          }
        );
      }
    );

    /*
     * Disconnect
     */

    socket.on(
      "disconnect",
      reason => {
        console.log(
          `Socket disconnected: ${user.id} (${reason})`
        );

        io.emit(
          "presence:offline",
          {
            userId:
              user.id
          }
        );
      }
    );
  }
);

/*
|--------------------------------------------------------------------------
| Error handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      "Unhandled server error:",
      err
    );

    res.status(500).json({
      error:
        "Internal server error"
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

httpServer.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Veylora backend running on port ${PORT}`
    );

    console.log(
      `Health: http://localhost:${PORT}/health`
    );

    console.log(
      `Socket.IO: enabled`
    );

    console.log(
      `WebRTC signaling: enabled`
    );

    console.log(
      `TURN: ${
        TURN_URL
          ? "configured"
          : "not configured"
      }`
    );

    console.log(
      `Paystack: ${
        PAYSTACK_SECRET_KEY
          ? "configured"
          : "not configured"
      }`
    );

    console.log(
      `AI: ${
        AI_API_URL
          ? "configured"
          : "not configured"
      }`
    );
  }
);

/*
|--------------------------------------------------------------------------
| Graceful shutdown
|--------------------------------------------------------------------------
*/

function shutdown(
  signal: string
) {
  console.log(
    `${signal} received. Shutting down...`
  );

  io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);