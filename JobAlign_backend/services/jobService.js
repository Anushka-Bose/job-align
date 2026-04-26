import axios from "axios";
import Job from "../models/jobModel.js";

const API_URL = "https://remotive.com/api/remote-jobs";

// simple skill extractor
const extractSkills = (text) => {
  const skills = ["javascript", "react", "node", "mongodb", "python", "docker"];
  return skills.filter(skill => text.toLowerCase().includes(skill));
};

const fetchJobs = async () => {
  try {
    const res = await axios.get(API_URL);
    const jobs = res.data.jobs;

    for (let job of jobs) {
      // avoid duplicates
      const exists = await Job.findOne({
        title: job.title,
        company: job.company_name
      });

      if (exists) continue;

      await Job.create({
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location,
        description: job.description,
        skillsRequired: extractSkills(job.description),
        source: "remotive"
      });
    }

    console.log("Jobs updated");
  } catch (err) {
    console.error(err.message);
  }
};

export { fetchJobs };