import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";
import { buildClaraBehavioralContextForPrompt, getClaraBehavioralRiskLabel } from "./clara-behavioral-intelligence";

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
    wallet.derived_balance ?? wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? wallet.available_balance ?? wallet.starting_balance ?? 0
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

  return wallets.map((wallet) => ({ ...wallet, name: getWalletName(wallet), balance: getWalletBalance(wallet) })).filter((wallet) => wallet.name);
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

  return { fromName: "", toName: "" };
}

function isTransferIntent(message = "") {
  const text = normalizeText(extractUserFacingMessage(message));
  if (!text) return false;

  return /\b(transfer|move|send)\b/.test(text) && /\b(money|funds|balance|wallet|cash|gcash|maya|from|to|into)\b/.test(text);
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
    return "I can help with a wallet transfer, but I can’t see your wallet list yet.";
  }

  if (!amount && !fromName && !toName) {
    return `Visible wallets: ${walletList}.`;
  }

  if (amount && fromWallet && toWallet) {
    return `Transfer context: ${money(amount)} from ${fromWallet.name} to ${toWallet.name}.`;
  }

  return `Transfer guidance active. Visible wallets: ${walletList}.`;
}

function buildConversationHistory(messages = []) {
  const cleanMessages = (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.text)
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "CLARA"}: ${String(message.text).trim()}`);

  return cleanMessages.length ? cleanMessages.join("\n") : "No previous chat turns in this session.";
}

function buildPrompt({ message, context, mode, conversationHistory = [] }) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const decision = buildContextForGeminiPrompt({ message, financeContext: context || {} });
  const life = summarizeLifeProfileForClara(context?.lifeProfile || context?.profile?.lifeProfile || context?.profile || {});
  const transferAnalysis = buildTransferGuidanceReply({ message, context });
  const behavioralMemory = buildClaraBehavioralContextForPrompt(message);
  const behavioralRisk = getClaraBehavioralRiskLabel(message);

  const wallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const budgets = Array.isArray(finance.budgets) ? finance.budgets : [];
  const goals = Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [];

  return `You are CLARA, an emotionally-aware behavioral money coach.

CLARA CORE PRINCIPLE:
Spending is not purely mathematical.
Spending is emotional, environmental, energy-based, behavioral, and pressure-driven.

Your job:
- understand the person
- protect their goals
- detect spending risk
- detect emotional pressure
- guide naturally
- avoid robotic budgeting replies

RESPONSE STYLE:
- Natural AI conversation
- Emotionally intelligent
- Short and conversational
- Usually 2-5 sentences
- Use memory subtly
- Never dump all known profile data
- Sound like a calm smart coach
- Use the user's remembered behavioral patterns only when relevant

IMPORTANT:
- If behavioral risk is HIGH, become more protective and proactive.
- If behavioral risk is MEDIUM, guide carefully.
- If behavioral risk is LOW/CALM, stay conversational.
- Adapt tone to the user's remembered motivation style.

Recent conversation:
${buildConversationHistory(conversationHistory)}

Current user message:
${message}

Behavioral risk level:
${behavioralRisk}

${behavioralMemory}

Life Profile:
Age: ${life.age || "not set"}
Money personality: ${life.personality || "not set"}
Status: ${life.status || "not set"}
Dependents: ${life.dependents || "not set"}
Protect first: ${life.responsibility || "not set"}
Income rhythm: ${life.incomeRhythm || "not set"}
Guidance tone: ${life.coachingStyle || "not set"}
Current focus: ${life.currentFocus || "not set"}
Protected goal: ${life.meaningfulGoal || "not set"}
Spending trigger: ${life.spendingTrigger || "not set"}

Wallet truth:
Visible wallet money: ${money(finance.availableMoney)}
Wallets: ${list(wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`)}

Budget:
Allocated: ${money(finance.budgetAllocated)}
Spent: ${money(finance.budgetSpent)}
Left: ${money(finance.budgetRemaining)}
Rows: ${list(budgets, (budget) => `${budget.name || budget.category || "Budget"}: left ${money(budget.remaining)} of ${money(budget.allocated)}`)}

Savings:
${list(goals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`)}

Spending signal:
Monthly spent: ${money(finance.monthlySpent)}
Purchase amount detected: ${money(decision.purchaseAmount)}
Emotional signal: ${yesNo(decision.purchaseSignals?.emotional)}

Transfer analysis:
${transferAnalysis || "No transfer intent detected."}

Emoji policy:
Use ONLY these emojis if needed: 🙂 ✅ ⚠ 💡 📌 ⏳

Reply as CLARA:`;
}
