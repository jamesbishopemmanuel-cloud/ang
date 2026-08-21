import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest
} from "../middleware/auth.js";

const router = Router();

router.get(
  "/me",
  requireAuth,
  async (req: AuthRequest, res) => {
    const subscriptions =
      await prisma.subscription.findMany({
        where: {
          userId: req.user!.id
        },
        orderBy: {
          createdAt: "desc"
        }
      });

    res.json({
      subscriptions
    });
  }
);

router.post(
  "/checkout",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parsed = z.object({
      plan: z.enum([
        "PRO",
        "ULTRA"
      ]),
      currency: z.string().length(3),
      amount: z.number().int().positive()
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid subscription"
      });
    }

    /*
     * IMPORTANT:
     *
     * The amount/currency should normally
     * be calculated server-side from the
     * user's location/provider rules.
     *
     * Do not trust the Android client
     * to decide entitlement.
     */

    res.json({
      success: true,
      plan: parsed.data.plan,
      currency:
        parsed.data.currency,
      amount:
        parsed.data.amount,
      message:
        "Create payment-provider checkout here."
    });
  }
);

export default router;