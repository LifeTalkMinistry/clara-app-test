import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";
import { summarizeLifeProfileForClara } from "./clara-life-profile";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

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

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function readClaimedTotal(text = "") {
  const clean = String(text || "").replace(/,/g, "");
  const patterns = [
    /(?:i\s*(?:still\s*)?have|my\s*wallet\s*(?:has|have)|total\s*(?:money|wallets?|balance)|money\s*left)\D{0,40}(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i,
    /(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)\D{0,28}(?:total|across\s+my\s+wallets|in\s+my\s+wallets|money\s+left)/i,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    const amount = match ? Number(match[1]) : null;
    if (positive(amount)) return amount;
  }
  return null;
}

function mismatch(claimed, actual) {
  if (!positive(claimed) || !positive(actual)) return false;
  const diff = Math.abs(Number(claimed) - Number(actual));
  return diff >= 500 && diff / Math.max(Number(actual), 1) >= 0.15;
}

function list(items = [], formatter, empty = "none loaded") {
  return (Array.isArray(items) ? items : []).slice(0, 5).map(formatter).filter(Boolean).join("; ") || empty;
}

function buildPrompt({ message, context, mode }) {
  const finance = buildClaraFinanceSnapshot(context || {});
  const decision = buildContextForGeminiPrompt({ message, financeContext: context || {} });
  const life = summarizeLifeProfileForClara(context?.lifeProfile || context?.profile?.lifeProfile || context?.profile || {});
  const wallets = Array.isArray(finance.wallets) ? finance.wallets : [];
  const budgets = Array.isArray(finance.budgets) ? finance.budgets : [];
  const goals = Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [];
  const claimed = readClaimedTotal(message);

  return `You are CLARA, a private money buddy and behavioral spending coach. Be warm, simple, direct, protective, and emotionally intelligent.

Core job:
- Use the wallet, budget, savings, emergency, spending-pattern, and Life Profile context below.
- Do not invent missing data.
- Total money is not free money.
- If the user claims more money than CLARA sees, tell them to update the wallet first.
- For tempting, comfort, emotional, or expensive wants, do not give a shallow permission reply. Read the emotional trigger, budget flexibility, pattern risk, and future-self impact.

Tone training:
- Sound like a caring coach, not a spreadsheet and not a generic chatbot.
- Acknowledge emotion first when the user sounds stressed, tired, sad, pressured, excited, bored, or tempted.
- Be gentle but honest. Avoid guilt, shame, or fear-based language.
- Give one clear decision when enough context exists: safe, okay with limit, delay, or not now.
- Then give the reason and one next action.

Emoji policy:
- Yes, CLARA may use emojis to reduce misunderstanding and add emotional warmth.
- Use 0-2 emojis per reply, only when they clarify tone.
- Good emojis: 🙂 🫶 ✨ ⚠️ ✅ 💚 🧠 🛡️
- Do not decorate every sentence with emojis.
- Avoid playful emojis when warning about tight money.
- Never let emojis replace financial reasoning.

Length:
- Purchase or emotional-spending replies should be 2-4 short sentences.
- Context-check replies can be 2-5 short sentences.
- Keep the answer mobile-friendly.

User message: ${message}
Mode: ${mode || "normal_chat"}

Wallet truth:
Visible wallet money: ${money(finance.availableMoney)}
User claimed total: ${money(claimed)}
Mismatch: ${yesNo(mismatch(claimed, finance.availableMoney))}
Wallets: ${list(wallets, (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`, finance.availableMoney !== null ? `Total visible money: ${money(finance.availableMoney)}` : "none loaded")}

Budget:
Allocated: ${money(finance.budgetAllocated)}
Spent: ${money(finance.budgetSpent)}
Left: ${money(finance.budgetRemaining)}
Rows: ${list(budgets, (budget) => `${budget.name || budget.category || "Budget"}: left ${money(budget.remaining)} of ${money(budget.allocated)}`)}

Savings and emergency:
Savings: ${list(goals, (goal) => `${goal.name || "Goal"}: ${money(goal.saved)} of ${money(goal.target)}`)}
Emergency saved: ${money(finance.emergencyFund?.saved)}
Emergency target: ${money(finance.emergencyFund?.target)}

Life Profile:
Loaded: ${yesNo(life.hasMeaningfulProfile)}
Personality: ${life.personality || "not set"}
Status: ${life.status || "not set"}
Dependents: ${life.dependents || "not set"}
Protect first: ${life.responsibility || "not set"}
Tone: ${life.coachingStyle || "not set"}
Current focus: ${life.currentFocus || "not set"}
Values: ${life.topValues || "not set"}
Protected goal: ${life.meaningfulGoal || "not set"}
Situation to avoid: ${life.financialFear || "not set"}
Spending trigger: ${life.spendingTrigger || "not set"}
Non-negotiable money: ${life.nonNegotiable || "not set"}
Future identity: ${life.identityStatement || "not set"}

Spending signal:
Monthly spent: ${money(finance.monthlySpent)}
Unplanned spent: ${money(finance.unplannedSpent)}
Wants spent: ${money(finance.wantsSpent)}
Purchase amount: ${money(decision.purchaseAmount)}
Emotional signal: ${yesNo(decision.purchaseSignals?.emotional)}
Optional purchase: ${yesNo(decision.purchaseSignals?.optional)}

Reply as CLARA:`;
}

function looksIncompleteReply(text) {
  const clean = String(text || "").trim();
  return clean.length < 20 || !/[.!?]$/.test(clean) || /\b(and|but|because|so|to|for|with|of|the|a|an|is|are|can|should|let)$/i.test(clean);
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured.");
  const model = getGeminiModel();
  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt({ message, context, mode }) }] }],
      generationConfig: { temperature: 0.62, topP: 0.9, maxOutputTokens: 520, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${await response.text().catch(() => "")}`);
  const data = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || "").join(" ").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  if (looksIncompleteReply(text)) throw new Error(`Gemini returned an incomplete response: ${text}`);
  return text;
}
