import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoute.js';
import resumeRoutes from './routes/resumeRoute.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
});
export default app;

