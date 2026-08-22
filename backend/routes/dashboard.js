const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const Transaction = require("../models/Transaction");

// This route expects your existing authentication middleware.
// Change the path below if your project uses a different middleware.
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const followers =
      Number(user.followersCount || 0);

    const following =
      Number(user.followingCount || 0);

    const aiCredits =
      Number(user.aiCredits ?? 0);

    const walletBalance =
      Number(user.walletBalance ?? 0);

    const totalUsers =
      await User.countDocuments();

    const totalMessages =
      await Message.countDocuments();

    const activeUsers =
      await User.countDocuments({
        lastSeen: {
          $gte: new Date(
            Date.now() - 24 * 60 * 60 * 1000
          )
        }
      });

    const channels =
      await Channel.find({
        $or: [
          { ownerId: userId },
          { followers: userId }
        ]
      })
        .limit(20)
        .lean();

    const transactions =
      await Transaction.find({
        userId
      })
        .sort({
          createdAt: -1
        })
        .limit(10)
        .lean();

    const channelStats = channels.map(
      (channel) => ({
        id: channel._id,
        name: channel.name,
        subscribers:
          Number(
            channel.subscribersCount ??
            channel.followers?.length ??
            0
          ),
        likes:
          Number(channel.likesCount || 0),
        comments:
          Number(channel.commentsCount || 0),
        shares:
          Number(channel.sharesCount || 0)
      })
    );

    const totalSubscribers =
      channelStats.reduce(
        (sum, channel) =>
          sum + channel.subscribers,
        0
      );

    const totalLikes =
      channelStats.reduce(
        (sum, channel) =>
          sum + channel.likes,
        0
      );

    const totalComments =
      channelStats.reduce(
        (sum, channel) =>
          sum + channel.comments,
        0
      );

    const totalShares =
      channelStats.reduce(
        (sum, channel) =>
          sum + channel.shares,
        0
      );

    res.json({
      success: true,

      user: {
        id: user._id,
        name: user.name,
        phone: user.phone
      },

      social: {
        followers,
        following,
        totalSubscribers,
        totalLikes,
        totalComments,
        totalShares
      },

      wallet: {
        balance: walletBalance,
        currency: user.currency || "NGN",
        transactions
      },

      ai: {
        credits: aiCredits
      },

      statistics: {
        totalUsers,
        activeUsers,
        totalMessages
      },

      channels: channelStats
    });
  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );

    res.status(500).json({
      error: "Could not load dashboard"
    });
  }
});

module.exports = router;