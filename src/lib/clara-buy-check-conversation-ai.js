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

function safeCoachReply(value = "", fallback = "") {
  const text = clean(value)
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^reply\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .trim();

  if (!text || text.length < 3 || text.length > 280) return clean(fallback);
  if (/^\s*[\[{]/.test(text)) return clean(fallback);
  return text;
}

function userNameFromContext(context = {}) {
  return clean(
    context.userName ||
      context.name ||
      context.profile?.name ||
      context.me?.name ||
      context.lifeProfile?.name ||
      context.user?.user_metadata?.full_name ||
      context.user?.user_metadata?.name ||
      ""
  );
}

function buildConversationPrompt({ item, price, reason, clarification = "", assistantContext = {}, mode = "reason" } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const hasClarification = Boolean(clean(clarification));

  return `You are CLARA, a calm and practical personal money coach.
You are speaking with ${userName} inside Ask Before You Spend.

Role:
- You are not diagnosing affordability yet.
- You are not deciding buy or do not buy yet.
- Your only job in this stage is to understand the purchase purpose like a real coach.
- Ask at most ONE clarification question in the whole pre-check conversation.
- Keep everything short, natural, and mobile-friendly.
- Do not lecture. Do not mention reports, dashboards, scores, friction rules, or memory.
- Sound like an actual conversation, not a form or scripted questionnaire.

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

function buildCoachTurnPrompt({ stage, item, price, reason, assistantContext = {} } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const purchaseItem = clean(item) || "the item";
  const formattedPrice = price ? money(price) : "not provided yet";

  const stageInstructions = {
    ask_price: `The user has just told you the item: ${purchaseItem}. Ask for the price in one natural sentence. Do not ask anything else yet.`,
    invalid_price: `The user entered something that could not be read as a valid price for ${purchaseItem}. Briefly ask them to send the amount again as a number.`,
    ask_reason: `The user wants ${purchaseItem} for ${formattedPrice}. Ask why they want or need it. Ask only one short natural question. Do not give a list of canned categories unless it genuinely helps.`,
    confirm_planned: `The user wants ${purchaseItem} for ${formattedPrice}, and the app has already confirmed this purchase maps to an existing budget. Confirm the item and exact price and ask whether you understood correctly before running the full Buy Check. Do not reveal budget results yet.`,
    edit_reason: `The user said your summary was not correct. Ask them for the corrected reason for buying ${purchaseItem}.`,
    edit_amount: `The user wants to change the price for ${purchaseItem}. Ask for the new amount only.`,
    checking: `The user confirmed the purchase details for ${purchaseItem} at ${formattedPrice}. Tell them briefly that you are checking their live money context now.`,
  };

  return `You are CLARA, the conversational AI inside Ask Before You Spend.
You are speaking with ${userName}.

Current purchase:
Item: ${purchaseItem}
Price: ${formattedPrice}
Reason: ${clean(reason) || "not provided"}

Your task for this turn:
${stageInstructions[stage] || "Reply naturally and briefly based only on the current purchase context."}

Rules:
- This reply is shown directly to the user, so sound human and conversational.
- Match the user's likely language style; Taglish is okay when appropriate.
- Keep it to one or two short sentences.
- Do not say you are an API, model, Gemini, or automated system.
- Do not invent personal facts.
- Do not reveal affordability, budget, wallet, risk, or recommendation before the full Buy Check.
- Do not use labels, bullets, markdown, or quotation marks.

Return ONLY valid JSON in this exact shape:
{"reply":"your natural reply"}`;
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

async function generateBuyCheckCoachReply({
  stage,
  item,
  price,
  reason,
  assistantContext = {},
  fallback = "",
} = {}) {
  try {
    const { json } = await requestGeminiJson({
      prompt: buildCoachTurnPrompt({ stage, item, price, reason, assistantContext }),
      temperature: 0.34,
      maxOutputTokens: 180,
      timeoutMs: 9000,
      label: `CLARA Buy Check live ${stage || "reply"}`,
    });

    return {
      text: safeCoachReply(json?.reply, fallback),
      source: "ai",
    };
  } catch (error) {
    console.warn(`[CLARA Buy Check] Live ${stage || "reply"} fallback used.`, error);
    return {
      text: clean(fallback),
      source: "fallback",
    };
  }
}

export {
  evaluateBuyCheckConversation,
  confirmBuyCheckConversation,
  generateBuyCheckCoachReply,
};
