import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_GEMINI_MODELS = [DEFAULT_GEMINI_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"];
const CLARA_SAFE_EMOJIS = ["🙂", "✅", "⚠", "💡", "📌", "⏳"];

function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_API_KEY || import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY || import.meta.env.VITE_CLARA_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY || "";
}

function getGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || import.meta.env.VITE_CLARA_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function getGeminiModelCandidates() {
  return [getGeminiModel(), ...FALLBACK_GEMINI_MODELS]
    .map((model) => String(model || "").trim())
    .filter(Boolean)
    .filter((model, index, models) => models.indexOf(model) === index);
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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[₱,]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractUserFacingMessage(message = "") {
  const raw = String(message || "").trim();
  if (!raw) return "";

  const currentUserMessage = raw.match(/Current user message:\s*([\s\S]*?)(?:\nMode:|\n\n|$)/i);
  if (currentUserMessage?.[1]) return currentUserMessage[1].trim();

  const userLines = [...raw.matchAll(/(?:^|\n)User:\s*(.+)/gi)];
  if (userLines.length) return String(userLines[userLines.length - 1]?.[1] || "").trim();

  return raw;
}

function extractCommandAmount(text = "") {
  const userText = extractUserFacingMessage(text);
  const match = userText.replace(/,/g, "").match(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i);
  const amount = Number(match?.[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function getWalletName(wallet = {}) {
  return String(wallet.name || wallet.wallet_name || wallet.title || wallet.label || wallet.type || "Wallet").trim();
}

function getWalletBalance(wallet = {}) {
  const amount = Number(
    wallet.derived_balance ??
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0
  );

  return Number.isFinite(amount) ? amount : 0;
}

function findWalletByLooseName(wallets = [], name = "") {
  const requested = normalizeText(name);
  if (!requested) return null;

  return (
    wallets.find((wallet) => normalizeText(getWalletName(wallet)) === requested) ||
    wallets.find((wallet) => normalizeText(getWalletName(wallet)).includes(requested)) ||
    wallets.find((wallet) => requested.includes(normalizeText(getWalletName(wallet)))) ||
    null
  );
}

function getTransferWallets(context = {}) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const financeWallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const rawWallets = Array.isArray(context?.wallets) ? context.wallets : [];
  const wallets = financeWallets.length ? financeWallets : rawWallets;

  return wallets
    .map((wallet) => ({
      ...wallet,
      name: getWalletName(wallet),
      balance: getWalletBalance(wallet),
    }))
    .filter((wallet) => wallet.name);
}

function cleanTransferWalletName(value = "") {
  return String(value || "")
    .replace(/[“”"']/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/^\s*(wallet|account)\s+/i, "")
    .replace(/\s+(wallet|account)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTransferRoute(text = "") {
  const rawUserText = extractUserFacingMessage(text);
  const raw = rawUserText.split("\n")[0].trim().slice(0, 220);

  if (!/\b(transfer|move|send)\b/i.test(raw)) {
    return { fromName: "", toName: "" };
  }

  const explicit = raw.match(/\b(?:transfer|move|send)(?:\s+(?:money|funds|balance))?(?:\s+(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)?\s+from\s+(.+?)\s+(?:to|into)\s+(.+?)(?:[.!?]|$)/i);
  if (explicit) {
    return {
      fromName: cleanTransferWalletName(explicit[1]),
      toName: cleanTransferWalletName(explicit[2]),
    };
  }

  const fromDash = raw.match(/\bfrom\s+(.+?)\s*[-–—>]+\s*(.+?)(?:[.!?]|$)/i);
  if (fromDash) {
    return {
      fromName: cleanTransferWalletName(fromDash[1]),
      toName: cleanTransferWalletName(fromDash[2]),
    };
  }

  const shortDash = raw.match(/\b(?:transfer|move|send)(?:\s+(?:money|funds|balance))?(?:\s+(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)?\s+(.+?)\s*[-–—>]+\s*(.+?)(?:[.!?]|$)/i);
  if (shortDash) {
    const fromName = cleanTransferWalletName(shortDash[1]);
    const toName = cleanTransferWalletName(shortDash[2]);

    if (!/\b(help|can|you|please|money|funds|balance|transfer|move|send)\b/i.test(fromName)) {
      return { fromName, toName };
    }
  }

  return { fromName: "", toName: "" };
}

function isTransferIntent(message = "") {
  const text = normalizeText(extractUserFacingMessage(message));
  if (!text) return false;

  return (
    /\b(transfer|move|send)\b/.test(text) &&
    /\b(money|funds|balance|wallet|cash|gcash|maya|from|to|into)\b/.test(text)
  );
}

function buildTransferGuidanceReply({ message, context = {} } = {}) {
  const raw = extractUserFacingMessage(message);
  if (!isTransferIntent(raw)) return null;

  const wallets = getTransferWallets(context);
  const walletList = wallets.length
    ? wallets.slice(0, 6).map((wallet) => `${wallet.name} (${money(wallet.balance)})`).join(", ")
    : "no visible wallets loaded yet";
  const amount = extractCommandAmount(raw);
  const { fromName, toName } = extractTransferRoute(raw);
  const fromWallet = findWalletByLooseName(wallets, fromName);
  const toWallet = findWalletByLooseName(wallets, toName);

  if (!wallets.length) {
    return "I can help with a wallet transfer, but I can’t see your wallet list yet. Open or refresh Wallets first, then tell me the amount, source wallet, and destination wallet.";
  }

  if (!amount && !fromName && !toName) {
    return `Yes — I can help you transfer money between wallets. Tell me the amount, source wallet, and destination wallet. Example: “Transfer ₱500 from Cash to GCash.” Visible wallets: ${walletList}.`;
  }

  if (!amount && (fromName || toName)) {
    const routeText = fromWallet && toWallet
      ? `from ${fromWallet.name} to ${toWallet.name}`
      : `from “${fromName || "source wallet"}” to “${toName || "destination wallet"}”`;

    return `Got it — you want to move money ${routeText}. How much should I transfer? Visible wallets: ${walletList}.`;
  }

  if (amount && (!fromName || !toName)) {
    return `Got the amount: ${money(amount)}. Now tell me the source and destination wallet. Example: “from Cash to GCash.” Visible wallets: ${walletList}.`;
  }

  if (!fromWallet || !toWallet) {
    const missing = !fromWallet && !toWallet
      ? `“${fromName}” and “${toName}”`
      : !fromWallet
        ? `“${fromName}”`
        : `“${toName}”`;

    return `I understand the transfer, but I can’t match ${missing} to your wallet names. Use the exact wallet name. Visible wallets: ${walletList}.`;
  }

  if (fromWallet.name === toWallet.name) {
    return `That’s the same wallet. Choose two different wallets. Visible wallets: ${walletList}.`;
  }

  if (fromWallet.balance < amount) {
    return `${fromWallet.name} only has ${money(fromWallet.balance)}, so ${money(amount)} cannot be transferred from there. Pick a smaller amount or another source wallet.`;
  }

  return `Ready to prepare this transfer: ${money(amount)} from ${fromWallet.name} to ${toWallet.name}. This is not an expense; it only moves balance between wallets. ${fromWallet.name} would become ${money(fromWallet.balance - amount)}, and ${toWallet.name} would become ${money(toWallet.balance + amount)}.`;
}

function buildConversationHistory(messages = []) {
  const cleanMessages = (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.text && message.text !== "Reading your finance cards..." && message.text !== "Checking your real finance context...")
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
  const transferAnalysis = buildTransferGuidanceReply({ message, context });

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
- Be short, helpful, and conversational: 2-4 short sentences, usually under 70 words.
- Use one clear next step or one small question when useful.

PURCHASE COACHING STYLE:
- If this is a follow-up, continue the same decision instead of starting over.
- Use the current purchase amount from chat history when the user refers to the same item.
- Give a practical compromise before saying no.
- Use labels naturally: "I’d lean delay", "okay with a cap", "safe if planned", "not now".

WALLET ACTION STYLE:
- If the user wants to transfer, move, or send money between wallets, treat it as a wallet transfer, not a purchase.
- For transfer help, NEVER reply only with vague lines like "Okay, I can help with that" or "Sure, tell me more." That is not enough.
- If visible wallet data exists, immediately mention the visible wallet names and balances in a compact way.
- If the amount is missing, ask for the amount AND show the available source/destination wallet choices.
- If the source wallet is missing, ask which wallet the money should come from and show visible wallet choices.
- If the destination wallet is missing, ask which wallet should receive the money and show visible wallet choices.
- If the user only says "help me transfer money", respond with a guided next step: show wallets, then ask how much and from which wallet to which wallet.
- Keep the response natural, but use the real wallet context right away so CLARA feels financially aware.
- Never give a generic purchase/budget warning for a wallet transfer.
- The local action analysis below is PRIVATE CONTEXT only. Use it to guide your reply, but rewrite it naturally. You are still the final responder.

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

Local action analysis:
${transferAnalysis || "No wallet transfer intent detected by local analysis."}

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

function isGenericTransferReply(text = "") {
  const clean = normalizeText(text);
  if (!clean) return true;

  return (
    clean.length < 55 ||
    /^(okay|ok|sure|yes|got it|alright)\b.*\b(help|assist|transfer)\b/.test(clean) ||
    /\b(can help with that|help with that|assist you with that|what would you like to do)\b/.test(clean)
  );
}

function getGeminiErrorMessage(payload, response) {
  return payload?.error?.message || response?.statusText || "Gemini request failed.";
}

function shouldRetryWithNextModel(error) {
  const message = String(error?.message || error?.geminiMessage || "").toLowerCase();
  if (message.includes("api key") || message.includes("permission denied") || message.includes("quota")) return false;
  return [400, 404].includes(Number(error?.status)) && (
    message.includes("model") ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("deprecated") ||
    message.includes("invalid")
  );
}

async function requestGeminiContent({ apiKey, model, prompt, signal, logContext }) {
  console.info("[CLARA AI] Gemini request started", {
    model,
    mode: logContext?.mode || "normal_chat",
    hasMessage: Boolean(logContext?.message),
    hasContext: Boolean(logContext?.context),
    historyCount: logContext?.historyCount || 0,
  });

  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.56,
        topP: 0.88,
        maxOutputTokens: 220
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const geminiMessage = getGeminiErrorMessage(data, response);
    console.error("[CLARA AI] Gemini request failed", {
      status: response.status,
      model,
      message: geminiMessage,
      payload: data,
    });

    const error = new Error(`Gemini request failed (${response.status}): ${geminiMessage}`);
    error.status = response.status;
    error.geminiMessage = geminiMessage;
    error.payload = data;
    error.model = model;
    throw error;
  }

  console.info("[CLARA AI] Gemini success", {
    model,
    candidateCount: data?.candidates?.length || 0,
  });

  return data;
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, conversationHistory = [], signal } = {}) {
  const transferGuidance = buildTransferGuidanceReply({ message, context });
  if (transferGuidance) {
    console.info("[CLARA AI] Transfer guidance sent to Gemini", { mode, hasContext: Boolean(context) });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const prompt = buildPrompt({ message, context, mode, conversationHistory });
  const modelCandidates = getGeminiModelCandidates();
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      const data = await requestGeminiContent({
        apiKey,
        model,
        prompt,
        signal,
        logContext: {
          mode,
          message,
          context,
          historyCount: Array.isArray(conversationHistory) ? conversationHistory.length : 0,
        },
      });

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

      if (transferGuidance && isGenericTransferReply(text)) {
        console.warn("[CLARA AI] Gemini transfer reply was too generic; enforcing guided wallet reply", {
          model,
          reply: text,
        });
        return sanitizeClaraReply(transferGuidance);
      }

      return text;
    } catch (error) {
      lastError = error;

      if (!shouldRetryWithNextModel(error)) {
        throw error;
      }

      console.warn("[CLARA AI] Gemini model failed, trying fallback model", {
        failedModel: model,
        status: error?.status,
        message: error?.geminiMessage || error?.message,
      });
    }
  }

  throw lastError || new Error("Gemini request failed.");
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const geminiMessage = getGeminiErrorMessage(data, response);
    console.error("[CLARA AI] Gemini support refine failed", {
      status: response.status,
      model,
      message: geminiMessage,
      payload: data,
    });
    throw new Error(`Gemini support refine failed (${response.status}): ${geminiMessage}`);
  }

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
