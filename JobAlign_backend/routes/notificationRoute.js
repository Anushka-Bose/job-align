import express from "express";
import Notification from "../models/notificationModel.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load notifications." });
  }
});

router.patch("/:notificationId/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        userId: req.user.id,
      },
      {
        isRead: true,
      },
      {
        new: true,
      },
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update notification." });
  }
});

export default router;
