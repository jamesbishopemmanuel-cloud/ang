import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const token = header.substring(7);

    const payload = jwt.verify(
      token,
      config.jwtSecret
    ) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: "User no longer exists"
      });
    }

    req.user = user;

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (
    req.user?.role !== "ADMIN" &&
    req.user?.role !== "SUPER_ADMIN"
  ) {
    return res.status(403).json({
      error: "Administrator access required"
    });
  }

  next();
}