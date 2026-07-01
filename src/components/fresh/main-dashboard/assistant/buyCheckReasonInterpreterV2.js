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

function normalizeKnownProductCasing(value = "") {
  return clean(value)
    .replace(/\biphone\b/gi, "iPhone")
    .replace(/\bipad\b/gi, "iPad")
    .replace(/\bmacbook\b/gi, "MacBook")
    .replace(/\bairpods\b/gi, "AirPods");
}

function buildItemFallback(value = "") {
  const source = clean(value)
    .replace(/^(?:i\s+want\s+to\s+buy|i\s+want|i\s+need\s+to\s+buy|i\s+need|can\s+i\s+buy|please\s+buy|gusto\s+ko\s+(?:sanang\s+)?bumili\s+ng|gusto\s+ko|bibili\s+ako\s+ng|kailangan\s+ko\s+ng)\s+/i, "")
    .replace(/\s+(?:sir|ma'am|maam|po|please)$/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  return normalizeKnownProductCasing(source || value);
}

export function normalizeItemSummary(value = "", fallback = "") {
  const item = clean(value)
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(?:item|purchase|product|summary)\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  return normalizeKnownProductCasing(item || buildItemFallback(fallback));
}

function isUsableItemSummary(value = "") {
  const item = normalizeItemSummary(value, "");
  if (!item || item.length > 80 || item.split(/\s+/).length > 12) return false;
  if (/CLARA AI is unavailable/i.test(item)) return false;
  if (/\b(budget|wallet|remaining|available|covered|shortfall|risk|recommend)\b/i.test(item)) return false;
  return true;
}

export async function interpretBuyCheckItem({ originalItem }) {
  const fallback = buildItemFallback(originalItem);
  const prompt = `You are CLARA extracting the exact item a user wants to buy before a Buy Check.\n\nUser's exact words: ${clean(originalItem)}\n\nReturn only the item, product, service, or purchase name. Remove conversational phrases, greetings, honorifics, and filler words. Preserve important brand, model, size, quantity, or variant details. Correct obvious product capitalization such as iPhone. Do not add a reason, price, budget, wallet, advice, recommendation, label, punctuation, or quotation marks. Keep it concise.`;
  let lastError = null;
  for (const model of getClaraGeminiProxyModelCandidates()) {
    try {
      const reply = await requestClaraGeminiProxyText({
        prompt,
        model,
        generationConfig: { temperature: 0.1, topP: 0.75, maxOutputTokens: 60 },
      });
      const item = normalizeItemSummary(reply, "");
      if (isUsableItemSummary(item)) return { item, source: "ai", model };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) console.warn("[CLARA Buy Check] Item interpretation fallback used.", lastError);
  return { item: fallback, source: "fallback" };
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
  return (summary.match(/\(/g) || []).length === (summary.match(/\)/g) || []).length;
}

function completionRetryPrompt(originalPrompt, incompleteReply) {
  return `${originalPrompt}\n\nYour previous response was incomplete and must not be used:\n"${clean(incompleteReply)}"\n\nRewrite it again as one COMPLETE natural reason clause that can follow the word "because." Finish the thought with a concrete need, purpose, situation, or motivation. Do not end with a conjunction, article, or preposition. Return only the complete rewritten reason.`;
}

async function requestCompleteSummary({ prompt, model }) {
  const generationConfig = { temperature: 0.3, topP: 0.82, maxOutputTokens: 180 };
  const firstReply = await requestClaraGeminiProxyText({ prompt, model, generationConfig });
  if (isCompleteReasonSummary(firstReply)) return firstReply;
  const retryReply = await requestClaraGeminiProxyText({
    prompt: completionRetryPrompt(prompt, firstReply),
    model,
    generationConfig: { ...generationConfig, temperature: 0.2, maxOutputTokens: 220 },
  });
  return isCompleteReasonSummary(retryReply) ? retryReply : "";
}

export async function interpretBuyCheckReason({ item, price, originalReason, assistantContext }) {
  const fallback = normalizeReasonSummary(originalReason, originalReason);
  const profile = assistantContext?.meProfileContext || assistantContext?.lifeProfile || assistantContext?.user?.user_metadata || null;
  const prompt = `You are CLARA interpreting one user's reason before a Buy Check confirmation.\n\nItem: ${clean(item)}\nPrice: ${formatMoney(price)}\nUser's exact words: ${clean(originalReason)}\nProfile context: ${profile ? JSON.stringify(profile) : "Not available"}\n\nRewrite the reason into one complete, natural second-person clause that clearly shows what the user means and can grammatically follow the word "because." Preserve the exact meaning and urgency. Match the user's language, including Taglish. Do not repeat the sentence word-for-word unless it is already impossible to improve. Do not judge, advise, add facts, mention CLARA, mention the price, budget, wallet, coverage, or recommendation, and do not ask a question. Finish the thought completely. Return only the rewritten reason with no label or quotation marks.`;
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
  if (lastError) console.warn("[CLARA Buy Check] Complete reason interpretation fallback used.", lastError);
  return { summary: fallback, source: "fallback" };
}

export function buildBuyCheckConfirmationFallback({ item, price, reason = "" }) {
  const purchaseItem = normalizeItemSummary(item, "this item");
  const amount = formatMoney(price);
  const interpretedReason = normalizeReasonSummary(reason, "");
  return interpretedReason
    ? `So you’re considering ${purchaseItem} for ${amount} because ${interpretedReason}. Did I understand that correctly before I run the full Buy Check?`
    : `So you’re considering ${purchaseItem} for ${amount}. Did I understand that correctly before I run the full Buy Check?`;
}

function normalizeConfirmation(value = "", fallback = "") {
  const confirmation = clean(value)
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(?:confirmation|summary)\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .trim();
  return confirmation || clean(fallback);
}

function isUsableConfirmation(value, { item, price, reason = "" }) {
  const confirmation = normalizeConfirmation(value, "");
  const amount = formatMoney(price);
  const itemWords = normalizeItemSummary(item, "").toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  if (confirmation.length < 28 || confirmation.length > 320) return false;
  if (!confirmation.includes(amount)) return false;
  if (itemWords.length && !itemWords.some((word) => confirmation.toLowerCase().includes(word))) return false;
  if (reason && !/because|dahil|kasi/i.test(confirmation)) return false;
  if (/\b(budget|wallet|remaining|available|covered|shortfall|risk|recommend|approval)\b/i.test(confirmation)) return false;
  return /\?$/.test(confirmation);
}

export async function interpretBuyCheckConfirmation({ item, price, reason = "" }) {
  const fallback = buildBuyCheckConfirmationFallback({ item, price, reason });
  const prompt = `You are CLARA naturally confirming the user's answers before running a Buy Check.\n\nItem: ${normalizeItemSummary(item, item)}\nPrice: ${formatMoney(price)}\nInterpreted reason: ${normalizeReasonSummary(reason, "Not provided")}\n\nWrite one concise, warm confirmation in the user's likely language style. Mention the exact item and exact formatted price. Include the reason only when one is provided. End by asking whether you understood correctly before running the full Buy Check. Do not mention or imply any budget, wallet, balance, remaining amount, coverage, shortfall, risk, approval, recommendation, or financial result. Do not add facts or advice. Return only the confirmation with no label or quotation marks.`;
  let lastError = null;
  for (const model of getClaraGeminiProxyModelCandidates()) {
    try {
      const reply = await requestClaraGeminiProxyText({
        prompt,
        model,
        generationConfig: { temperature: 0.28, topP: 0.82, maxOutputTokens: 130 },
      });
      const confirmation = normalizeConfirmation(reply, "");
      if (isUsableConfirmation(confirmation, { item, price, reason })) {
        return { confirmation, source: "ai", model };
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) console.warn("[CLARA Buy Check] Confirmation interpretation fallback used.", lastError);
  return { confirmation: fallback, source: "fallback" };
}

function normalizeFinalExplanation(value = "", fallback = "") {
  const explanation = clean(value)
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(?:note|expense note|explanation)\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .trim();
  return explanation || clean(fallback);
}

export function buildFinalBuyExplanationFallback({ item, price, summarizedReason, recommendation, budget, budgetAssessment }) {
  const purchaseItem = clean(item || "this item");
  const reason = normalizeReasonSummary(summarizedReason, "I have decided that this purchase is still necessary").replace(/^because\s+/i, "");
  const decision = clean(recommendation || "").toUpperCase();
  const status = clean(budgetAssessment?.status || "");
  const sentences = [`I’m proceeding with this ${formatMoney(price)} ${purchaseItem} purchase because ${reason}.`];

  if (status === "full" && budget) {
    sentences.push(`It is covered by my ${clean(budget.title || "available")} budget${Number.isFinite(Number(budget.remainingAfter)) ? `, with ${formatMoney(budget.remainingAfter)} remaining afterward` : ""}.`);
  } else if (status === "partial" && budget) {
    sentences.push(`I understand it is ${formatMoney(budgetAssessment?.shortfall)} over my ${clean(budget.title || "matched")} budget.`);
  } else if (status === "wallet_shortfall") {
    sentences.push(`I understand my selected spendable wallet is short by ${formatMoney(budgetAssessment?.walletShortfall)}.`);
  } else if (["exhausted", "no_match"].includes(status)) {
    sentences.push("I understand this purchase is not currently covered by an available budget.");
  }

  if (decision && !["BUY", "BUY WITH CAP"].includes(decision)) {
    sentences.push(`I understand CLARA recommended ${decision}, but I have decided to continue.`);
  }
  return sentences.join(" ");
}

function isUsableFinalExplanation(value = "") {
  const explanation = normalizeFinalExplanation(value, "");
  if (explanation.length < 24 || explanation.split(/\s+/).length < 6) return false;
  if (/CLARA AI is unavailable/i.test(explanation)) return false;
  if (/[,:;\-–—]$/.test(explanation)) return false;
  return /[.!?]$/.test(explanation);
}

export async function interpretFinalBuyExplanation({ item, price, summarizedReason, recommendation, budget, budgetAssessment, assistantContext }) {
  const fallback = buildFinalBuyExplanationFallback({ item, price, summarizedReason, recommendation, budget, budgetAssessment });
  const profile = assistantContext?.meProfileContext || assistantContext?.lifeProfile || assistantContext?.user?.user_metadata || null;
  const prompt = `You are CLARA preparing an editable expense note after a user chooses Will buy.\n\nItem: ${clean(item)}\nPrice: ${formatMoney(price)}\nUser's interpreted reason: ${clean(summarizedReason)}\nCLARA recommendation: ${clean(recommendation || "Not available")}\nMatched budget: ${budget ? JSON.stringify(budget) : "None"}\nBudget assessment: ${budgetAssessment ? JSON.stringify(budgetAssessment) : "Not available"}\nProfile context: ${profile ? JSON.stringify(profile) : "Not available"}\n\nWrite a natural first-person expense note in one or two complete sentences. Preserve the user's reason exactly in meaning. Mention the price and item naturally. Include the budget result only when supported by the provided data. When CLARA recommended PAUSE, WAIT, or REDUCE and the user still chose to buy, acknowledge that decision calmly without scolding. Match the user's language, including Taglish. Do not invent a new reason, urgency, budget, wallet, or personal detail. Do not use a label, quotation marks, bullets, or advice. Return only the editable note.`;
  let lastError = null;
  for (const model of getClaraGeminiProxyModelCandidates()) {
    try {
      const reply = await requestClaraGeminiProxyText({ prompt, model, generationConfig: { temperature: 0.28, topP: 0.82, maxOutputTokens: 220 } });
      const explanation = normalizeFinalExplanation(reply, "");
      if (isUsableFinalExplanation(explanation)) return { explanation, source: "ai", model };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) console.warn("[CLARA Buy Check] Final expense note fallback used.", lastError);
  return { explanation: fallback, source: "fallback" };
}
