import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoute.js';
import resumeRoutes from './routes/resumeRoute.js';
import feedRoutes from './routes/feedRoute.js';
import recruiterRoutes from './routes/recruiterRoute.js';
import notificationRoutes from './routes/notificationRoute.js';
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/feed", feedRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.get("/", (req, res) => {
  res.send("API Running...");
});
export default app;

