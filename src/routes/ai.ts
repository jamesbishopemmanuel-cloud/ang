import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

router.get(
  "/credits",
  requireAuth,
  async (req: AuthRequest, res) => {
    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user!.id
        },
        select: {
          aiCredits: true,
          plan: true
        }
      });

    res.json(user);
  }
);

router.post(
  "/generate",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parsed = z.object({
      feature: z.string().min(1).max(50),
      prompt: z.string().min(1).max(10000),
      credits: z.number().int().min(1).max(100)
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid AI request"
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user!.id
        }
      });

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    if (
      user.aiCredits <
      parsed.data.credits
    ) {
      return res.status(402).json({
        error: "Insufficient AI credits"
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          aiCredits: {
            decrement:
              parsed.data.credits
          }
        }
      }),

      prisma.aIUsage.create({
        data: {
          userId: user.id,
          feature:
            parsed.data.feature,
          creditsUsed:
            parsed.data.credits
        }
      })
    ]);

    /*
     * IMPORTANT:
     * Call your real AI provider here.
     * Keep the API key on this server.
     */

    res.json({
      success: true,
      feature: parsed.data.feature,
      result: null,
      message:
        "AI request accepted. Connect your server-side AI provider."
    });
  }
);

export default router;