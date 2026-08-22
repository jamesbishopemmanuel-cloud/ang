import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireAdmin
} from "../middleware/auth.js";

const router = Router();

router.get(
  "/stats",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    const [
      users,
      stories,
      channels,
      messages,
      subscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.story.count(),
      prisma.channel.count(),
      prisma.message.count(),
      prisma.subscription.count()
    ]);

    res.json({
      users,
      stories,
      channels,
      messages,
      subscriptions
    });
  }
);

router.get(
  "/users",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    const users =
      await prisma.user.findMany({
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          plan: true,
          aiCredits: true,
          createdAt: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      });

    res.json({
      users
    });
  }
);

export default router;