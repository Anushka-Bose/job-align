import { Resend } from "resend";

const getSenderAddress = () => process.env.EMAIL_FROM || "onboarding@resend.dev";
const MAX_TOP_JOB_EMAIL_COUNT = 5;

const getMailConfigStatus = () => ({
  hasApiKey: Boolean(process.env.SMTP_PASS || process.env.RESEND_API_KEY),
  emailFrom: getSenderAddress(),
});

let resendClient = null;

const getResendClient = () => {
  const apiKey = process.env.SMTP_PASS || process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    console.log("Initializing Resend client...");
    resendClient = new Resend(apiKey);
  }

  return resendClient;
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
  const resend = getResendClient();
  if (!resend || !to) {
    const result = {
      skipped: true,
      reason: !to ? "recipient_missing" : "resend_not_configured",
      configStatus: getMailConfigStatus(),
    };
    console.warn("sendJobMatchEmail skipped", result);
    return result;
  }

  const skillsLine = matchedSkills.length
    ? matchedSkills.join(", ")
    : "New Job Alerts!!!!";

  const { data, error } = await resend.emails.send({
    from: getSenderAddress(),
    to: [to],
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

  if (error) {
    console.error("Resend API error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }

  const result = {
    skipped: false,
    messageId: data.id,
  };
  console.log("Job match email sent via Resend:", result);
  return result;
};

export const isEmailConfigured = () => Boolean(getResendClient());
export const getEmailConfigStatus = () => getMailConfigStatus();

export const verifyEmailTransport = async () => {
  const client = getResendClient();
  if (!client) {
    return {
      ok: false,
      reason: "resend_not_configured",
      configStatus: getMailConfigStatus(),
    };
  }
  
  // Resend doesn't have a 'verify' method like nodemailer,
  // but we've initialized the client.
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
  const resend = getResendClient();
  if (!Array.isArray(jobs) || !jobs.length) {
    return { skipped: true, reason: "no_jobs" };
  }

  if (!resend || !to) {
    return { skipped: true, reason: !to ? "recipient_missing" : "resend_not_configured" };
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

  const { data, error } = await resend.emails.send({
    from: getSenderAddress(),
    to: [to],
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

  if (error) {
    console.error("Resend API error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return {
    skipped: false,
    messageId: data.id,
  };
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
