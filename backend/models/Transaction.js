const mongoose = require("mongoose");

const transactionSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      type: {
        type: String,
        enum: [
          "deposit",
          "withdrawal",
          "payment",
          "refund",
          "ai_credit",
          "premium"
        ],
        required: true
      },

      amount: {
        type: Number,
        required: true
      },

      currency: {
        type: String,
        default: "NGN"
      },

      description: {
        type: String,
        default: ""
      },

      status: {
        type: String,
        enum: [
          "pending",
          "completed",
          "failed"
        ],
        default: "completed"
      },

      reference: {
        type: String,
        unique: true,
        sparse: true
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "Transaction",
    transactionSchema
  );