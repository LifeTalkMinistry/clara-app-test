function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCategory(value) {
  const raw = cleanText(value).toLowerCase();
  if (raw.includes("work")) return "Work";
  if (raw.includes("family")) return "Family";
  if (raw.includes("health") || raw.includes("doctor") || raw.includes("medical") || raw.includes("dental")) return "Health";
  if (raw.includes("ministry") || raw.includes("church")) return "Ministry";
  if (raw.includes("errand")) return "Errand";
  if (raw.includes("social") || raw.includes("friend") || raw.includes("outing") || raw.includes("date")) return "Social";
  if (raw.includes("personal")) return "Personal";
  return "Other";
}

function titleCase(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferTitle(form = {}) {
  const existing = cleanText(form.title);
  if (existing) return existing;

  const note = cleanText(form.note || form.userNote);
  const type = cleanText(form.type || form.category || "Personal");
  const source = `${note} ${type}`.toLowerCase();

  if (/dentist|dental|tooth|teeth|ngipin|oral/.test(source)) return "Dental appointment";
  if (/doctor|checkup|clinic|hospital|medical|lab/.test(source)) return "Medical appointment";
  if (/church|ministry|service|fellowship/.test(source)) return "Church schedule";
  if (/birthday|party|celebration|fiesta/.test(source)) return "Celebration";
  if (/work|office|meeting|shift|interview/.test(source)) return "Work schedule";
  if (/date|girlfriend|boyfriend|partner|relationship/.test(source)) return "Relationship schedule";
  if (/outing|trip|beach|resort|hangout|gala|lakad/.test(source)) return "Outing";

  const short = note.replace(/[.!?]+$/g, "").split(" ").filter(Boolean).slice(0, 5).join(" ");
  return titleCase(short || `${type} schedule`);
}

function inferCategory(form = {}) {
  const source = `${form.type || form.category || ""} ${form.title || ""} ${form.note || form.userNote || ""}`.toLowerCase();
  if (/work|office|meeting|shift|interview/.test(source)) return "Work";
  if (/family|birthday|fiesta/.test(source)) return "Family";
  if (/doctor|dental|dentist|clinic|hospital|medical|health|lab/.test(source)) return "Health";
  if (/church|ministry|service|fellowship/.test(source)) return "Ministry";
  if (/errand|renewal|license|grocer/.test(source)) return "Errand";
  if (/friend|outing|hangout|date|partner|relationship|party/.test(source)) return "Social";
  return normalizeCategory(form.type || form.category || "Personal");
}

function detectMoneyRelevance(form = {}) {
  const source = `${form.title || ""} ${form.note || form.userNote || ""} ${form.type || form.category || ""}`.toLowerCase();
  return /(buy|spend|cost|fee|fare|transport|food|meal|coffee|gift|contribution|offering|payment|bill|renew|clinic|doctor|dental|dentist|medicine|outing|trip|date|party|birthday|work|office|church|appointment)/.test(source);
}

function buildRefinedIntention(form = {}, latestAnswer = "") {
  const note = cleanText(latestAnswer) || cleanText(form.note || form.userNote);
  const title = inferTitle(form);
  if (!note) return `I want to add ${title.toLowerCase()} to my schedule.`;

  const normalized = note.replace(/[.!?]+$/g, "");
  if (/^i\s+(want|need|plan|have|am|will)\b/i.test(normalized)) {
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}.`;
  }
  return `I plan to ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}.`;
}

function buildQuestions(form = {}, latestAnswer = "") {
  const note = cleanText(form.note || form.userNote);
  const answer = cleanText(latestAnswer);
  const questions = [];

  if (!note && !answer) {
    questions.push({
      key: "purpose",
      question: "What exactly will happen in this schedule?",
      reason: "This helps CLARA make the schedule clear without guessing.",
    });
  }

  if (!cleanText(form.time) && /appointment|meeting|shift|service|interview|doctor|dental|dentist|clinic|church/i.test(`${form.title || ""} ${note}`)) {
    questions.push({
      key: "time",
      question: "Do you know what time this will happen?",
      reason: "A time helps place the schedule correctly.",
    });
  }

  return questions.slice(0, 2);
}

export async function askGeminiForScheduleRefinement({ form = {}, latestAnswer = "" } = {}) {
  const nextQuestions = buildQuestions(form, latestAnswer);
  const missingDetails = nextQuestions.map((item) => item.key);

  // Deliberately local. Gemini is reserved for Ask Before You Spend.
  return {
    refined_intention: buildRefinedIntention(form, latestAnswer),
    suggested_title: inferTitle(form),
    suggested_category: inferCategory(form),
    detected_money_relevance: detectMoneyRelevance(form),
    missing_details: missingDetails,
    next_questions: nextQuestions,
    confidence: cleanText(form.note || form.userNote || latestAnswer) ? "high" : "medium",
    ready_to_save: nextQuestions.length === 0,
    meta: { source: "local_rule_engine" },
  };
}
