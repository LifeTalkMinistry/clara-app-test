import { requestGeminiJson } from "./clara-gemini-json-utils";
import {
  clarificationQuestion,
  confirmationText,
  needsPurchaseClarification,
} from "./clara-buy-check-conversation-copy.js";
import { clean, money } from "./clara-buy-check-budget-core.js";

const normalized = (value = "") => clean(value).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const rawEcho = (output = "", input = "") => {
  const out = normalized(output);
  const source = normalized(input);
  if (!out || !source) return false;
  if (source.length >= 10 && out.includes(source)) return true;
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length < 4) return out === source;
  const outWords = new Set(out.split(/\s+/).filter(Boolean));
  return words.filter((word) => outWords.has(word)).length / words.length >= 0.86;
};

function userName(context = {}) {
  return clean(context.userName || context.name || context.profile?.name || context.me?.name || context.lifeProfile?.name || context.user?.user_metadata?.full_name || context.user?.user_metadata?.name || "") || "the user";
}

function transcript(history = []) {
  const rows = (Array.isArray(history) ? history.slice(-10) : []).map((message) => {
    const text = clean(message?.text || message?.content || "");
    if (!text) return "";
    return `${message?.role === "user" ? "User" : "CLARA"}: ${text}`;
  }).filter(Boolean);
  return rows.length ? rows.join("\n") : "No earlier messages available.";
}

async function askJson(prompt, label, temperature = 0.3) {
  const { json } = await requestGeminiJson({
    feature: "ask-before-you-spend",
    prompt,
    label,
    temperature,
    maxOutputTokens: 360,
    timeoutMs: 10000,
  });
  return json || {};
}

function cleanReason(value = "", fallback = "") {
  const text = clean(value).replace(/^(?:reason|interpreted reason|summary)\s*:\s*/i, "").replace(/^['“”"]+|['“”"]+$/g, "").replace(/[?.!]+$/g, "").trim();
  return text && text.length <= 220 ? text : clean(fallback);
}

function naturalFallback({ item, price, reason, clarification }) {
  const purchase = clean(item || "this purchase");
  const why = clean(reason).toLowerCase();
  const detail = clean(clarification).toLowerCase();
  if (/replace|replacement/.test(why) && /ruin|ruined|broken|damage|damaged|worn|old/.test(detail)) {
    return `Got it — you’re replacing your current ${purchase.toLowerCase()} because it’s no longer in good condition. Want me to run the full Buy Check for ${money(price)}?`;
  }
  return `Got it — I understand the situation behind this ${purchase} purchase now. Want me to run the full Buy Check for ${money(price)}?`;
}

function conversationPrompt({ item, price, reason, clarification = "", history = [], assistantContext = {}, forceRewrite = false }) {
  return `You are CLARA, a conversational money coach speaking with ${userName(assistantContext)} inside Ask Before You Spend.

Recent conversation:
${transcript(history)}

Purchase facts:
Item: ${clean(item) || "Unknown"}
Price: ${money(price)}
Reason category or first answer: ${clean(reason) || "None"}
Follow-up answer: ${clean(clarification) || "None"}

Your job is to understand the user's meaning before the financial calculation. Do not decide affordability and do not mention budgets, wallets, risk, approval, or recommendation yet.

Conversation rules:
- Respond to meaning, not form fields.
- A vague word such as replacement, reward, health, work, hobby, school, or need is not enough by itself. Ask one tailored follow-up when needed.
- After a follow-up answer exists, do not ask another follow-up. Paraphrase what the user means and ask permission to run the full Buy Check.
- Correct awkward grammar naturally while preserving the same facts.
- Never paste the user's sentence back into your response or interpretedReason.
- Do not invent facts.
- Match the user's language style, including Taglish when appropriate.
- Keep the visible reply to one or two natural sentences.
${forceRewrite ? "- IMPORTANT: A previous draft copied the user's wording. This retry MUST use different natural wording while preserving exactly the same meaning." : ""}

Return ONLY valid JSON:
{"nextAction":"ask_followup"|"confirm","reply":"natural user-facing reply","interpretedReason":"natural paraphrase of the actual purpose"}`;
}

async function evaluateBuyCheckConversation({ item, price, reason, history = [], assistantContext = {} } = {}) {
  const fallbackNeedsClarification = needsPurchaseClarification(reason, item);
  try {
    let json = await askJson(conversationPrompt({ item, price, reason, history, assistantContext }), "CLARA Buy Check natural reason");
    let interpretedReason = cleanReason(json.interpretedReason, reason);
    let needsClarification = clean(json.nextAction).toLowerCase() === "ask_followup";

    if (!needsClarification && rawEcho(interpretedReason, reason) && clean(reason).split(/\s+/).length >= 4) {
      json = await askJson(conversationPrompt({ item, price, reason, history, assistantContext, forceRewrite: true }), "CLARA Buy Check reason paraphrase retry", 0.36);
      interpretedReason = cleanReason(json.interpretedReason, reason);
      needsClarification = clean(json.nextAction).toLowerCase() === "ask_followup";
    }

    return {
      needsClarification,
      question: needsClarification ? clean(json.reply) || clarificationQuestion(item, reason) : "",
      confirmation: needsClarification ? "" : clean(json.reply) || confirmationText({ item, price, reason: interpretedReason }),
      interpretedReason,
      source: "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Natural reason fallback used.", error);
    return {
      needsClarification: fallbackNeedsClarification,
      question: fallbackNeedsClarification ? clarificationQuestion(item, reason) : "",
      confirmation: fallbackNeedsClarification ? "" : confirmationText({ item, price, reason }),
      interpretedReason: clean(reason),
      source: "fallback",
    };
  }
}

async function confirmBuyCheckConversation({ item, price, reason, clarification, history = [], assistantContext = {} } = {}) {
  const raw = clean(clarification || reason);
  try {
    let json = await askJson(conversationPrompt({ item, price, reason, clarification, history, assistantContext }), "CLARA Buy Check natural confirmation");
    let reply = clean(json.reply);
    let interpretedReason = cleanReason(json.interpretedReason, clean([reason, clarification].filter(Boolean).join(" — ")));

    if (rawEcho(reply, raw) || rawEcho(interpretedReason, raw)) {
      json = await askJson(conversationPrompt({ item, price, reason, clarification, history, assistantContext, forceRewrite: true }), "CLARA Buy Check confirmation paraphrase retry", 0.38);
      reply = clean(json.reply);
      interpretedReason = cleanReason(json.interpretedReason, interpretedReason);
    }

    const stillEchoing = rawEcho(reply, raw) || rawEcho(interpretedReason, raw);
    return {
      confirmation: stillEchoing || !/\?\s*$/.test(reply) ? naturalFallback({ item, price, reason, clarification }) : reply,
      interpretedReason,
      source: stillEchoing ? "ai-copy-guard" : "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Natural confirmation fallback used.", error);
    return {
      confirmation: naturalFallback({ item, price, reason, clarification }),
      interpretedReason: clean([reason, clarification].filter(Boolean).join(" — ")),
      source: "fallback",
    };
  }
}

function coachPrompt({ stage, item, price, reason, history = [], assistantContext = {} }) {
  const tasks = {
    ask_price: `The user named ${clean(item)}. Ask naturally what it costs.`,
    invalid_price: `The last price was unclear. Ask for the amount again as a number.`,
    ask_reason: `The user wants ${clean(item)} for ${money(price)}. Ask what makes it important or worth considering right now.`,
    confirm_planned: `Confirm ${clean(item)} at ${money(price)} naturally and ask permission to run the full Buy Check.`,
    checking: `Say briefly that you have enough context and are checking the live money situation now.`,
  };
  return `You are CLARA speaking with ${userName(assistantContext)} inside Ask Before You Spend.\nRecent conversation:\n${transcript(history)}\nCurrent reason: ${clean(reason) || "None"}\nTask: ${tasks[stage] || "Reply naturally to the current conversation."}\nKeep it to one or two sentences. Do not reveal financial conclusions yet. Return ONLY JSON: {"reply":"natural reply"}`;
}

async function generateBuyCheckCoachReply({ stage, item, price, reason, history = [], assistantContext = {}, fallback = "" } = {}) {
  try {
    const json = await askJson(coachPrompt({ stage, item, price, reason, history, assistantContext }), `CLARA Buy Check live ${stage || "reply"}`, 0.38);
    const text = clean(json.reply);
    return { text: text || clean(fallback), source: text ? "ai" : "fallback" };
  } catch (error) {
    console.warn(`[CLARA Buy Check] Live ${stage || "reply"} fallback used.`, error);
    return { text: clean(fallback), source: "fallback" };
  }
}

export { evaluateBuyCheckConversation, confirmBuyCheckConversation, generateBuyCheckCoachReply };
