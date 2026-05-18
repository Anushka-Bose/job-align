import axios from "axios";
import Job from "../models/jobModel.js";
import Resume from "../models/resumeModel.js";
import { createNotificationsForNewJobs, deliverNotificationEmails } from "./notificationService.js";

const API_URL = "https://remotive.com/api/remote-jobs";
const DEFAULT_SEARCH_TERMS = [
  "software engineer",
  "frontend developer",
  "backend developer",
  "data analyst",
];
const DEFAULT_PREFERRED_LOCATION = process.env.DEFAULT_JOB_LOCATION || "India";
const CRON_NOTIFICATION_EMAIL_BATCH_LIMIT = Number(process.env.CRON_NOTIFICATION_EMAIL_BATCH_LIMIT || 10);
const INDIA_LOCATION_HINTS = [
  "india",
  "indian",
  "bangalore",
  "bengaluru",
  "hyderabad",
  "pune",
  "mumbai",
  "delhi",
  "new delhi",
  "noida",
  "gurgaon",
  "gurugram",
  "chennai",
  "kolkata",
  "ahmedabad",
  "kochi",
  "coimbatore",
];
const SKILL_LIBRARY = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "vue",
  "angular",
  "node",
  "nodejs",
  "express",
  "mongodb",
  "mysql",
  "postgresql",
  "sql",
  "python",
  "java",
  "c",
  "c++",
  "c#",
  "spring",
  "spring boot",
  "docker",
  "dbms",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "html",
  "css",
  "tailwind",
  "redux",
  "graphql",
  "rest",
  "django",
  "flask",
  "fastapi",
  "machine learning",
  "data science",
  "pandas",
  "numpy",
  "tensorflow",
  "pytorch",
  "git",
  "firebase"
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const getCandidateSearchQueries = async () => {
  const resumes = await Resume.find({
    $or: [
      { skills: { $exists: true, $ne: [] } },
      { "pipelineResult.resume_skills.0": { $exists: true } },
      { "pipelineResult.search_keywords.0": { $exists: true } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const latestByUser = new Map();
  for (const resume of resumes) {
    const userId = String(resume.userId);
    if (!latestByUser.has(userId)) {
      latestByUser.set(userId, resume);
    }
  }

  const searchQueries = [];

  for (const resume of latestByUser.values()) {
    const pipelineKeywords = Array.isArray(resume?.pipelineResult?.search_keywords)
      ? resume.pipelineResult.search_keywords
      : [];
    const resumeSkills = uniqueValues([
      ...(Array.isArray(resume?.skills) ? resume.skills : []),
      ...(Array.isArray(resume?.pipelineResult?.resume_skills) ? resume.pipelineResult.resume_skills : []),
    ]);

    if (pipelineKeywords.length) {
      searchQueries.push(...pipelineKeywords);
    } else if (resumeSkills.length) {
      searchQueries.push(
        resumeSkills.slice(0, 3).join(" "),
        ...resumeSkills.slice(0, 5).map((skill) => `${skill} developer`),
        ...resumeSkills.slice(0, 2).map((skill) => `${skill} engineer`),
      );
    }
  }

  return normalizeQueries([...DEFAULT_SEARCH_TERMS, ...searchQueries]);
};

const normalizeJob = (job, searchQuery = "") => {
  const description = stripHtml(job.description);

  return {
    id: job.id || `${searchQuery}-${job.title || "job"}`,
    title: job.title || "Untitled role",
    company: job.company_name || "Unknown company",
    location: job.candidate_required_location || "Remote",
    type: job.job_type || "remote",
    description,
    skillsRequired: extractSkills(`${job.title || ""} ${description}`),
    redirectUrl: job.url || null,
    source: "remotive",
    searchQuery,
  };
};

const extractSkills = (text = "") => {
  const haystack = text.toLowerCase();

  return uniqueValues(
    SKILL_LIBRARY.filter((skill) => {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(skill.toLowerCase())}([^a-z0-9]|$)`);
      return pattern.test(haystack);
    }),
  );
};

const normalizeQueries = (queries = []) => {
  const cleaned = uniqueValues(
    queries
      .map((query) => String(query || "").trim())
      .filter(Boolean),
  );

  return cleaned.length ? cleaned : DEFAULT_SEARCH_TERMS;
};

const normalizeLocationHints = (location = "") => {
  const normalized = String(location || "").trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  if (normalized === "india") {
    return INDIA_LOCATION_HINTS;
  }

  return uniqueValues([normalized]);
};

const matchesPreferredLocation = (job, locationHints = []) => {
  if (!locationHints.length) {
    return true;
  }

  const haystack = `${job.location || ""} ${job.description || ""}`.toLowerCase();
  return locationHints.some((hint) => haystack.includes(hint));
};

const fetchJobsFromApi = async (queries = [], options = {}) => {
  const normalizedQueries = normalizeQueries(queries);
  const preferredLocation = options.preferredLocation ?? DEFAULT_PREFERRED_LOCATION;
  const locationHints = normalizeLocationHints(preferredLocation);
  const uniqueJobs = new Map();
  const locationMatchedJobs = new Map();

  for (const query of normalizedQueries) {
    const response = await axios.get(API_URL, {
      params: {
        search: query,
        limit: 12,
      },
    });

    for (const job of response.data.jobs || []) {
      const normalized = normalizeJob(job, query);
      uniqueJobs.set(String(normalized.id), normalized);
      if (matchesPreferredLocation(normalized, locationHints)) {
        locationMatchedJobs.set(String(normalized.id), normalized);
      }
    }
  }

  if (locationMatchedJobs.size > 0) {
    return Array.from(locationMatchedJobs.values());
  }

  return Array.from(uniqueJobs.values());
};

const fetchJobs = async () => {
  try {
    const queries = await getCandidateSearchQueries();
    const jobs = await fetchJobsFromApi(queries);
    const newlyInsertedJobs = [];

    for (let job of jobs) {
      const existingJob = await Job.findOne({
        title: job.title,
        company: job.company,
      }).lean();

      if (!existingJob) {
        newlyInsertedJobs.push(job);
      }

      await Job.findOneAndUpdate(
        {
          title: job.title,
          company: job.company,
        },
        {
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          skillsRequired: job.skillsRequired,
          source: job.source,
          redirectUrl: job.redirectUrl,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    const notificationResult = await createNotificationsForNewJobs(newlyInsertedJobs);
    const deliveryResult = await deliverNotificationEmails({ limit: CRON_NOTIFICATION_EMAIL_BATCH_LIMIT });
    console.log("Jobs updated");
    console.log(`Notifications created: ${notificationResult.created}`);
    console.log(`Notification emails sent: ${deliveryResult.sent}, failed: ${deliveryResult.failed}`);
  } catch (err) {
    console.error(err.message);
  }
};

export { extractSkills, fetchJobsFromApi, fetchJobs };
