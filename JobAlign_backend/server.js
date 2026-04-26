import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';
import cron from "node-cron";
import { fetchJobs } from "./services/jobService.js";

dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 3000;

const DB = process.env.MONGO_DB_URL;
mongoose.connect(DB).then(()=>{
    console.log('DB connection successful');
}).catch((err)=>{
    console.log('DB connection error:',err);
});

app.listen(PORT,()=>{
    console.log(`App running on port ${PORT}...`);
});

// run every 6 hours
cron.schedule("0 */6 * * *", async () => {
  console.log("Fetching jobs...");
  await fetchJobs();
});