import { Router } from "express";

import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

import { prisma } from "../lib/prisma.js";

const router = Router();

router.get(
  "/me",
  requireAuth,
  async (req: AuthRequest, res) => {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user!.id
        },
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          plan: true,
          aiCredits: true,
          createdAt: true
        }
      });

    res.json({
      user
    });
  }
);

export default router;