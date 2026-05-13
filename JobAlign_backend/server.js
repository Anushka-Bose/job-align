import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import cron from "node-cron";
import { fetchJobs } from "./services/jobService.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
const PORT = process.env.PORT || 3000;
const JOB_FETCH_CRON = process.env.JOB_FETCH_CRON || "0 * * * *";

const DB = process.env.MONGO_DB_URL;
mongoose.connect(DB).then(()=>{
    console.log('DB connection successful');
    fetchJobs().catch((error) => {
      console.error("Initial job fetch failed:", error?.message || error);
    });
}).catch((err)=>{
    console.log('DB connection error:',err);
});

app.listen(PORT,()=>{
    console.log(`App running on port ${PORT}...`);
});

cron.schedule(JOB_FETCH_CRON, async () => {
  console.log("Fetching jobs...");
  await fetchJobs();
});
