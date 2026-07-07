import { requestGeminiJson } from "./clara-gemini-json-utils";
import {
  clarificationQuestion,
  confirmationText,
  needsPurchaseClarification,
} from "./clara-buy-check-conversation-copy.js";
import { clean, money } from "./clara-buy-check-budget-core.js";

function safeBoolean(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function safeQuestion(value = "", item = "", reason = "") {
  const text = clean(value);
  if (text && text.length <= 160 && text.endsWith("?")) return text;
  return clarificationQuestion(item, reason);
}

function safeConfirmation(value = "", flow = {}) {
  const text = clean(value);
  if (text && text.length <= 260 && /\?\s*$/.test(text)) return text;
  return confirmationText(flow);
}

function userNameFromContext(context = {}) {
  return clean(
    context.userName ||
      context.name ||
      context.profile?.name ||
      context.me?.name ||
      context.lifeProfile?.name ||
      ""
  );
}

function buildConversationPrompt({ item, price, reason, clarification = "", assistantContext = {}, mode = "reason" } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const hasClarification = Boolean(clean(clarification));

  return `You are CLARA, a calm and practical personal money coach.
You are speaking with ${userName} inside Buy Check.

Role:
- You are not diagnosing affordability yet.
- You are not deciding buy or do not buy yet.
- Your only job in this stage is to understand the purchase purpose like a real coach.
- Ask at most ONE clarification question in the whole pre-check conversation.
- Keep everything short, natural, and mobile-friendly.
- Do not lecture. Do not mention reports, dashboards, scores, friction rules, or memory.

Purchase so far:
Item: ${clean(item) || "Unknown"}
Price: ${money(price)}
Reason: ${clean(reason) || "None provided"}
Clarification already provided: ${hasClarification ? clean(clarification) : "None"}

Decision rules:
- If the reason is clear and practical, do not ask another question.
- Clear practical reasons include replacement, work, school, health, family, gift with recipient/occasion, repair, daily use, required, damaged, broken, important event, or planned purchase.
- If the reason is vague, emotional, reward-based, or incomplete, ask exactly one short follow-up question.
- If a clarification is already provided, do not ask another question. Create a short confirmation summary.

Return ONLY valid JSON.
For ${mode === "clarification" ? "clarification-answer mode" : "reason mode"}, use this schema:
{
  "needsClarification": false,
  "question": "",
  "confirmation": "So you're planning to buy ... Did I understand that correctly before I run the full Buy Check?"
}

If clarification is needed, use:
{
  "needsClarification": true,
  "question": "Who is the gift for?",
  "confirmation": ""
}`;
}

async function evaluateBuyCheckConversation({ item, price, reason, assistantContext = {} } = {}) {
  const fallbackNeedsClarification = needsPurchaseClarification(reason, item);

  try {
    const { json } = await requestGeminiJson({
      prompt: buildConversationPrompt({ item, price, reason, assistantContext, mode: "reason" }),
      temperature: 0.12,
      maxOutputTokens: 260,
      timeoutMs: 9000,
      label: "CLARA Buy Check conversation AI",
    });

    const needsClarification = safeBoolean(json?.needsClarification);
    return {
      needsClarification,
      question: needsClarification ? safeQuestion(json?.question, item, reason) : "",
      confirmation: needsClarification ? "" : safeConfirmation(json?.confirmation, { item, price, reason }),
      source: "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Conversation AI fallback used.", error);
    return {
      needsClarification: fallbackNeedsClarification,
      question: fallbackNeedsClarification ? clarificationQuestion(item, reason) : "",
      confirmation: fallbackNeedsClarification ? "" : confirmationText({ item, price, reason }),
      source: "fallback",
    };
  }
}

async function confirmBuyCheckConversation({ item, price, reason, clarification, assistantContext = {} } = {}) {
  const flow = {
    item,
    price,
    reason,
    clarification,
    followUpAnswer: clarification,
    purchaseContext: clarification,
  };

  try {
    const { json } = await requestGeminiJson({
      prompt: buildConversationPrompt({ item, price, reason, clarification, assistantContext, mode: "clarification" }),
      temperature: 0.12,
      maxOutputTokens: 260,
      timeoutMs: 9000,
      label: "CLARA Buy Check confirmation AI",
    });

    return {
      confirmation: safeConfirmation(json?.confirmation, flow),
      source: "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Confirmation AI fallback used.", error);
    return {
      confirmation: confirmationText(flow),
      source: "fallback",
    };
  }
}

export { evaluateBuyCheckConversation, confirmBuyCheckConversation };
