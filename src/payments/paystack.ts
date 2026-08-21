import crypto from "node:crypto";
import { Router } from "express";

const router = Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.warn(
    "PAYSTACK_SECRET_KEY is not configured. Payment checkout will be unavailable."
  );
}

router.post("/checkout", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured."
      });
    }

    const {
      email,
      amount,
      currency = "NGN",
      plan = "premium"
    } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount are required."
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount."
      });
    }

    // Paystack expects NGN amounts in kobo.
    const amountInSubunit = Math.round(numericAmount * 100);

    const reference =
      `veylora_${Date.now()}_` +
      crypto.randomBytes(6).toString("hex");

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: String(amountInSubunit),
          currency,
          reference,
          metadata: {
            app: "Veylora",
            plan
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error("Paystack error:", data);

      return res.status(502).json({
        success: false,
        message: "Unable to create payment checkout."
      });
    }

    return res.status(200).json({
      success: true,
      reference: data.data.reference,
      access_code: data.data.access_code,
      authorization_url: data.data.authorization_url
    });
  } catch (error) {
    console.error("Checkout error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment service temporarily unavailable."
    });
  }
});

export default router;