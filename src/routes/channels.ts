import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const channels =
    await prisma.channel.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

  res.json({
    channels
  });
});

router.post(
  "/",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parsed = z.object({
      name: z.string().min(2).max(80),
      description:
        z.string().max(500).optional()
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid channel"
      });
    }

    const channel =
      await prisma.channel.create({
        data: {
          ownerId: req.user!.id,
          name: parsed.data.name,
          description:
            parsed.data.description
        }
      });

    res.status(201).json({
      channel
    });
  }
);

export default router;