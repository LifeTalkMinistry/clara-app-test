import { requestClaraGeminiProxyText } from "./clara-gemini-proxy-client";

function cleanRefinedText(text = "") {
  return String(text || "")
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

export function hasClaraLifeProfileRefiner() {
  return true;
}

export async function refineClaraLifeProfileText({
  fieldLabel = "Life context",
  fieldHelper = "Help CLARA understand the user's life context.",
  originalText = "",
  signal,
} = {}) {
  const roughText = String(originalText || "").trim();

  if (!roughText) {
    throw new Error("Write a rough answer first so CLARA can refine it without inventing details.");
  }

  const prompt = `You are helping a CLARA user write one private life-profile answer.

Purpose:
This text will be used by CLARA to give better spending advice later.

Field:
${fieldLabel}

Field meaning:
${fieldHelper}

User's rough answer:
${roughText}

Rewrite the user's answer so it is clear, simple, emotionally honest, and easy for CLARA to understand later.

Rules:
- Keep the user's meaning.
- Do not invent new facts, goals, people, amounts, trauma, or beliefs.
- Use first person, like "I am..." or "I want...".
- Use daily words.
- Make it specific enough for money advice.
- Keep it 1 to 3 short sentences.
- Maximum 360 characters.
- No markdown, bullets, emojis, labels, or quotation marks.

Refined answer:`;

  const text = await requestClaraGeminiProxyText({
    prompt,
    signal,
    generationConfig: {
      temperature: 0.42,
      topP: 0.85,
      maxOutputTokens: 180,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const refinedText = cleanRefinedText(text);

  if (!refinedText) {
    throw new Error("Gemini returned an empty refined answer.");
  }

  return refinedText;
}
