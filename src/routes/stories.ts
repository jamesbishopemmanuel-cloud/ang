import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  const stories =
    await prisma.story.findMany({
      where: {
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
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
    stories
  });
});

router.post(
  "/",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parsed = z.object({
      text: z.string().min(1).max(1000),
      mediaUrl: z.string().url().optional()
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid story"
      });
    }

    const story =
      await prisma.story.create({
        data: {
          userId: req.user!.id,
          text: parsed.data.text,
          mediaUrl: parsed.data.mediaUrl,
          expiresAt:
            new Date(
              Date.now() +
              24 * 60 * 60 * 1000
            )
        }
      });

    res.status(201).json({
      story
    });
  }
);

router.delete(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res) => {
    const story =
      await prisma.story.findUnique({
        where: {
          id: req.params.id
        }
      });

    if (!story) {
      return res.status(404).json({
        error: "Story not found"
      });
    }

    if (story.userId !== req.user!.id) {
      return res.status(403).json({
        error: "Not your story"
      });
    }

    await prisma.story.delete({
      where: {
        id: story.id
      }
    });

    res.status(204).send();
  }
);

export default router;