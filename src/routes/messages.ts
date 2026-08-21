import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

router.get(
  "/:userId",
  requireAuth,
  async (req: AuthRequest, res) => {
    const messages =
      await prisma.message.findMany({
        where: {
          OR: [
            {
              senderId: req.user!.id,
              recipientId: req.params.userId
            },
            {
              senderId: req.params.userId,
              recipientId: req.user!.id
            }
          ]
        },
        orderBy: {
          createdAt: "asc"
        }
      });

    res.json({
      messages
    });
  }
);

router.post(
  "/",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parsed = z.object({
      recipientId: z.string().min(1),
      body: z.string().min(1).max(10000)
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid message"
      });
    }

    const recipient =
      await prisma.user.findUnique({
        where: {
          id: parsed.data.recipientId
        }
      });

    if (!recipient) {
      return res.status(404).json({
        error: "Recipient not found"
      });
    }

    const message =
      await prisma.message.create({
        data: {
          senderId: req.user!.id,
          recipientId:
            parsed.data.recipientId,
          body: parsed.data.body
        }
      });

    res.status(201).json({
      message
    });
  }
);

export default router;