import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const CLARA_SAFE_EMOJIS = ["🙂", "✅", "⚠", "💡", "📌", "⏳"];

function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY || import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || import.meta.env.VITE_CLARA_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || "";
}

function getGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : []).slice(0, 5).map(formatter).filter(Boolean).join("; ") || empty;
}

function buildConversationHistory(messages = []) {
  const cleanMessages = (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.text && message.text !== "Reading your finance cards...")
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "CLARA"}: ${String(message.text).trim()}`);

  return cleanMessages.length ? cleanMessages.join("\n") : "No previous chat turns in this session.";
}

function buildPrompt({ message, context, mode, conversationHistory = [] }) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const decision = buildContextForGeminiPrompt({ message, financeContext: context || {} });
  const life = summarizeLifeProfileForClara(
    context?.lifeProfile || context?.profile?.lifeProfile || context?.profile || {}
  );

  const wallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const budgets = Array.isArray(finance.budgets) ? finance.budgets : [];
  const goals = Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [];

  return `You are CLARA, a private money buddy and behavioral spending coach.

FINAL CLARA CONVERSATION STYLE:
- Talk like a modern AI chat assistant: natural, aware of the previous messages, and responsive to what the user just said.
- Stay inside the current conversation context. If the user says "still", "that", "it", "the shoes", or pushes back, connect it to the previous turn.
- Never ask for information already stated in the recent chat history.
- Do not reset the conversation each message.
- Think WITH the user. Do not lecture, over-explain, or dump analysis.
- Be short, helpful, and conversational: 2-4 short sentences, usually under 55 words.
- Use one clear next step or one small question when useful.

PURCHASE COACHING STYLE:
- If this is a follow-up, continue the same decision instead of starting over.
- Use the current purchase amount from chat history when the user refers to the same item.
- Give a practical compromise before saying no.
- Use labels naturally: "I’d lean delay", "okay with a cap", "safe if planned", "not now".

IMPORTANT:
- The Life Profile below is REAL user profile context.
- Use it subtly. Do not recite every field.
- If profile context conflicts with chat history, prioritize current chat history for the immediate decision.

Recent conversation:
${buildConversationHistory(conversationHistory)}

Current user message: ${message}
Mode: ${mode || "normal_chat"}

Life Profile:
Age: ${life.age || "not set"}
Money personality: ${life.personality || "not set"}
Status: ${life.status || "not set"}
Dependents: ${life.dependents || "not set"}
Protect first: ${life.responsibility || "not set"}
Income rhythm: ${life.incomeRhythm || "not set"}
Guidance tone: ${life.coachingStyle || "not set"}
Current focus: ${life.currentFocus || "not set"}
Values: ${life.topValues || "not set"}
Protected goal: ${life.meaningfulGoal || "not set"}
Situation to avoid: ${life.financialFear || "not set"}
Spending trigger: ${life.spendingTrigger || "not set"}
Non-negotiable money: ${life.nonNegotiable || "not set"}
Future identity: ${life.identityStatement || "not set"}

Wallet truth:
Visible wallet money: ${money(finance.availableMoney)}
Wallets: ${list(wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`, finance.availableMoney !== null ? `Total visible money: ${money(finance.availableMoney)}` : "none loaded")}

Budget:
Allocated: ${money(finance.budgetAllocated)}
Spent: ${money(finance.budgetSpent)}
Left: ${money(finance.budgetRemaining)}
Rows: ${list(budgets, (budget) => `${budget.name || budget.category || "Budget"}: left ${money(budget.remaining)} of ${money(budget.allocated)}`)}

Savings:
${list(goals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`)}

Spending signal:
Monthly spent: ${money(finance.monthlySpent)}
Purchase amount detected from current message: ${money(decision.purchaseAmount)}
Emotional signal: ${yesNo(decision.purchaseSignals?.emotional)}

Emoji policy:
Use ONLY these emojis if needed: 🙂 ✅ ⚠ 💡 📌 ⏳

Reply as CLARA:`;
}

function normalizeEmojiForClara(text) {
  let clean = String(text || "")
    .replace(/\uFFFD/g, "")
    .replace(/💚|❤️|❤|♥/gu, "🙂")
    .replace(/🫶|🤍|💕|💖|💙|💜/gu, "🙂")
    .replace(/✨|⭐|🌟/gu, "💡")
    .replace(/🧠/gu, "💡")
    .replace(/🛡️|🛡/gu, "✅")
    .replace(/🚨|❗|‼️|‼/gu, "⚠")
    .replace(/⏰|⌛|⌚/gu, "⏳")
    .replace(/👉|➡️|➡/gu, "📌");

  const placeholders = new Map();
  CLARA_SAFE_EMOJIS.forEach((emoji, index) => {
    const token = `__CLARA_SAFE_EMOJI_${index}__`;
    placeholders.set(token, emoji);
    clean = clean.split(emoji).join(token);
  });

  clean = clean
    .replace(/\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?)*?/gu, "")
    .replace(/[\u200D\uFE0E\uFE0F]/g, "");

  placeholders.forEach((emoji, token) => {
    clean = clean.split(token).join(emoji);
  });

  return clean;
}

function sanitizeClaraReply(text) {
  return normalizeEmojiForClara(text)
    .replace(/\s+([.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeSupportDraft(text) {
  return normalizeEmojiForClara(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksIncompleteReply(text) {
  const clean = sanitizeClaraReply(text)
    .replace(/[🙂✅⚠💡📌⏳]/g, "")
    .trim();

  if (clean.length < 20) return true;

  return false;
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, conversationHistory = [], signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const model = getGeminiModel();

  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt({ message, context, mode, conversationHistory }) }] }],
      generationConfig: {
        temperature: 0.56,
        topP: 0.88,
        maxOutputTokens: 190
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const data = await response.json();

  const text = sanitizeClaraReply(
    (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || "")
      .join(" ")
  );

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  if (looksIncompleteReply(text)) {
    throw new Error(`Gemini returned an incomplete response: ${text}`);
  }

  return text;
}

export async function refineClaraSupportMessageWithGemini({ topic, message, userEmail = "", signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const cleanTopic = String(topic || "General concern").trim() || "General concern";
  const cleanMessage = String(message || "").trim();

  if (!cleanMessage) throw new Error("Support message is empty.");

  const model = getGeminiModel();
  const prompt = `You are CLARA's support message writing assistant.

Task:
Rewrite the user's raw concern into a clear, professional, email-ready support message for the CLARA team.

Rules:
- Do not invent technical details.
- Preserve the user's main issue.
- If the user sounds frustrated, make the tone calm and professional.
- If the message is short, make it clearer but do not overdo it.
- If the message is Taglish or casual, rewrite it in professional English.
- Format the output as an email body only.
- Include a concise subject-style topic line inside the body.
- Do not add markdown bullets unless useful for clarity.
- Do not mention Gemini, AI, or automation.

Support email recipient: CLARA Team
Selected topic: ${cleanTopic}
User email if needed: ${userEmail || "not provided"}
Raw user message:
${cleanMessage}

Return only the refined email body.`;

  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        topP: 0.82,
        maxOutputTokens: 360
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini support refine failed: ${response.status}`);
  }

  const data = await response.json();
  const text = sanitizeSupportDraft(
    (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || "")
      .join("\n")
  );

  if (!text || text.length < 30) {
    throw new Error("Gemini returned an incomplete support draft.");
  }

  return text;
}

function installSupportComposerGeminiBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSupportComposerGeminiBridgeInstalled) return;
  window.__claraSupportComposerGeminiBridgeInstalled = true;

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const findPage = (button) => {
    let current = button?.parentElement || null;
    while (current && current !== document.body) {
      if (current.querySelector?.("select") && current.querySelector?.("textarea")) return current;
      current = current.parentElement;
    }
    return null;
  };

  document.addEventListener(
    "click",
    async (event) => {
      const button = event.target?.closest?.("[data-clara-support-refine]");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const page = findPage(button);
      const panel = button.closest?.("[data-clara-support-composer='true']");
      const select = page?.querySelector("select");
      const input = page?.querySelector("label textarea:not([readonly])") || page?.querySelector("textarea:not([readonly])");
      const outputWrap = panel?.querySelector(".clara-support-refined-box");
      const output = panel?.querySelector("[data-clara-support-output]");
      const copyButton = panel?.querySelector("[data-clara-support-copy]");
      const helper = panel?.querySelector(".clara-support-helper");
      const emailLink = panel?.querySelector("[data-clara-support-email]");
      const rawMessage = clean(input?.value);

      if (!rawMessage) {
        if (helper) helper.textContent = "Write your concern or feedback first, then click Refine with AI.";
        input?.focus();
        return;
      }

      const originalLabel = button.textContent || "Refine with AI";
      button.textContent = "Refining...";
      button.disabled = true;
      if (copyButton) copyButton.disabled = true;
      if (helper) helper.textContent = "CLARA AI is refining your message...";

      try {
        const refined = await refineClaraSupportMessageWithGemini({
          topic: select?.value || "Feedback & ideas",
          message: rawMessage
        });

        if (output) output.value = refined;
        if (outputWrap) outputWrap.hidden = false;
        if (copyButton) copyButton.disabled = false;
        if (emailLink) {
          emailLink.href = `mailto:claraprogram2026@gmail.com?subject=${encodeURIComponent(`CLARA ${select?.value || "Feedback"}`)}&body=${encodeURIComponent(refined)}`;
        }
        if (helper) helper.textContent = "Message refined by CLARA AI. Copy it, then paste it into the support email below.";
      } catch (error) {
        console.warn("CLARA support Gemini refine failed:", error);
        if (helper) helper.textContent = "AI refine failed. Check the Gemini setup or network, then try again.";
      } finally {
        button.textContent = originalLabel;
        button.disabled = false;
      }
    },
    true
  );
}

installSupportComposerGeminiBridge();
