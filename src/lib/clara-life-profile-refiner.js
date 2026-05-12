const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiApiKey() {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_AI_API_KEY ||
    import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
    import.meta.env.VITE_CLARA_GEMINI_API_KEY ||
    import.meta.env.VITE_AI_API_KEY ||
    ""
  );
}

function getGeminiModel() {
  return (
    import.meta.env.VITE_GEMINI_MODEL ||
    import.meta.env.VITE_CLARA_GEMINI_MODEL ||
    DEFAULT_GEMINI_MODEL
  );
}

function cleanRefinedText(text = "") {
  return String(text || "")
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

export function hasClaraLifeProfileRefiner() {
  return Boolean(getGeminiApiKey());
}

export async function refineClaraLifeProfileText({
  fieldLabel = "Life context",
  fieldHelper = "Help CLARA understand the user's life context.",
  originalText = "",
  signal,
} = {}) {
  const apiKey = getGeminiApiKey();
  const roughText = String(originalText || "").trim();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  if (!roughText) {
    throw new Error("Write a rough answer first so CLARA can refine it without inventing details.");
  }

  const model = getGeminiModel();
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

  const response = await fetch(
    `${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.42,
          topP: 0.85,
          maxOutputTokens: 180,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini refine failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const refinedText = cleanRefinedText(
    (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || "")
      .join(" ")
  );

  if (!refinedText) {
    throw new Error("Gemini returned an empty refined answer.");
  }

  return refinedText;
}
