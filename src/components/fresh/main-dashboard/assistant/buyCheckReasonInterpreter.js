import {
  getClaraGeminiProxyModelCandidates,
  requestClaraGeminiProxyText,
} from "@/lib/clara-gemini-proxy-client";

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value = 0) {
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function normalizeReasonSummary(value = "", fallback = "") {
  const summary = clean(value)
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(?:summary|interpretation|reason)\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .replace(/\s*(?:did i understand that correctly\??|is that correct\??)$/i, "")
    .replace(/[?.!]+$/, "")
    .trim();

  return summary || clean(fallback).replace(/[?.!]+$/, "");
}

export async function interpretBuyCheckReason({
  item,
  price,
  originalReason,
  assistantContext,
}) {
  const fallback = normalizeReasonSummary(originalReason, originalReason);
  const profile =
    assistantContext?.meProfileContext ||
    assistantContext?.lifeProfile ||
    assistantContext?.user?.user_metadata ||
    null;
  const prompt = `You are CLARA interpreting one user's reason before a Buy Check confirmation.

Item: ${clean(item)}
Price: ${formatMoney(price)}
User's exact words: ${clean(originalReason)}
Profile context: ${profile ? JSON.stringify(profile) : "Not available"}

Rewrite the reason into one natural second-person clause that clearly shows what the user means. Preserve the exact meaning and urgency. Match the user's language, including Taglish. Do not repeat the sentence word-for-word unless it is already impossible to improve. Do not judge, advise, add facts, mention CLARA, mention the price, or ask a question. Return only the rewritten reason with no label or quotation marks.`;

  let lastError = null;
  for (const model of getClaraGeminiProxyModelCandidates()) {
    try {
      const reply = await requestClaraGeminiProxyText({
        prompt,
        model,
        generationConfig: {
          temperature: 0.35,
          topP: 0.82,
          maxOutputTokens: 120,
        },
      });
      const summary = normalizeReasonSummary(reply, "");
      if (summary) return { summary, source: "ai", model };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn("[CLARA Buy Check] Direct reason interpretation fallback used.", lastError);
  }
  return { summary: fallback, source: "fallback" };
}
