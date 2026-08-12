import { requestGeminiJson } from "./clara-gemini-json-utils";
import {
  clarificationQuestion,
  confirmationText,
  needsPurchaseClarification,
} from "./clara-buy-check-conversation-copy.js";
import { clean, money } from "./clara-buy-check-budget-core.js";

function safeQuestion(value = "", item = "", reason = "") {
  const text = clean(value);
  if (text && text.length <= 220 && text.endsWith("?")) return text;
  return clarificationQuestion(item, reason);
}

function safeConfirmation(value = "", flow = {}) {
  const text = clean(value);
  if (text && text.length <= 340 && /\?\s*$/.test(text)) return text;
  return confirmationText(flow);
}

function safeCoachReply(value = "", fallback = "") {
  const text = clean(value)
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^reply\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .trim();

  if (!text || text.length < 3 || text.length > 340) return clean(fallback);
  if (/^\s*[\[{]/.test(text)) return clean(fallback);
  return text;
}

function safeInterpretedReason(value = "", fallback = "") {
  const text = clean(value)
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(?:reason|interpreted reason|summary)\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .replace(/[?.!]+$/g, "")
    .trim();

  if (!text || text.length > 220) return clean(fallback);
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

function conversationTranscript(history = []) {
  const messages = Array.isArray(history) ? history.slice(-10) : [];
  const lines = messages
    .map((message) => {
      const text = clean(message?.text || message?.content || "");
      if (!text) return "";
      const speaker = message?.role === "user" ? "User" : "CLARA";
      return `${speaker}: ${text}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "No earlier messages available.";
}

function buildConversationPrompt({
  item,
  price,
  reason,
  clarification = "",
  history = [],
  assistantContext = {},
  mode = "reason",
} = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const hasClarification = Boolean(clean(clarification));

  return `You are CLARA, the live conversational AI inside Ask Before You Spend.
You are speaking with ${userName}.

This is a real coaching conversation, not a form. Read the whole recent exchange and respond to the meaning of what the user said.

Recent conversation:
${conversationTranscript(history)}

Current purchase facts:
Item: ${clean(item) || "Unknown"}
Price: ${money(price)}
User's reason: ${clean(reason) || "None provided"}
User's follow-up clarification: ${hasClarification ? clean(clarification) : "None"}

Your job before the financial check:
- Understand WHY this purchase matters now.
- Do not judge affordability yet and do not reveal any budget, wallet, risk, approval, recommendation, or money result.
- Do not mechanically restate fields such as "because replacement" or "because health".
- Generic category words by themselves are NOT enough context. Examples: replacement, reward, work, health, hobby, school, need, planned, or "I want it".
- If the user only gives a category word or vague phrase, ask ONE useful, tailored follow-up that helps reveal the concrete situation. Example: for "replacement" shoes, ask what is wrong with the current pair or why it needs replacing now.
- If the user already gave concrete context, do not interrogate them. Reflect the meaning naturally and move toward the Buy Check.
- If a follow-up clarification has already been provided, do not ask another clarification. Construct a natural understanding from both answers.
- Match the user's language style. Taglish is welcome when that is how they speak.
- Keep the reply concise and mobile-friendly, usually one or two sentences.

For this ${mode === "clarification" ? "clarification-answer" : "reason"} turn, return ONLY valid JSON in this exact shape:
{
  "nextAction": "ask_followup" | "confirm",
  "reply": "the exact natural message CLARA should show next",
  "interpretedReason": "a concise natural description of the actual purpose, without inventing facts"
}

Rules for nextAction:
- Use "ask_followup" only when one concrete detail is still needed and no clarification has already been supplied.
- Use "confirm" when enough context is available, or whenever a clarification has already been supplied.
- A confirm reply must naturally summarize what you understood and end by asking whether CLARA should run the full Buy Check.
- Never output a template like "You are considering ITEM for PRICE because REASON." Rewrite the meaning conversationally.`;
}

function buildCoachTurnPrompt({ stage, item, price, reason, history = [], assistantContext = {} } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const purchaseItem = clean(item) || "the item";
  const formattedPrice = price ? money(price) : "not provided yet";

  const stageInstructions = {
    ask_price: `The user just named ${purchaseItem}. Respond naturally and ask what it costs. Do not ask anything else yet.`,
    invalid_price: `The last price could not be read as a valid amount for ${purchaseItem}. Briefly ask for the amount again in a clearer way.`,
    ask_reason: `The user wants ${purchaseItem} for ${formattedPrice}. Ask what makes this purchase important or worth considering right now. Do not offer a canned list of categories.`,
    confirm_planned: `The user wants ${purchaseItem} for ${formattedPrice}, and the app already knows it maps to an existing budget. Confirm the item and price naturally and ask permission to run the full Buy Check. Do not reveal any budget result yet.`,
    edit_reason: `The user said your understanding was not right. Ask naturally for the corrected reason for ${purchaseItem}.`,
    edit_amount: `The user wants to change the price for ${purchaseItem}. Ask naturally for the new amount only.`,
    checking: `The user confirmed the purchase details for ${purchaseItem} at ${formattedPrice}. Tell them briefly that you have enough context and are checking their live money situation now.`,
  };

  return `You are CLARA, the conversational AI inside Ask Before You Spend.
You are speaking with ${userName}.

Recent conversation:
${conversationTranscript(history)}

Current purchase:
Item: ${purchaseItem}
Price: ${formattedPrice}
Reason: ${clean(reason) || "not provided"}

Your task for this turn:
${stageInstructions[stage] || "Reply naturally and briefly based on the actual conversation."}

Rules:
- Respond to the user's actual wording and context, not a scripted form slot.
- Match their likely language style; Taglish is okay when appropriate.
- Keep it to one or two short sentences.
- Do not say you are an API, model, Gemini, or automated system.
- Do not invent personal facts.
- Do not reveal affordability, budget, wallet, risk, approval, or recommendation before the full Buy Check.
- Do not use labels, bullets, markdown, or quotation marks.

Return ONLY valid JSON in this exact shape:
{"reply":"your natural reply"}`;
}

async function evaluateBuyCheckConversation({ item, price, reason, history = [], assistantContext = {} } = {}) {
  const fallbackNeedsClarification = needsPurchaseClarification(reason, item);

  try {
    const { json } = await requestGeminiJson({
      prompt: buildConversationPrompt({ item, price, reason, history, assistantContext, mode: "reason" }),
      temperature: 0.28,
      maxOutputTokens: 320,
      timeoutMs: 10000,
      label: "CLARA Buy Check conversation AI",
    });

    const nextAction = clean(json?.nextAction).toLowerCase();
    const needsClarification = nextAction === "ask_followup";
    const interpretedReason = safeInterpretedReason(json?.interpretedReason, reason);

    return {
      needsClarification,
      question: needsClarification ? safeQuestion(json?.reply, item, reason) : "",
      confirmation: needsClarification
        ? ""
        : safeConfirmation(json?.reply, { item, price, reason: interpretedReason || reason }),
      interpretedReason,
      source: "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Conversation AI fallback used.", error);
    return {
      needsClarification: fallbackNeedsClarification,
      question: fallbackNeedsClarification ? clarificationQuestion(item, reason) : "",
      confirmation: fallbackNeedsClarification ? "" : confirmationText({ item, price, reason }),
      interpretedReason: clean(reason),
      source: "fallback",
    };
  }
}

async function confirmBuyCheckConversation({
  item,
  price,
  reason,
  clarification,
  history = [],
  assistantContext = {},
} = {}) {
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
      prompt: buildConversationPrompt({
        item,
        price,
        reason,
        clarification,
        history,
        assistantContext,
        mode: "clarification",
      }),
      temperature: 0.28,
      maxOutputTokens: 320,
      timeoutMs: 10000,
      label: "CLARA Buy Check confirmation AI",
    });

    const interpretedReason = safeInterpretedReason(
      json?.interpretedReason,
      clean([reason, clarification].filter(Boolean).join(" — ")),
    );

    return {
      confirmation: safeConfirmation(json?.reply, { ...flow, reason: interpretedReason || reason }),
      interpretedReason,
      source: "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Confirmation AI fallback used.", error);
    return {
      confirmation: confirmationText(flow),
      interpretedReason: clean([reason, clarification].filter(Boolean).join(" — ")),
      source: "fallback",
    };
  }
}

async function generateBuyCheckCoachReply({
  stage,
  item,
  price,
  reason,
  history = [],
  assistantContext = {},
  fallback = "",
} = {}) {
  try {
    const { json } = await requestGeminiJson({
      prompt: buildCoachTurnPrompt({ stage, item, price, reason, history, assistantContext }),
      temperature: 0.38,
      maxOutputTokens: 200,
      timeoutMs: 10000,
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
