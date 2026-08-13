import {
  normalizeScheduleImpactSessionMemory,
  normalizeExpensePath,
} from "./schedule-impact-session-memory";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function titleCase(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeTitle(form = {}) {
  const existing = cleanText(form.title);
  if (existing) return existing;
  const note = cleanText(form.note || form.description || form.userNote);
  const type = cleanText(form.type || form.category || "Personal");
  const source = `${note} ${type}`.toLowerCase();

  if (/dentist|dental|tooth|teeth|ngipin|oral/.test(source)) return "Dental appointment";
  if (/doctor|checkup|clinic|hospital|medical|laboratory|\blab\b/.test(source)) return "Medical appointment";
  if (/church|ministry|service|fellowship/.test(source)) return "Church schedule";
  if (/birthday|party|celebration|fiesta/.test(source)) return "Celebration";
  if (/work|office|meeting|shift|interview/.test(source)) return "Work schedule";
  if (/date|girlfriend|boyfriend|partner|relationship|jowa/.test(source)) return "Relationship schedule";
  if (/license|licence|renewal|renew/.test(source)) return "Renewal errand";
  if (/outing|trip|beach|resort|hangout|gala|lakad/.test(source)) return "Outing";

  const short = note.replace(/[.!?]+$/g, "").split(" ").filter(Boolean).slice(0, 5).join(" ");
  return titleCase(short || `${type} schedule`);
}

function scheduleProfile(form = {}) {
  const title = makeTitle(form);
  const note = cleanText(form.note || form.description || form.userNote);
  const source = `${title} ${note} ${form.type || form.category || ""}`.toLowerCase();

  if (/dentist|dental|tooth|teeth|ngipin|oral|cleaning|extraction|root canal|braces|pasta|bunot/.test(source)) {
    return {
      eventType: "dental",
      description: note || "Dental appointment that may involve treatment, coverage checks, out-of-pocket costs, after-care, and transportation.",
      areas: ["Dental procedure or consultation", "HMO/insurance coverage", "Out-of-pocket balance", "Medicine or after-care", "Transportation", "Emergency buffer"],
    };
  }

  if (/doctor|checkup|clinic|hospital|medical|consultation|laboratory|\blab\b|medicine|prescription/.test(source)) {
    return {
      eventType: "medical",
      description: note || "Health appointment that may involve consultation, coverage, medicine, transportation, and follow-up costs.",
      areas: ["Consultation or procedure", "HMO/insurance coverage", "Out-of-pocket balance", "Medicine, lab, or follow-up", "Transportation", "Emergency buffer"],
    };
  }

  if (/date|girlfriend|boyfriend|partner|relationship|jowa|romantic/.test(source)) {
    return {
      eventType: "relationship",
      description: note || "Relationship schedule that may involve transportation, food, an activity fee, a small gift, or extra stops.",
      areas: ["Transportation", "Food or drinks", "Activity or reservation", "Gift or small surprise", "Extra stop", "Emergency buffer"],
    };
  }

  if (/church|ministry|simbahan|service|fellowship|offering/.test(source)) {
    return {
      eventType: "ministry",
      description: note || "Church-related schedule that may involve transportation, food, contribution, offering, or extra stops.",
      areas: ["Transportation", "Food or drinks", "Offering or group contribution", "Extra stop", "Emergency buffer"],
    };
  }

  if (/birthday|celebration|party|fiesta/.test(source)) {
    return {
      eventType: "celebration",
      description: note || "Celebration schedule that may involve a gift, food, contribution, delivery, or transportation.",
      areas: ["Gift or contribution", "Food or cake", "Transportation or delivery", "Extra spending", "Emergency buffer"],
    };
  }

  if (/license|licence|renewal|renew|government/.test(source)) {
    return {
      eventType: "errand",
      description: note || "Renewal or government errand that may involve fees, requirements, transportation, and processing costs.",
      areas: ["Renewal or government fee", "Requirements / photocopy / photo", "Transportation or parking", "Processing buffer"],
    };
  }

  if (/bill|payment|due|installment|subscription/.test(source)) {
    return {
      eventType: "bill",
      description: note || "Payment schedule that may involve the main payment plus transfer, convenience, or cash-in fees.",
      areas: ["Main payment", "Transfer or convenience fee", "Cash-in or transportation cost", "Emergency buffer"],
    };
  }

  if (/work|office|meeting|shift|interview|coworker|workmate/.test(source)) {
    return {
      eventType: "work",
      description: note || "Work-related schedule that may involve transportation, meals, coffee, or small work extras.",
      areas: ["Transportation", "Meal, snack, or coffee", "Work-related extra", "Extra stop", "Emergency buffer"],
    };
  }

  if (/outing|trip|beach|resort|hangout|gala|lakad|mall|movie/.test(source)) {
    return {
      eventType: "outing",
      description: note || "Outing that may involve transportation, food, activity fees, shared contributions, and a buffer.",
      areas: ["Transportation", "Food and drinks", "Entrance or activity fee", "Shared contribution", "Emergency buffer"],
    };
  }

  return {
    eventType: "general",
    description: note || `${title} may affect your spending plan.`,
    areas: ["Transportation", "Food or drinks", "Fee or shared expense", "Extra stop", "Emergency buffer"],
  };
}

function isYes(value = "") {
  return /\b(yes|yep|yeah|sure|ok|okay|ready|go|start|continue|confirm|oo|opo|sige)\b/i.test(cleanText(value));
}

function buildAssistantMessage({ stage, title, areas, latestUserReply }) {
  if (stage === "confirm_intent") {
    return `I’ll assess the money impact for this schedule: ${title}. Is that correct?`;
  }

  if (stage === "spending_area_preview" || (stage === "confirm_intent" && isYes(latestUserReply))) {
    return `Possible spending areas for ${title}:\n\n${areas.map((area) => `- ${area}`).join("\n")}\n\nReply Ready when you want to start.`;
  }

  if (stage === "ask_permission") {
    return "The possible spending areas are ready. Reply Ready to review them one at a time, or save the schedule without a forecast.";
  }

  return "Use the editable spending list to enter only the amounts that actually apply to this schedule.";
}

// Compatibility name retained for existing schedule components.
// This implementation is deliberately local and never calls Gemini or any paid AI API.
export async function askGeminiForScheduleImpact({
  form = {},
  messages = [],
  stage = "confirm_intent",
  activeCategory = "",
  activeSubItem = "",
  expensePath = [],
  latestUserReply = "",
  sessionMemory = null,
} = {}) {
  const memory = normalizeScheduleImpactSessionMemory(sessionMemory || {}, {
    form,
    messages,
    stage,
    activeCategory,
    activeSubItem,
    expensePath,
  });

  const title = makeTitle(form);
  const profile = scheduleProfile(form);
  const currentStage = cleanText(stage || memory?.currentFlow?.stage || "confirm_intent");
  const previewRequested = currentStage === "spending_area_preview" || (currentStage === "confirm_intent" && isYes(latestUserReply));
  const outputStage = previewRequested ? "ask_permission" : currentStage;

  return {
    assistant_message: buildAssistantMessage({
      stage: previewRequested ? "spending_area_preview" : currentStage,
      title,
      areas: profile.areas,
      latestUserReply,
    }),
    stage: outputStage,
    spending_areas: profile.areas,
    suggested_title: title,
    suggested_description: profile.description,
    schedule_updates: {
      title,
      description: profile.description,
      confirmed: currentStage === "confirm_intent" && isYes(latestUserReply) ? true : undefined,
    },
    confirmed_facts_updates: {
      eventType: profile.eventType,
      eventMeaningLocked: true,
    },
    active_category: cleanText(activeCategory),
    active_sub_item: cleanText(activeSubItem),
    expense_path: normalizeExpensePath(expensePath),
    should_add_cost: false,
    confirmed_cost: 0,
    cost_category: "",
    cost_sub_item: "",
    cost_mode: "skip",
    affected_sub_items: [],
    should_skip_sub_item: false,
    skipped_sub_item: "",
    meta: {
      source: "local_rule_engine",
      provider: "none",
      billableAi: false,
    },
  };
}
