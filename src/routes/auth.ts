import {
  Router
} from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "node:crypto";

import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";

const router = Router();

const phoneSchema = z.object({
  phone: z.string().min(7).max(30)
});

router.post("/register", async (req, res) => {
  const parsed = z.object({
    phone: z.string().min(7).max(30),
    name: z.string().min(2).max(80),
    password: z.string().min(8).optional()
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid registration data"
    });
  }

  const {
    phone,
    name,
    password
  } = parsed.data;

  const existing =
    await prisma.user.findUnique({
      where: { phone }
    });

  if (existing) {
    return res.status(409).json({
      error: "Phone number already registered"
    });
  }

  const passwordHash =
    password
      ? await bcrypt.hash(password, 12)
      : null;

  const user = await prisma.user.create({
    data: {
      phone,
      name,
      passwordHash
    }
  });

  const token = jwt.sign(
    {
      userId: user.id
    },
    config.jwtSecret,
    {
      expiresIn:
        config.jwtExpiresIn as jwt.SignOptions["expiresIn"]
    }
  );

  return res.status(201).json({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      plan: user.plan,
      aiCredits: user.aiCredits
    },
    token
  });
});

router.post("/request-otp", async (req, res) => {
  const parsed =
    phoneSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid phone number"
    });
  }

  const code =
    crypto.randomInt(100000, 1000000)
      .toString();

  const codeHash =
    await bcrypt.hash(code, 12);

  await prisma.otp.create({
    data: {
      phone: parsed.data.phone,
      codeHash,
      expiresAt:
        new Date(Date.now() + 5 * 60 * 1000)
    }
  });

  /*
   * IMPORTANT:
   * Send `code` through your SMS or WhatsApp
   * provider here.
   *
   * Never return the OTP in production.
   */

  return res.json({
    success: true,
    message:
      "OTP requested successfully"
  });
});

router.post("/verify-otp", async (req, res) => {
  const parsed = z.object({
    phone: z.string().min(7).max(30),
    code: z.string().length(6)
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid OTP request"
    });
  }

  const otp =
    await prisma.otp.findFirst({
      where: {
        phone: parsed.data.phone,
        consumedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

  if (!otp) {
    return res.status(400).json({
      error: "OTP expired or unavailable"
    });
  }

  if (otp.attempts >= 5) {
    return res.status(429).json({
      error: "Too many attempts"
    });
  }

  const valid =
    await bcrypt.compare(
      parsed.data.code,
      otp.codeHash
    );

  if (!valid) {
    await prisma.otp.update({
      where: {
        id: otp.id
      },
      data: {
        attempts: {
          increment: 1
        }
      }
    });

    return res.status(400).json({
      error: "Invalid OTP"
    });
  }

  await prisma.otp.update({
    where: {
      id: otp.id
    },
    data: {
      consumedAt: new Date()
    }
  });

  let user =
    await prisma.user.findUnique({
      where: {
        phone: parsed.data.phone
      }
    });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: parsed.data.phone,
        name: "Veylora User"
      }
    });
  }

  const token = jwt.sign(
    {
      userId: user.id
    },
    config.jwtSecret,
    {
      expiresIn:
        config.jwtExpiresIn as jwt.SignOptions["expiresIn"]
    }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      plan: user.plan,
      aiCredits: user.aiCredits
    }
  });
});

export default router;