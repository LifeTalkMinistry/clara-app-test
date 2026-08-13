function cleanRefinedText(text = "") {
  return String(text || "")
    .replace(/^[\s'"`]+|[\s'"`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

function sentenceCase(text = "") {
  const value = cleanRefinedText(text);
  if (!value) return "";
  const first = value.charAt(0).toUpperCase() + value.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

function normalizeFirstPerson(text = "") {
  let value = cleanRefinedText(text);
  if (!value) return "";

  value = value
    .replace(/^my\s+work\s+is\s+/i, "I work ")
    .replace(/^my\s+job\s+is\s+/i, "I work as ")
    .replace(/^my\s+goal\s+is\s+/i, "I want to ")
    .replace(/^goal\s*:\s*/i, "I want to ")
    .replace(/^work\s*:\s*/i, "I work ")
    .replace(/^routine\s*:\s*/i, "My routine is ")
    .replace(/^support\s*:\s*/i, "I prefer ");

  return sentenceCase(value);
}

export function hasClaraLifeProfileRefiner() {
  return true;
}

export async function refineClaraLifeProfileText({ originalText = "" } = {}) {
  const roughText = cleanRefinedText(originalText);

  if (!roughText) {
    throw new Error("Write a rough answer first so CLARA can clean it up without inventing details.");
  }

  // Deliberately local. Gemini is reserved for Ask Before You Spend.
  // This keeps the Life Profile helper functional without API usage.
  return normalizeFirstPerson(roughText);
}
