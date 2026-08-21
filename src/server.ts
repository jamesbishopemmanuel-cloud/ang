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
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
const httpServer = http.createServer(app);

const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_IN_PRODUCTION";

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
| Security / middleware
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
    origin: CLIENT_URL === "*" ? true : CLIENT_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

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
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
  };
}

/*
|--------------------------------------------------------------------------
| Temporary in-memory storage
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Replace these Maps with PostgreSQL/Prisma before production.
|
*/

const users = new Map<string, User>();
const usersByPhone = new Map<string, string>();

const conversations = new Map<
  string,
  Set<string>
>();

const messages: ChatMessage[] = [];

const otpStore = new Map<
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

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function signToken(user: User): string {
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

function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  const token = header.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as jwt.JwtPayload;

    if (
      typeof decoded.sub !== "string" ||
      typeof decoded.phone !== "string"
    ) {
      return res.status(401).json({
        error: "Invalid authentication token"
      });
    }

    req.user = {
      id: decoded.sub,
      phone: decoded.phone
    };

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

function hashOtp(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
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
      version: "1.0.0"
    });
  }
);

app.get(
  "/health",
  (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "veylora-backend",
      time: new Date().toISOString()
    });
  }
);

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

/*
 * Register with phone number and password.
 *
 * For real production phone verification, call
 * /api/auth/request-otp first and verify the OTP.
 */

app.post(
  "/api/auth/register",
  async (req: Request, res: Response) => {
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
          error: "name, phone and password are required"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error:
            "Password must contain at least 8 characters"
        });
      }

      const normalizedPhone =
        normalizePhone(phone);

      if (!normalizedPhone) {
        return res.status(400).json({
          error: "Invalid phone number"
        });
      }

      if (usersByPhone.has(normalizedPhone)) {
        return res.status(409).json({
          error: "Account already exists"
        });
      }

      const passwordHash =
        await bcrypt.hash(password, 12);

      const user: User = {
        id: createId("usr"),
        name: name.trim(),
        phone: normalizedPhone,
        passwordHash,
        createdAt:
          new Date().toISOString()
      };

      users.set(user.id, user);
      usersByPhone.set(
        normalizedPhone,
        user.id
      );

      const token = signToken(user);

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone
        },
        token
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Registration failed"
      });
    }
  }
);

app.post(
  "/api/auth/login",
  async (req: Request, res: Response) => {
    try {
      const {
        phone,
        password
      } = req.body;

      const normalizedPhone =
        normalizePhone(String(phone || ""));

      const userId =
        usersByPhone.get(normalizedPhone);

      if (!userId) {
        return res.status(401).json({
          error: "Invalid phone number or password"
        });
      }

      const user = users.get(userId);

      if (!user) {
        return res.status(401).json({
          error: "Account not found"
        });
      }

      const valid =
        await bcrypt.compare(
          String(password || ""),
          user.passwordHash
        );

      if (!valid) {
        return res.status(401).json({
          error: "Invalid phone number or password"
        });
      }

      const token = signToken(user);

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone
        },
        token
      });
    } catch {
      return res.status(500).json({
        error: "Login failed"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
|
| This generates the OTP and stores only a hash.
|
| To send it by SMS/WhatsApp, connect a real provider
| such as your chosen SMS/WhatsApp service.
|
*/

app.post(
  "/api/auth/request-otp",
  async (req: Request, res: Response) => {
    const phone =
      normalizePhone(
        String(req.body?.phone || "")
      );

    if (!phone) {
      return res.status(400).json({
        error: "Valid phone number required"
      });
    }

    const code =
      crypto.randomInt(
        100000,
        1000000
      ).toString();

    otpStore.set(phone, {
      codeHash: hashOtp(code),
      expiresAt:
        Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    /*
     * DO NOT return the OTP in production.
     *
     * Connect your SMS/WhatsApp provider here.
     */

    console.log(
      `[OTP] ${phone}: ${code}`
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
  (req: Request, res: Response) => {
    const phone =
      normalizePhone(
        String(req.body?.phone || "")
      );

    const code =
      String(req.body?.code || "");

    const record =
      otpStore.get(phone);

    if (!record) {
      return res.status(400).json({
        error: "OTP not found or expired"
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(phone);

      return res.status(400).json({
        error: "OTP expired"
      });
    }

    record.attempts += 1;

    if (record.attempts > 5) {
      otpStore.delete(phone);

      return res.status(429).json({
        error: "Too many OTP attempts"
      });
    }

    if (
      hashOtp(code) !==
      record.codeHash
    ) {
      return res.status(400).json({
        error: "Invalid OTP"
      });
    }

    otpStore.delete(phone);

    return res.json({
      success: true,
      verified: true
    });
  }
);

app.get(
  "/api/auth/me",
  authenticate,
  (req: AuthRequest, res: Response) => {
    const user = users.get(
      req.user!.id
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| Messaging
|--------------------------------------------------------------------------
*/

app.post(
  "/api/messages",
  authenticate,
  (req: AuthRequest, res: Response) => {
    const {
      conversationId,
      text
    } = req.body;

    if (
      typeof conversationId !== "string" ||
      typeof text !== "string"
    ) {
      return res.status(400).json({
        error:
          "conversationId and text are required"
      });
    }

    const cleanText = text.trim();

    if (!cleanText) {
      return res.status(400).json({
        error: "Message cannot be empty"
      });
    }

    const message: ChatMessage = {
      id: createId("msg"),
      conversationId,
      senderId: req.user!.id,
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

app.get(
  "/api/messages/:conversationId",
  authenticate,
  (req: AuthRequest, res: Response) => {
    const result =
      messages.filter(
        message =>
          message.conversationId ===
          req.params.conversationId
      );

    return res.json({
      messages: result
    });
  }
);

/*
|--------------------------------------------------------------------------
| WebRTC configuration
|--------------------------------------------------------------------------
*/

app.get(
  "/api/calls/ice-servers",
  authenticate,
  (_req: AuthRequest, res: Response) => {
    const iceServers: Array<{
      urls: string;
      username?: string;
      credential?: string;
    }> = [
      {
        urls: "stun:stun.l.google.com:19302"
      }
    ];

    if (
      TURN_URL &&
      TURN_USERNAME &&
      TURN_CREDENTIAL
    ) {
      iceServers.push({
        urls: TURN_URL,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL
      });
    }

    return res.json({
      iceServers
    });
  }
);

/*
|--------------------------------------------------------------------------
| Payment - Paystack
|--------------------------------------------------------------------------
|
| The secret key stays on the backend.
|
*/

app.post(
  "/api/payments/paystack/initialize",
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        error:
          "Paystack is not configured on the server"
      });
    }

    try {
      const {
        email,
        amount,
        plan
      } = req.body;

      if (
        typeof email !== "string" ||
        typeof amount !== "number"
      ) {
        return res.status(400).json({
          error:
            "email and amount are required"
        });
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error: "Invalid amount"
        });
      }

      const reference =
        `vey_${Date.now()}_${crypto
          .randomBytes(5)
          .toString("hex")}`;

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
            body: JSON.stringify({
              email,
              amount:
                Math.round(amount),
              reference,
              metadata: {
                userId:
                  req.user!.id,
                plan:
                  typeof plan === "string"
                    ? plan
                    : null
              }
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.status) {
        console.error(
          "Paystack initialize error:",
          data
        );

        return res.status(502).json({
          error:
            "Could not create payment session"
        });
      }

      return res.json({
        authorization_url:
          data.data.authorization_url,
        access_code:
          data.data.access_code,
        reference:
          data.data.reference
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          "Payment initialization failed"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Paystack webhook
|--------------------------------------------------------------------------
*/

app.post(
  "/api/payments/paystack/webhook",
  express.raw({
    type: "application/json"
  }),
  (req: Request, res: Response) => {
    if (!PAYSTACK_SECRET_KEY) {
      return res.sendStatus(503);
    }

    const signature =
      req.headers[
        "x-paystack-signature"
      ];

    if (
      typeof signature !== "string"
    ) {
      return res.sendStatus(401);
    }

    const hash =
      crypto
        .createHmac(
          "sha512",
          PAYSTACK_SECRET_KEY
        )
        .update(req.body)
        .digest("hex");

    if (hash !== signature) {
      return res.sendStatus(401);
    }

    try {
      const event =
        JSON.parse(
          req.body.toString()
        );

      console.log(
        "Paystack webhook:",
        event.event
      );

      /*
       * IMPORTANT:
       * Update the user's subscription/payment
       * entitlement in your database here.
       */

      return res.sendStatus(200);
    } catch {
      return res.sendStatus(400);
    }
  }
);

/*
|--------------------------------------------------------------------------
| AI proxy
|--------------------------------------------------------------------------
|
| The Android app calls this endpoint.
| Your private AI key remains on the server.
|
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

    const {
      prompt,
      type
    } = req.body;

    if (
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    try {
      /*
       * This is intentionally a generic proxy.
       * Adapt the request body to your chosen
       * AI provider's API.
       */

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
            body: JSON.stringify({
              prompt:
                prompt.trim(),
              type:
                typeof type === "string"
                  ? type
                  : "chat"
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
      console.error(error);

      return res.status(500).json({
        error:
          "AI generation failed"
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Socket.IO - real-time messaging + WebRTC signaling
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

io.use(
  (socket, next) => {
    try {
      const token =
        socket.handshake.auth
          ?.token;

      if (
        typeof token !== "string"
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

io.on(
  "connection",
  socket => {
    const userId =
      socket.data.user.id;

    console.log(
      `Socket connected: ${userId}`
    );

    socket.join(
      `user:${userId}`
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
          "string"
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
        socket.leave(
          `conversation:${conversationId}`
        );
      }
    );

    /*
     * Real-time message
     */

    socket.on(
      "message:send",
      (payload: {
        conversationId: string;
        text: string;
      }) => {
        if (
          !payload ||
          typeof payload.conversationId !==
            "string" ||
          typeof payload.text !==
            "string"
        ) {
          return;
        }

        const text =
          payload.text.trim();

        if (!text) return;

        const message: ChatMessage = {
          id: createId("msg"),
          conversationId:
            payload.conversationId,
          senderId: userId,
          text,
          createdAt:
            new Date().toISOString()
        };

        messages.push(message);

        io.to(
          `conversation:${payload.conversationId}`
        ).emit(
          "message:new",
          message
        );
      }
    );

    /*
     * WebRTC call invitation
     */

    socket.on(
      "call:invite",
      (payload: {
        targetUserId: string;
        callId: string;
        type: "voice" | "video";
      }) => {
        if (
          !payload?.