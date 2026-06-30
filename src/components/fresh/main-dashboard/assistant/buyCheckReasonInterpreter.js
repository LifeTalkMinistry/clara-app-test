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

function isCompleteReasonSummary(value = "") {
  const summary = normalizeReasonSummary(value, "");
  if (!summary || summary.length < 16 || summary.split(/\s+/).length < 4) return false;
  if (/CLARA AI is unavailable/i.test(summary)) return false;
  if (/[,:;\-–—]$/.test(clean(value))) return false;
  if (/\b(and|but|because|so|while|with|for|to|if|unless|before|after|about|around|from|of|the|a|an|your|my|their|this|that)$/i.test(summary)) return false;
  const openParentheses = (summary.match(/\(/g) || []).length;
  const closeParentheses = (summary.match(/\)/g) || []).length;
  return openParentheses === closeParentheses;
}

function completionRetryPrompt(originalPrompt, incompleteReply) {
  return `${originalPrompt}

Your previous response was incomplete and must not be used:
"${clean(incompleteReply)}"

Rewrite it again as one COMPLETE natural reason clause that can follow the word "because." Finish the thought with a concrete need, purpose, situation, or motivation. Do not end with a conjunction, article, or preposition. Return only the complete rewritten reason.`;
}

async function requestCompleteSummary({ prompt, model }) {
  const generationConfig = {
    temperature: 0.3,
    topP: 0.82,
    maxOutputTokens: 180,
  };
  const firstReply = await requestClaraGeminiProxyText({
    prompt,
    model,
    generationConfig,
  });
  if (isCompleteReasonSummary(firstReply)) return firstReply;

  const retryReply = await requestClaraGeminiProxyText({
    prompt: completionRetryPrompt(prompt, firstReply),
    model,
    generationConfig: {
      ...generationConfig,
      temperature: 0.2,
      maxOutputTokens: 220,
    },
  });
  return isCompleteReasonSummary(retryReply) ? retryReply : "";
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

Rewrite the reason into one complete, natural second-person clause that clearly shows what the user means and can grammatically follow the word "because." Preserve the exact meaning and urgency. Match the user's language, including Taglish. Do not repeat the sentence word-for-word unless it is already impossible to improve. Do not judge, advise, add facts, mention CLARA, mention the price, or ask a question. Finish the thought completely. Return only the rewritten reason with no label or quotation marks.`;

  let lastError = null;
  for (const model of getClaraGeminiProxyModelCandidates()) {
    try {
      const reply = await requestCompleteSummary({ prompt, model });
      const summary = normalizeReasonSummary(reply, "");
      if (summary) return { summary, source: "ai", model };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn("[CLARA Buy Check] Complete reason interpretation fallback used.", lastError);
  }
  return { summary: fallback, source: "fallback" };
}
