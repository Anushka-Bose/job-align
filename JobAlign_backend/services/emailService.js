import nodemailer from "nodemailer";

const getSenderAddress = () => process.env.EMAIL_FROM || process.env.SMTP_USER || "";
const MAX_TOP_JOB_EMAIL_COUNT = 5;

const isMailEnabled = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,
  );

const getMailConfigStatus = () => ({
  smtpHost: Boolean(process.env.SMTP_HOST),
  smtpPort: Boolean(process.env.SMTP_PORT),
  smtpUser: Boolean(process.env.SMTP_USER),
  smtpPass: Boolean(process.env.SMTP_PASS),
  emailFrom: Boolean(getSenderAddress()),
  explicitEmailFrom: Boolean(process.env.EMAIL_FROM),
});

let transporter = null;

const getTransporter = () => {
  if (!isMailEnabled()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const normalizeTopJobsForEmail = (jobs = []) =>
  (Array.isArray(jobs) ? jobs : []).slice(0, MAX_TOP_JOB_EMAIL_COUNT).map((job) => {
    const rawScore = typeof job?.score === "number"
      ? job.score
      : (typeof job?.similarity_score === "number" ? job.similarity_score : null);
    const normalizedScore = typeof rawScore === "number"
      ? (rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore))
      : null;

    return {
      title: job?.title || "Matched role",
      company: job?.company || "Recommended company",
      location: job?.location || "Remote / Unspecified",
      score: normalizedScore,
      url: job?.redirect_url || job?.redirectUrl || job?.url || job?.link || "",
    };
  });

export const sendJobMatchEmail = async ({ to, candidateName, job, matchScore, matchedSkills = [] }) => {
  const mailer = getTransporter();
  if (!mailer || !to) {
    const result = {
      skipped: true,
      reason: !to ? "recipient_missing" : "mailer_not_configured",
      configStatus: getMailConfigStatus(),
      recipientPresent: Boolean(to),
    };
    console.warn("sendJobMatchEmail skipped", result);
    return result;
  }

  const skillsLine = matchedSkills.length
    ? matchedSkills.join(", ")
    : "New Job Alerts!!!!";

  const info = await mailer.sendMail({
    from: getSenderAddress(),
    to,
    subject: `New matching job: ${job.title} at ${job.company}`,
    text: [
      `Hi ${candidateName || "there"},`,
      "",
      `A new job matching your uploaded resume was found:`,
      `${job.title} at ${job.company}`,
      `Location: ${job.location || "Remote / Unspecified"}`,
      `Match score: ${matchScore}%`,
      `Matched skills: ${skillsLine}`,
      "",
      job.redirectUrl ? `Apply here: ${job.redirectUrl}` : "",
      "",
      "You are receiving this because you uploaded a resume to Job Align.",
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Hi ${candidateName || "there"},</p>
        <p>A new job matching your uploaded resume was found.</p>
        <p>
          <strong>${job.title}</strong><br />
          ${job.company}<br />
          ${job.location || "Remote / Unspecified"}<br />
          Match score: <strong>${matchScore}%</strong>
        </p>
        <p>Matched skills: ${skillsLine}</p>
        ${job.redirectUrl ? `<p><a href="${job.redirectUrl}">View job</a></p>` : ""}
        <p>You are receiving this because you uploaded a resume to Job Align.</p>
      </div>
    `,
  });

  const result = {
    skipped: false,
    messageId: info.messageId || null,
    accepted: Array.isArray(info.accepted) ? info.accepted : [],
    rejected: Array.isArray(info.rejected) ? info.rejected : [],
    response: info.response || null,
  };
  console.log("Job match email result:", result);
  return result;
};

export const isEmailConfigured = () => isMailEnabled();
export const getEmailConfigStatus = () => getMailConfigStatus();

export const verifyEmailTransport = async () => {
  const mailer = getTransporter();
  if (!mailer) {
    return {
      ok: false,
      reason: "mailer_not_configured",
      configStatus: getMailConfigStatus(),
    };
  }

  await mailer.verify();
  return {
    ok: true,
    configStatus: getMailConfigStatus(),
  };
};

export const sendTopJobMatchesEmail = async ({
  to,
  candidateName,
  jobs = [],
  resumeScore = null,
}) => {
  const mailer = getTransporter();
  if (!Array.isArray(jobs) || !jobs.length) {
    const result = {
      skipped: true,
      reason: "no_jobs",
      configStatus: getMailConfigStatus(),
      recipientPresent: Boolean(to),
      jobCount: Array.isArray(jobs) ? jobs.length : 0,
    };
    console.warn("sendTopJobMatchesEmail skipped", result);
    return result;
  }

  if (!mailer || !to) {
    const result = {
      skipped: true,
      reason: !to ? "recipient_missing" : "mailer_not_configured",
      configStatus: getMailConfigStatus(),
      recipientPresent: Boolean(to),
      jobCount: jobs.length,
    };
    console.warn("sendTopJobMatchesEmail skipped", result);
    return result;
  }

  const summarizedJobs = normalizeTopJobsForEmail(jobs);

  const textBlocks = summarizedJobs.map((job, index) => [
    `${index + 1}. ${job.title} at ${job.company}`,
    `Location: ${job.location}`,
    job.score !== null ? `Match score: ${job.score}%` : "",
    job.url ? `Apply here: ${job.url}` : "",
  ].filter(Boolean).join("\n"));

  const htmlBlocks = summarizedJobs.map((job, index) => `
    <div style="padding: 12px 0; border-top: ${index === 0 ? "none" : "1px solid #e2e8f0"};">
      <p style="margin: 0; font-weight: 700;">${index + 1}. ${job.title} at ${job.company}</p>
      <p style="margin: 6px 0 0;">${job.location}</p>
      ${job.score !== null ? `<p style="margin: 6px 0 0;">Match score: <strong>${job.score}%</strong></p>` : ""}
      ${job.url ? `<p style="margin: 8px 0 0;"><a href="${job.url}">View job</a></p>` : ""}
    </div>
  `).join("");

  const info = await mailer.sendMail({
    from: getSenderAddress(),
    to,
    subject: "Your top matched jobs from Job Align",
    text: [
      `Hi ${candidateName || "there"},`,
      "",
      "New Job Alerts!!!!",
      "",
      "Your resume was analyzed successfully. Here are your top matched jobs:",
      "",
      ...textBlocks,
      "",
      resumeScore !== null ? `Resume score for the top role: ${resumeScore}` : "",
      "You are receiving this because you uploaded a resume to Job Align.",
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Hi ${candidateName || "there"},</p>
        <p style="font-size: 18px; font-weight: 700; color: #0f766e; margin: 0 0 12px;">New Job Alerts!!!!</p>
        <p>Your resume was analyzed successfully. Here are your top matched jobs:</p>
        ${htmlBlocks}
        ${resumeScore !== null ? `<p style="margin-top: 16px;">Resume score for the top role: <strong>${resumeScore}</strong></p>` : ""}
        <p style="margin-top: 16px;">You are receiving this because you uploaded a resume to Job Align.</p>
      </div>
    `,
  });

  const result = {
    skipped: false,
    messageId: info.messageId || null,
    accepted: Array.isArray(info.accepted) ? info.accepted : [],
    rejected: Array.isArray(info.rejected) ? info.rejected : [],
    response: info.response || null,
  };
  console.log("Top job matches email result:", result);
  return result;
};

export const sendResumeTopJobsEmail = async ({ user = null, resume = null }) => {
  const persistedTopJobs = Array.isArray(resume?.pipelineResult?.top_jobs)
    ? resume.pipelineResult.top_jobs
    : [];

  return sendTopJobMatchesEmail({
    to: user?.email || "",
    candidateName: user?.name || "",
    jobs: persistedTopJobs,
    resumeScore: resume?.pipelineResult?.resume_score ?? resume?.score ?? null,
  });
};
