import stringSimilarity from "string-similarity";

// normalize skills
const normalize = (skill) => skill.toLowerCase().trim();

// fuzzy match threshold
const isSimilar = (skill1, skill2) => {
  const similarity = stringSimilarity.compareTwoStrings(
    normalize(skill1),
    normalize(skill2)
  );
  return similarity > 0.6; // threshold
};

// weighted scoring
const calculateSmartMatchScore = (resumeSkills, jobSkills) => {
  if (!jobSkills.length) return 0;

  let score = 0;
  let totalWeight = 0;

  jobSkills.forEach(jobSkill => {
    let weight = 1;

    // give higher weight to important skills
    if (["react", "node", "python"].includes(normalize(jobSkill))) {
      weight = 2;
    }

    totalWeight += weight;

    let matched = false;

    for (let resSkill of resumeSkills) {
      if (isSimilar(resSkill, jobSkill)) {
        matched = true;
        break;
      }
    }

    if (matched) {
      score += weight;
    }
  });

  return Math.round((score / totalWeight) * 100);
};

// explanation generator
const getSmartExplanation = (resumeSkills, jobSkills) => {
  const matched = [];
  const missing = [];

  jobSkills.forEach(jobSkill => {
    let found = false;

    for (let resSkill of resumeSkills) {
      if (isSimilar(resSkill, jobSkill)) {
        found = true;
        matched.push(jobSkill);
        break;
      }
    }

    if (!found) missing.push(jobSkill);
  });

  return {
    matchedSkills: matched,
    missingSkills: missing
  };
};

export { calculateSmartMatchScore, getSmartExplanation };