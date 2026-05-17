import nodemailer from "nodemailer";

const DEFAULT_SMTP_HOST = "smtp-relay.brevo.com";
const DEFAULT_SMTP_PORT = 587;
const MAX_TOP_JOB_EMAIL_COUNT = 5;

const getSenderAddress = () => process.env.EMAIL_FROM || process.env.SMTP_USER || "";

const parseSecureFlag = () => {
  const value = String(process.env.SMTP_SECURE || "").trim().toLowerCase();
  return value === "true" || value === "1";
};

const getMailConfigStatus = () => ({
  hasHost: Boolean(process.env.SMTP_HOST || DEFAULT_SMTP_HOST),
  hasPort: Boolean(process.env.SMTP_PORT || DEFAULT_SMTP_PORT),
  hasUser: Boolean(process.env.SMTP_USER),
  hasPassword: Boolean(process.env.SMTP_PASS),
  emailFrom: getSenderAddress(),
});

let transport = null;

const getTransport = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || DEFAULT_SMTP_HOST,
      port: Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT),
      secure: parseSecureFlag(),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transport;
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

const sendEmail = async ({ to, subject, text, html }) => {
  const mailTransport = getTransport();
  const from = getSenderAddress();

  if (!mailTransport || !to || !from) {
    const result = {
      skipped: true,
      reason: !to ? "recipient_missing" : (!from ? "sender_missing" : "smtp_not_configured"),
      configStatus: getMailConfigStatus(),
    };
    console.warn("sendEmail skipped", result);
    return result;
  }

  try {
    const info = await mailTransport.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return {
      skipped: false,
      messageId: info.messageId || "",
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    };
  } catch (error) {
    console.error("SMTP email error:", error);
    throw new Error(error?.message || "Failed to send email via SMTP");
  }
};

export const sendJobMatchEmail = async ({ to, candidateName, job, matchScore, matchedSkills = [] }) => {
  const skillsLine = matchedSkills.length
    ? matchedSkills.join(", ")
    : "New Job Alerts!!!!";

  const result = await sendEmail({
    to,
    subject: `New matching job: ${job.title} at ${job.company}`,
    text: [
      `Hi ${candidateName || "there"},`,
      "",
      "A new job matching your uploaded resume was found:",
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

  if (!result.skipped) {
    console.log("Job match email sent via SMTP:", result);
  }

  return result;
};

export const isEmailConfigured = () => Boolean(getTransport() && getSenderAddress());
export const getEmailConfigStatus = () => getMailConfigStatus();

export const verifyEmailTransport = async () => {
  const mailTransport = getTransport();
  if (!mailTransport) {
    return {
      ok: false,
      reason: "smtp_not_configured",
      configStatus: getMailConfigStatus(),
    };
  }

  if (!getSenderAddress()) {
    return {
      ok: false,
      reason: "sender_missing",
      configStatus: getMailConfigStatus(),
    };
  }

  try {
    await mailTransport.verify();
    return {
      ok: true,
      configStatus: getMailConfigStatus(),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error?.message || "smtp_verify_failed",
      configStatus: getMailConfigStatus(),
    };
  }
};

export const sendTopJobMatchesEmail = async ({
  to,
  candidateName,
  jobs = [],
  resumeScore = null,
}) => {
  if (!Array.isArray(jobs) || !jobs.length) {
    return { skipped: true, reason: "no_jobs" };
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

  return await sendEmail({
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
};

export const sendResumeTopJobsEmail = async ({ user = null, resume = null }) => {
  const persistedTopJobs = Array.isArray(resume?.pipelineResult?.top_jobs)
    ? resume.pipelineResult.top_jobs
    : [];

  return await sendTopJobMatchesEmail({
    to: user?.email || "",
    candidateName: user?.name || "",
    jobs: persistedTopJobs,
    resumeScore: resume?.pipelineResult?.resume_score ?? resume?.score ?? null,
  });
};
