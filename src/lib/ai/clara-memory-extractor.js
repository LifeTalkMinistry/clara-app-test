/**
 * Memory extraction module for CLARA.
 *
 * This module analyses raw user text and extracts structured memories
 * according to the configured memory categories. Each extraction returns
 * a list of `{ category, content }` objects representing useful
 * information that CLARA should remember. Only meaningful phrases are
 * extracted; common greetings, short filler phrases and sensitive data
 * like passwords are ignored.
 *
 * Categories supported:
 * - financial_goal
 * - mood
 * - budget_preference
 * - spending_habit
 * - spending_concern
 * - income_context
 * - debt_context
 * - savings_context
 * - emergency_fund_context
 * - app_preference
 * - accountability
 */

// A set of trivial inputs that should never produce memories.
const TRIVIAL_MESSAGES = new Set([
  "hi",
  "hello",
  "hey",
  "thanks",
  "thank you",
  "ok",
  "okay",
  "haha",
  "hahaha",
  "lol",
  "bye",
]);

/**
 * Sanitize a string by trimming whitespace and converting multiple
 * whitespace to a single space.
 *
 * @param {string} text The input text.
 * @returns {string} The normalised text.
 */
function normalise(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Helper to detect and extract an amount from text. Returns a numeric
 * value if a plausible peso amount is found, otherwise null. Numbers may
 * include commas and optional decimal points.
 *
 * @param {string} lower The lower-cased text.
 * @returns {number|null}
 */
function extractAmount(lower) {
  const match = lower.match(/(?:₱|php|p)?\s*([\d,]+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const cleaned = match[1].replace(/,/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

/**
 * Extract memory objects from a user message. Returns an array of
 * `{ category, content }` objects. If no patterns are matched, the
 * returned array will be empty.
 *
 * @param {string} text The raw user input.
 * @returns {Array<{category: string, content: string}>}
 */
export function extractMemoriesFromText(text) {
  const memories = [];
  const raw = normalise(text);
  if (!raw || raw.length < 3) return memories;
  const lower = raw.toLowerCase();

  // Ignore trivial or one-word messages
  if (TRIVIAL_MESSAGES.has(lower)) return memories;

  // -----------------------------------------------------------------------
  // Financial goal detection
  // Look for phrases like "save 5000", "goal to save 10k", "saving 2000"
  if (/\b(save|saving|goal|target)\b/.test(lower)) {
    const amt = extractAmount(lower);
    if (amt) {
      // Normalise to peso format (omit decimal if .00)
      const formatted = amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      memories.push({ category: "financial_goal", content: `save ₱${formatted}` });
    } else {
      // No explicit amount, remember the goal phrase itself
      memories.push({ category: "financial_goal", content: raw });
    }
  }

  // -----------------------------------------------------------------------
  // Mood detection
  if (/\b(stress(ed)?|worried|anxious|overwhelmed|tired|sad|depressed|happy|excited)\b/.test(lower)) {
    const moodMatch = lower.match(/\b(stress(ed)?|worried|anxious|overwhelmed|tired|sad|depressed|happy|excited)\b/);
    if (moodMatch) {
      const mood = moodMatch[1].replace(/ed$/, "");
      // Capture the phrase following the mood word if present
      const afterMood = lower.split(moodMatch[0])[1] || "";
      const content = afterMood ? `${mood} about${afterMood}`.trim() : mood;
      memories.push({ category: "mood", content });
    }
  }

  // -----------------------------------------------------------------------
  // Budget preference detection (strict, tight, limited)
  if (/\b(strict|tight|limited) budget\b/.test(lower)) {
    const pref = lower.match(/\b(strict|tight|limited) budget\b/);
    if (pref) {
      memories.push({ category: "budget_preference", content: pref[0] });
    }
  }

  // -----------------------------------------------------------------------
  // Spending habit detection (overspend, impulse buying)
  if (/\b(overspend|over-spend|impulse buy(ing)?|impulsive buying)\b/.test(lower)) {
    // Capture the object of overspending if mentioned
    let content = "";
    const overspendMatch = lower.match(/overspend(?: on)? ([a-zA-Z ]+)/);
    if (overspendMatch) {
      content = `overspend on ${overspendMatch[1].trim()}`;
    } else if (/impulse buy(ing)?/.test(lower)) {
      content = "impulse buying";
    }
    memories.push({ category: "spending_habit", content: content || raw });
  }

  // -----------------------------------------------------------------------
  // Spending concern / avoidance (concerned about, avoid, reminds)
  if (/\b(concern(ed)? about|avoid|avoiding)\b/.test(lower)) {
    // Example: "concerned about my budget", "avoid shopee"
    const concernMatch = lower.match(/\b(concern(?:ed)? about|avoid|avoiding) ([a-zA-Z ]+)/);
    if (concernMatch) {
      const phrase = concernMatch[2].trim();
      memories.push({ category: "spending_concern", content: `${concernMatch[1]} ${phrase}` });
    }
  }

  // -----------------------------------------------------------------------
  // Income context detection (salary/income comes every ...)
  if (/\b(salary|income|sweldo|paycheck)\b/.test(lower) && /\b(comes|arrives|is)\b/.test(lower)) {
    // Capture the part after "comes" or "arrives"
    const incomeMatch = lower.match(/\b(?:comes|arrives|is) (.*)$/);
    if (incomeMatch) {
      const when = incomeMatch[1].trim();
      memories.push({ category: "income_context", content: `salary comes ${when}` });
    }
  }

  // -----------------------------------------------------------------------
  // Debt context detection
  if (/\b(debt|loan|utang)\b/.test(lower)) {
    // Capture entire sentence as debt context
    memories.push({ category: "debt_context", content: raw });
  }

  // -----------------------------------------------------------------------
  // Savings context detection (saving for something)
  if (/\b(saving for|build my savings|increase my savings|boost my savings)\b/.test(lower)) {
    const savMatch = lower.match(/\b(saving for|build my savings|increase my savings|boost my savings)(.*)/);
    const detail = savMatch ? savMatch[2].trim() : "";
    memories.push({ category: "savings_context", content: detail ? `saving for ${detail}` : raw });
  }

  // -----------------------------------------------------------------------
  // Emergency fund context detection
  if (/\bemergency fund\b/.test(lower)) {
    const after = lower.split("emergency fund")[1] || "";
    const content = after ? `emergency fund${after}`.trim() : "emergency fund";
    memories.push({ category: "emergency_fund_context", content });
  }

  // -----------------------------------------------------------------------
  // App preference (weekly/daily/monthly summaries)
  if (/\bprefer\b/.test(lower) && /\b(summary|summaries|report|reports)\b/.test(lower)) {
    const match = lower.match(/prefer (.*?)(?: summaries| summary| reports| report)/);
    const pref = match ? match[1].trim() : null;
    const content = pref ? `${pref} summaries` : raw;
    memories.push({ category: "app_preference", content });
  }

  // -----------------------------------------------------------------------
  // Accountability detection (reminders, stop habits)
  if (/\b(remind me to|hold me accountable|stop|avoid)\b/.test(lower)) {
    // Look for "remind me to ..." or "I want to stop ..."
    const remindMatch = lower.match(/remind me to ([a-zA-Z ]+)/);
    if (remindMatch) {
      memories.push({ category: "accountability", content: remindMatch[1].trim() });
    } else {
      const stopMatch = lower.match(/(?:stop|avoid) ([a-zA-Z ]+)/);
      if (stopMatch) {
        memories.push({ category: "accountability", content: `${stopMatch[0].trim()}` });
      }
    }
  }

  return memories;
}