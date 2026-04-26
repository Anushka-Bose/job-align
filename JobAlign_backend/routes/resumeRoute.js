import express from "express";
import { uploadResume } from "../controllers/resumeController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/upload", protect, upload.single("resume"), uploadResume);

export default router;
