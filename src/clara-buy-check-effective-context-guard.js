import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";

const BUY_CHECK_DEMO_USER_ID = "clara-demo-user";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractPrice(text = "") {
  const match = clean(text).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function inferCategory(item = "") {
  const text = clean(item).toLowerCase();
  if (/food|meal|jollibee|mcdo|mcdonald|coffee|milk tea|milktea|snack|restaurant|delivery|grabfood|panda|grocery|groceries/.test(text)) return "Food";
  if (/jeep|bus|taxi|grab|angkas|moveit|gas|fare|transport/.test(text)) return "Transportation";
  if (/rent|electric|water|internet|wifi|bill|load|subscription/.test(text)) return "Bills";
  if (/medicine|doctor|hospital|vitamin|health|checkup/.test(text)) return "Health";
  if (/shoe|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function normalizeCategory(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getExpenseDate(expense = {}) {
  const date = new Date(expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getLocalUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

function getAssistantShell() {
  if (typeof document === "undefined") return null;
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return text.includes("Core Features") && text.includes("Smart Actions") && text.includes("Buy Check");
  }) || null;
}

function getStaticChatWrap() {
  return getAssistantShell()?.querySelector("[data-clara-buy-check-static-chat]") || null;
}

function getBubbles() {
  return Array.from(getStaticChatWrap()?.querySelectorAll(".clara-buy-check-static-bubble") || []);
}

function getFlowSnapshot(inputValue = "") {
  const bubbles = getBubbles().map((node) => ({
    role: node.classList.contains("user") ? "user" : "clara",
    text: clean(node.textContent),
  }));
  const userAnswers = bubbles.filter((message) => message.role === "user").map((message) => message.text);
  const lastClara = [...bubbles].reverse().find((message) => message.role === "clara")?.text || "";

  return {
    bubbles,
    userAnswers,
    lastClara,
    item: userAnswers[0] || "",
    price: extractPrice(userAnswers[1] || ""),
    reason: clean(inputValue),
  };
}

function isFinalReasonSubmit(snapshot) {
  return Boolean(
    snapshot.item &&
      snapshot.price &&
      snapshot.reason &&
      /why do you want to buy it/i.test(snapshot.lastClara)
  );
}

function clearAssistantInput(form) {
  const input = form?.querySelector?.("input, textarea");
  if (!input) return;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function appendBubble(role, text) {
  const wrap = getStaticChatWrap();
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `clara-buy-check-static-bubble-row ${role === "user" ? "user" : "clara"}`;
  row.dataset.claraEffectiveBuyCheckBubble = "true";
  row.innerHTML = `<div class="clara-buy-check-static-bubble ${role === "user" ? "user" : "clara"}">${escapeHtml(text)}</div>`;
  wrap.appendChild(row);
  wrap.closest("main")?.scrollTo?.({ top: wrap.closest("main")?.scrollHeight || 9999, behavior: "smooth" });
  return row;
}

function removeNode(node) {
  try {
    node?.parentElement?.removeChild(node);
  } catch {
    // Ignore DOM cleanup failures.
  }
}

function renderDoneActions() {
  const wrap = getStaticChatWrap();
  if (!wrap || wrap.querySelector("[data-clara-effective-buy-check-actions]")) return;

  const actions = document.createElement("div");
  actions.className = "clara-buy-check-static-actions";
  actions.dataset.claraEffectiveBuyCheckActions = "true";
  actions.innerHTML = `
    <button type="button" class="clara-buy-check-static-button" data-clara-buy-check-again="true">Check another</button>
    <button type="button" class="clara-buy-check-static-button" data-clara-buy-check-close-board="true">Done</button>
  `;
  wrap.appendChild(actions);
}

function buildCounts(effectiveContext) {
  const status = effectiveContext?.dataReadStatus || {};
  return {
    source: effectiveContext?.source || status.source || "real",
    wallets: status.walletsLoaded ?? effectiveContext?.wallets?.length ?? 0,
    budgets: status.budgetsLoaded ?? effectiveContext?.budgets?.length ?? 0,
    expenses: status.expensesLoaded ?? effectiveContext?.expenses?.length ?? 0,
    savingsGoals: status.savingsGoalsLoaded ?? effectiveContext?.savingsGoals?.length ?? 0,
    emergencyFund: status.emergencyFundLoaded ?? (effectiveContext?.emergencyFund ? 1 : 0),
    schedule: status.scheduleLoaded ?? effectiveContext?.scheduleContext?.length ?? 0,
    meProfile: status.meProfileLoaded ?? (effectiveContext?.meProfileContext ? 1 : 0),
    memory: status.memoryLoaded ?? (effectiveContext?.memoryContext ? 1 : 0),
  };
}

function buildContextPackage(snapshot, effectiveContext) {
  const category = inferCategory(snapshot.item);
  const categoryKey = normalizeCategory(category);
  const now = new Date();
  const expenses = Array.isArray(effectiveContext.expenses) ? effectiveContext.expenses : [];
  const currentMonthExpenses = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const categoryExpenses = currentMonthExpenses.filter((expense) => normalizeCategory(expense.category) === categoryKey);
  const matchingBudget = (effectiveContext.budgets || []).find((budget) => normalizeCategory(budget.title || budget.category) === categoryKey) || null;
  const categorySpent = categoryExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const budgetLimit = matchingBudget ? toNumber(matchingBudget.limit ?? matchingBudget.amount) : 0;
  const similarPurchases = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    if (!date || (Date.now() - date.getTime()) / 86400000 > 45) return false;
    const text = `${expense.title || ""} ${expense.note || ""} ${expense.category || ""}`.toLowerCase();
    return text.includes(snapshot.item.toLowerCase().split(" ")[0] || "") || normalizeCategory(expense.category) === categoryKey;
  }).slice(-20);
  const dataReadStatus = buildCounts(effectiveContext);

  return {
    source: effectiveContext.source,
    dataReadStatus,
    purchaseSummary: {
      item: snapshot.item,
      price: snapshot.price,
      reason: snapshot.reason,
      inferredCategory: category,
    },
    financeContext: {
      wallets: (effectiveContext.wallets || []).slice(0, 12),
      totalWalletBalance: (effectiveContext.wallets || []).reduce((sum, wallet) => sum + toNumber(wallet.balance), 0),
      budgets: (effectiveContext.budgets || []).slice(0, 20),
      matchingBudget: matchingBudget
        ? {
            title: matchingBudget.title || matchingBudget.category,
            limit: budgetLimit,
            spentThisMonth: categorySpent,
            remaining: budgetLimit - categorySpent,
          }
        : null,
      recentExpenses: currentMonthExpenses.slice(-30),
      similarPurchases,
      savingsGoals: (effectiveContext.savingsGoals || []).slice(0, 12),
      emergencyFund: effectiveContext.emergencyFund,
    },
    scheduleContext: effectiveContext.scheduleContext || [],
    mePageContext: effectiveContext.meProfileContext || null,
    fullMemoryContext: effectiveContext.memoryContext || null,
    timeContext: effectiveContext.timeContext || null,
  };
}

function buildFinalDiagnosisPrompt(contextPackage) {
  const counts = contextPackage.dataReadStatus || {};

  return `You are CLARA, a personal money coach.

A Buy Check static diagnosis is complete.

Data Read Check:
Wallets loaded: ${counts.wallets || 0}
Budgets loaded: ${counts.budgets || 0}
Expenses loaded: ${counts.expenses || 0}
Savings goals loaded: ${counts.savingsGoals || 0}
Emergency fund loaded: ${counts.emergencyFund || 0}
Schedule loaded: ${counts.schedule || 0}
Me profile loaded: ${counts.meProfile || 0}
Memory loaded: ${counts.memory || 0}
Context source: ${counts.source || contextPackage.source || "real"}

Important: If Context source is demo, still treat the records as normal financial truth. Do not say demo, sample, fake, seeded, or test data in the user-facing answer.

User Answers:
Item: ${contextPackage.purchaseSummary.item}
Price: ${money(contextPackage.purchaseSummary.price)}
Reason: ${contextPackage.purchaseSummary.reason}

Wallets:
${JSON.stringify(contextPackage.financeContext.wallets, null, 2)}

Budgets:
${JSON.stringify(contextPackage.financeContext.budgets, null, 2)}

Savings Goals:
${JSON.stringify(contextPackage.financeContext.savingsGoals, null, 2)}

Emergency Fund:
${JSON.stringify(contextPackage.financeContext.emergencyFund, null, 2)}

Recent Expenses:
${JSON.stringify(contextPackage.financeContext.recentExpenses, null, 2)}

Schedule:
${JSON.stringify(contextPackage.scheduleContext, null, 2)}

Me Profile:
${JSON.stringify(contextPackage.mePageContext, null, 2)}

Memory:
${JSON.stringify(contextPackage.fullMemoryContext, null, 2)}

Buy Check Rules:
- Decide using all available context, not just wallet balance.
- Separate wallet safety from budget room.
- Treat savings goals and emergency fund as protected money.
- Use exact numbers when available.
- Mention only the most relevant context. Do not dump raw data.
- Do not ask more default questions.
- Keep the answer short, direct, and useful for mobile chat.

Required Response Format:
Decision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE

Risk: Low | Medium | High

Why:
• Wallet: use exact wallet data.
• Budget: use exact budget room.
• Goals/Emergency: use exact goals/emergency fund data.
• Pattern/Memory: use exact memory/pattern if available.
• Schedule/Profile: use exact schedule/profile if available.

Safer move:
one clear action

One sentence from CLARA:
short personal coaching line`;
}

function localBuyCheckFallback(contextPackage) {
  const price = Number(contextPackage.purchaseSummary.price || 0);
  const totalWalletBalance = Number(contextPackage.financeContext.totalWalletBalance || 0);
  const budget = contextPackage.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  const emergencyFund = contextPackage.financeContext.emergencyFund;
  const primaryGoal = contextPackage.financeContext.savingsGoals?.[0];
  const risk = !totalWalletBalance || price > totalWalletBalance || (budget && price > remaining)
    ? "High"
    : price > totalWalletBalance * 0.35
      ? "Medium"
      : "Low";
  const decision = risk === "High" ? "WAIT" : risk === "Medium" ? "PAUSE" : "BUY";
  const budgetLine = budget
    ? `${budget.title} has ${money(Math.max(0, remaining))} room left after ${money(Number(budget.spentThisMonth || 0))} spent this month.`
    : "No exact matching budget was found, so this needs extra caution.";
  const goalLine = primaryGoal
    ? `${primaryGoal.name} is at ${money(primaryGoal.savedAmount)} / ${money(primaryGoal.targetAmount)}.`
    : "No savings goal was loaded.";
  const emergencyLine = emergencyFund
    ? `Emergency fund is ${money(emergencyFund.savedAmount)} / ${money(emergencyFund.targetAmount)} and should stay protected.`
    : "No emergency fund was loaded.";

  return `Decision: ${decision}

Risk: ${risk}

Why:
• Wallet: The item costs ${money(price)} and your loaded wallet total is ${money(totalWalletBalance)}.
• Budget: ${budgetLine}
• Goals/Emergency: ${goalLine} ${emergencyLine}
• Pattern/Memory: CLARA checked available spending pattern and memory context before deciding.
• Schedule/Profile: CLARA checked available schedule/profile context before deciding.

Safer move:
${risk === "Low" ? "Buy it only if it still matches the reason you gave, then log it right away." : "Wait first or choose a cheaper option before spending."}

One sentence from CLARA:
Protect the plan first, then spend only when the decision still makes sense.`;
}

async function runEffectiveBuyCheck(snapshot) {
  const user = await getLocalUser();
  const localUserId = clean(user?.id || user?.email || BUY_CHECK_DEMO_USER_ID) || BUY_CHECK_DEMO_USER_ID;
  const messages = [
    ...snapshot.bubbles.map((message) => ({
      role: message.role === "clara" ? "assistant" : message.role,
      text: message.text,
    })),
    { role: "user", text: snapshot.reason },
  ];
  const effectiveContext = await getClaraEffectiveFinanceContext(localUserId, { user, messages });
  const contextPackage = buildContextPackage(snapshot, effectiveContext);
  const prompt = buildFinalDiagnosisPrompt(contextPackage);

  if (typeof window !== "undefined") {
    window.__CLARA_LAST_BUY_CHECK_DATA_READ_STATUS__ = contextPackage.dataReadStatus;
    window.__CLARA_LAST_BUY_CHECK_CONTEXT__ = contextPackage;
    window.__CLARA_LAST_BUY_CHECK_PROMPT__ = prompt;
  }

  let reply = "";
  if (hasGeminiConfig()) {
    reply = await generateClaraGeminiReply({
      message: prompt,
      context: contextPackage,
      mode: "buy_check_static_diagnosis",
      conversationHistory: messages,
    });
  }

  return clean(reply) || localBuyCheckFallback(contextPackage);
}

function installEffectiveBuyCheckGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_EFFECTIVE_BUY_CHECK_GUARD_INSTALLED__) return;

  window.__CLARA_EFFECTIVE_BUY_CHECK_GUARD_INSTALLED__ = true;

  window.addEventListener("submit", (event) => {
    const form = event.target;
    const shell = getAssistantShell();
    if (!shell || !form || !shell.contains(form)) return;

    const input = form.querySelector?.("input, textarea");
    const value = clean(input?.value);
    const snapshot = getFlowSnapshot(value);
    if (!isFinalReasonSubmit(snapshot)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    clearAssistantInput(form);

    appendBubble("user", value);
    const loadingBubble = appendBubble("clara", "Got it. I’m checking your wallet, budget, schedule, Me profile, goals, and memory now...");

    runEffectiveBuyCheck(snapshot)
      .then((reply) => {
        removeNode(loadingBubble);
        appendBubble("clara", reply);
        renderDoneActions();
      })
      .catch((error) => {
        console.warn("[CLARA Buy Check] Effective context diagnosis failed", error);
        removeNode(loadingBubble);
        appendBubble("clara", "Decision: PAUSE\n\nRisk: Medium\n\nWhy:\n• Wallet: I couldn’t complete the full wallet read right now.\n• Budget: Budget context may be incomplete.\n• Goals/Emergency: It is safer not to rush a purchase when the diagnosis is incomplete.\n• Pattern/Memory: Memory check did not finish.\n• Schedule/Profile: Schedule/profile check did not finish.\n\nSafer move:\nTry again in a moment, or check your wallet and budget manually before buying.\n\nOne sentence from CLARA:\nWhen the read is incomplete, the safest money move is to pause first.");
        renderDoneActions();
      });
  }, true);
}

installEffectiveBuyCheckGuard();
