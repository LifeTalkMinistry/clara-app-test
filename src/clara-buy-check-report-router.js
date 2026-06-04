import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";

const STATE_KEY = "__CLARA_BUY_CHECK_REPORT_ROUTER_STATE__";
const FALLBACK_USER_ID = "clara-demo-user";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  if (/shoe|shoes|sneaker|sneakers|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function normalizeCategory(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getExpenseDate(expense = {}) {
  const date = new Date(expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isProtectedWallet(wallet = {}) {
  const text = `${wallet.name || ""} ${wallet.type || ""}`.toLowerCase();
  return text.includes("emergency") || text.includes("reserve") || text.includes("savings") || text.includes("goal");
}

function getChat() {
  return document.querySelector("[data-clara-buy-check-static-chat]");
}

function getShell() {
  return getChat()?.closest(".fixed") || null;
}

function getMain() {
  return getChat()?.closest("main") || getShell()?.querySelector("main") || null;
}

function getInput() {
  return getShell()?.querySelector("form input, form textarea") || null;
}

function setInputValue(input, value = "") {
  if (!input) return;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function getState() {
  if (!getChat()) return null;
  if (window[STATE_KEY]?.active) return window[STATE_KEY];
  window[STATE_KEY] = { active: true, step: "item", item: "", price: 0, reason: "", busy: false, done: false };
  return window[STATE_KEY];
}

function resetState() {
  window[STATE_KEY] = null;
  window.__CLARA_BUY_CHECK_STATIC_ROUTER_STATE__ = null;
}

function appendBubble(role, text, html = "") {
  const chat = getChat();
  if (!chat) return null;
  const row = document.createElement("div");
  row.className = `clara-buy-check-static-bubble-row ${role === "user" ? "user" : "clara"}`;
  const bubble = document.createElement("div");
  bubble.className = `clara-buy-check-static-bubble ${role === "user" ? "user" : "clara"}`;
  bubble.innerHTML = html || escapeHtml(text).replace(/\n/g, "<br>");
  row.appendChild(bubble);
  chat.appendChild(row);
  requestAnimationFrame(() => chat.closest("main")?.scrollTo?.({ top: chat.closest("main")?.scrollHeight || 9999, behavior: "smooth" }));
  return row;
}

function ensureOpening() {
  const chat = getChat();
  if (!chat || clean(chat.textContent).includes("Hi, Max! What do you want to buy?")) return;
  appendBubble("clara", "", `<div class="clara-buy-check-message-title">Hi, Max! What do you want to buy?</div><div class="clara-buy-check-message-sub">Type the exact item first.</div><div class="clara-buy-check-message-example">Example: Running shoes</div>`);
}

function findBudget(budgets = [], category = "") {
  const key = normalizeCategory(category);
  const exact = budgets.find((budget) => normalizeCategory(budget.title || budget.category) === key);
  if (exact) return exact;
  const fallback = {
    shopping: ["shopping", "miscellaneous", "lifestyle", "entertainment"],
    lifestyle: ["lifestyle", "miscellaneous", "entertainment"],
    health: ["health", "medical", "miscellaneous"],
  }[key] || [];
  return budgets.find((budget) => fallback.includes(normalizeCategory(budget.title || budget.category))) || null;
}

async function getUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

function buildContext(state, effective) {
  const category = inferCategory(state.item);
  const categoryKey = normalizeCategory(category);
  const now = new Date();
  const expenses = Array.isArray(effective.expenses) ? effective.expenses : [];
  const monthExpenses = expenses.filter((expense) => {
    const date = getExpenseDate(expense);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const categoryExpenses = monthExpenses.filter((expense) => {
    const expenseKey = normalizeCategory(expense.category);
    if (expenseKey === categoryKey) return true;
    return categoryKey === "shopping" && ["miscellaneous", "lifestyle", "entertainment"].includes(expenseKey);
  });
  const budget = findBudget(effective.budgets || [], category);
  const budgetLimit = toNumber(budget?.limit ?? budget?.amount ?? 0);
  const spent = categoryExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const spendableWallets = (effective.wallets || []).filter((wallet) => !isProtectedWallet(wallet));
  const protectedWallets = (effective.wallets || []).filter(isProtectedWallet);

  return {
    source: effective.source,
    dataReadStatus: effective.dataReadStatus || {},
    purchaseSummary: { item: state.item, price: state.price, reason: state.reason, inferredCategory: category },
    financeContext: {
      wallets: effective.wallets || [],
      spendableWallets,
      protectedWallets,
      totalSpendableWalletBalance: spendableWallets.reduce((sum, wallet) => sum + toNumber(wallet.balance), 0),
      budgets: effective.budgets || [],
      matchingBudget: budget ? { title: budget.title || budget.category, limit: budgetLimit, spentThisMonth: spent, remaining: budgetLimit - spent } : null,
      savingsGoals: effective.savingsGoals || [],
      emergencyFund: effective.emergencyFund || null,
      recentExpenses: monthExpenses.slice(-30),
      categoryExpenses,
    },
    scheduleContext: effective.scheduleContext || [],
    mePageContext: effective.meProfileContext || null,
    fullMemoryContext: effective.memoryContext || null,
    timeContext: effective.timeContext || null,
  };
}

function localDecision(context) {
  const price = Number(context.purchaseSummary.price || 0);
  const spendable = Number(context.financeContext.totalSpendableWalletBalance || 0);
  const budget = context.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  const risk = !spendable || price > spendable || (budget && price > remaining)
    ? "High"
    : (budget && price >= remaining * 0.75) || price > spendable * 0.25
      ? "Medium"
      : "Low";
  return { decision: risk === "High" ? "WAIT" : risk === "Medium" ? "BUY WITH CAP" : "BUY", risk };
}

function promptFor(context) {
  const status = context.dataReadStatus || {};
  return `BUY CHECK\n\nData Read Check:\nWallets loaded: ${status.walletsLoaded ?? 0}\nBudgets loaded: ${status.budgetsLoaded ?? 0}\nExpenses loaded: ${status.expensesLoaded ?? 0}\nSavings goals loaded: ${status.savingsGoalsLoaded ?? 0}\nEmergency fund loaded: ${status.emergencyFundLoaded ?? 0}\nSchedule loaded: ${status.scheduleLoaded ?? 0}\nMe profile loaded: ${status.meProfileLoaded ?? 0}\nMemory loaded: ${status.memoryLoaded ?? 0}\nContext source: ${context.source || "real"}\n\nDo not mention demo/sample/fake/test data.\n\nUser Answers:\nItem: ${context.purchaseSummary.item}\nPrice: ${money(context.purchaseSummary.price)}\nReason: ${context.purchaseSummary.reason}\n\nDetailed Context Package for internal analysis:\n${JSON.stringify(context, null, 2)}\n\nRequired format:\nDecision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE\nRisk: Low | Medium | High\nSafer move:\none clear action`;
}

function extractDecision(reply = "", fallback = "PAUSE") {
  const match = String(reply || "").match(/Decision:\s*(BUY WITH CAP|BUY|REDUCE|WAIT|PAUSE)/i);
  return clean(match?.[1] || fallback).toUpperCase();
}

function extractRisk(reply = "", fallback = "Medium") {
  const match = String(reply || "").match(/Risk:\s*(Low|Medium|High)/i);
  const value = clean(match?.[1] || fallback).toLowerCase();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Medium";
}

function extractSaferMove(reply = "", fallback = "Pause first, then check your wallet and budget before buying.") {
  const match = String(reply || "").match(/Safer move:\s*([\s\S]*?)(?:\n\s*One sentence from CLARA:|$)/i);
  return clean(match?.[1] || "") || fallback;
}

function goodReply(reply = "") {
  const text = String(reply || "").trim();
  return text.length >= 40 && /Decision:\s*(BUY WITH CAP|BUY|REDUCE|WAIT|PAUSE)/i.test(text) && /Risk:\s*(Low|Medium|High)/i.test(text) && !/BUY WITH CAPWhy|Decision:\s*[^\n]+Why:/i.test(text);
}

function getScheduleEvents(context) {
  const raw = context.scheduleContext;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return [
    ...(Array.isArray(raw?.upcomingEvents) ? raw.upcomingEvents : []),
    ...(Array.isArray(raw?.moneyImpactEvents) ? raw.moneyImpactEvents : []),
  ].filter(Boolean);
}

function getMoneyImpactEvent(context) {
  const events = getScheduleEvents(context);
  return events.find((event) => toNumber(event.amount || event.cost || event.estimatedImpact) > 0 || /bill|due|rent|dinner|health|appointment|social|payment/i.test(`${event.type || ""} ${event.title || ""} ${event.note || ""}`)) || events[0] || null;
}

function scheduleText(context) {
  const event = getMoneyImpactEvent(context);
  if (!event) return "No upcoming money-impact schedule was loaded for this check.";
  const amount = toNumber(event.amount || event.cost || event.estimatedImpact);
  const timing = clean([event.date, event.time].filter(Boolean).join(" • "));
  return `${event.title || "Upcoming event"}${timing ? ` is scheduled on ${timing}` : " is upcoming"}${amount ? ` and may require ${money(amount)}` : ""}. This can make the timing tighter for a ${money(context.purchaseSummary.price)} purchase.`;
}

function scheduleStat(context) {
  const event = getMoneyImpactEvent(context);
  if (!event) return "No schedule";
  const amount = toNumber(event.amount || event.cost || event.estimatedImpact);
  return amount ? money(amount) : "Upcoming";
}

function flattenMemory(context) {
  const memory = context.fullMemoryContext || {};
  const cabinets = Array.isArray(memory.memoryCabinets) ? memory.memoryCabinets : [];
  const cabinetRecords = cabinets.flatMap((cabinet) => (Array.isArray(cabinet.records) ? cabinet.records : []).map((record) => ({ ...record, cabinet: cabinet.cabinet })));
  const profileNotes = Array.isArray(memory.profileMemoryNotes) ? memory.profileMemoryNotes : [];
  return [...cabinetRecords, ...profileNotes].filter(Boolean);
}

function strongestMemorySignal(context) {
  const records = flattenMemory(context);
  const preferred = records.find((record) => /payday|impulse|shopping|food|trigger|spending|discipline|emergency|goal/i.test(`${record.summary || ""} ${(record.signals || []).join(" ")}`));
  const record = preferred || records[0];
  if (!record) return "No strong memory pattern was loaded for this check.";
  return clean(record.summary || (Array.isArray(record.signals) ? record.signals.join(" ") : "")) || "A memory signal was loaded, but it has no readable summary yet.";
}

function patternText(context) {
  const category = normalizeCategory(context.purchaseSummary.inferredCategory);
  const categoryExpenses = context.financeContext.categoryExpenses || [];
  const monthSpend = categoryExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const similarCount = categoryExpenses.length;
  const memorySignal = strongestMemorySignal(context);
  const profileHint = context.mePageContext ? " The Me profile was also available for this decision." : "";
  return `CLARA found ${similarCount} ${category || "category"}-related purchase${similarCount === 1 ? "" : "s"} this month totaling ${money(monthSpend)}. Memory signal: ${memorySignal}${profileHint}`;
}

function buildFinalSummary(context, decision) {
  const price = Number(context.purchaseSummary.price || 0);
  const budget = context.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  const spendable = Number(context.financeContext.totalSpendableWalletBalance || 0);
  const afterPurchase = spendable - price;
  const emergency = context.financeContext.emergencyFund;
  const goal = context.financeContext.savingsGoals?.[0];
  const event = getMoneyImpactEvent(context);
  const memorySignal = strongestMemorySignal(context);
  const timingLine = event ? ` Timing also matters because ${event.title || "an upcoming event"} is on the schedule.` : " No money-impact schedule was loaded.";
  const patternLine = memorySignal && !memorySignal.startsWith("No strong") ? ` Pattern check found: ${memorySignal}` : " No strong pattern/memory signal was loaded.";
  const protection = [];
  if (goal) protection.push(`${goal.name} is ${money(goal.savedAmount)} / ${money(goal.targetAmount)}`);
  if (emergency) protection.push(`emergency fund is ${money(emergency.savedAmount)} / ${money(emergency.targetAmount)}`);

  if (budget && price > remaining) {
    return `This ${money(price)} purchase is not safe right now because your ${budget.title} budget only has ${money(Math.max(0, remaining))} left. It would exceed the budget, leave your spendable wallet safety at ${money(afterPurchase)}, and ${protection.length ? `${protection.join(" while ")} should stay protected.` : "protected money should not be used for this."}${timingLine}${patternLine}`;
  }
  if (budget) {
    return `This ${money(price)} purchase fits inside your ${budget.title} budget with ${money(Math.max(0, remaining))} currently left, but it would reduce your spendable wallet total from ${money(spendable)} to ${money(afterPurchase)}. ${protection.length ? `${protection.join(" and ")} should stay protected.` : "Keep goals and emergency money protected."}${timingLine}${patternLine}`;
  }
  return `This ${money(price)} purchase needs caution because CLARA did not find an exact budget for ${context.purchaseSummary.inferredCategory}. Your spendable wallet total is ${money(spendable)}, and ${protection.length ? `${protection.join(" and ")} should stay protected.` : "protected money should not be used for this."}${timingLine}${patternLine}`;
}

function fallbackSaferMove(context, decision, risk) {
  const price = Number(context.purchaseSummary.price || 0);
  const budget = context.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  if (risk === "High" && budget) return `Wait first, or choose an option below ${money(Math.max(0, remaining))}.`;
  if (decision === "BUY WITH CAP") return `Buy only up to ${money(price)} and do not add another shopping purchase this week.`;
  if (risk === "Low") return "Buy it only if it still matches your priority, then log it right away.";
  return "Pause first, then choose a cheaper option or wait until the next budget reset.";
}

function buildEvidenceCards(context, decision, risk, saferMove) {
  const price = Number(context.purchaseSummary.price || 0);
  const spendable = Number(context.financeContext.totalSpendableWalletBalance || 0);
  const budget = context.financeContext.matchingBudget;
  const remaining = Number(budget?.remaining || 0);
  const goal = context.financeContext.savingsGoals?.[0];
  const emergency = context.financeContext.emergencyFund;
  const walletLine = context.financeContext.spendableWallets.length
    ? `${context.financeContext.spendableWallets.slice(0, 2).map((wallet) => `${wallet.name}: ${money(wallet.balance)}`).join(" • ")}`
    : "No spendable wallet loaded.";
  const protectedLine = context.financeContext.protectedWallets.length
    ? `Protected: ${context.financeContext.protectedWallets.map((wallet) => `${wallet.name} ${money(wallet.balance)}`).join(", ")}.`
    : "No protected wallet loaded.";
  const budgetPercent = budget && remaining > 0 ? Math.round((price / remaining) * 100) : 0;
  const emergencyPercent = emergency?.targetAmount ? Math.round((toNumber(emergency.savedAmount) / toNumber(emergency.targetAmount)) * 100) : 0;
  const categorySpend = (context.financeContext.categoryExpenses || []).reduce((sum, expense) => sum + toNumber(expense.amount), 0);

  return [
    { eyebrow: "01 / PURCHASE", title: context.purchaseSummary.item, body: `Price: ${money(price)}. Reason: ${context.purchaseSummary.reason}. CLARA categorized it as ${context.purchaseSummary.inferredCategory}.`, stat: money(price), note: "This is the small picture: what the user wants to buy." },
    { eyebrow: "02 / WALLET", title: "Spendable money", body: `${walletLine}. Spendable total is ${money(spendable)}. After purchase, spendable money would be ${money(spendable - price)}. ${protectedLine}`, stat: money(spendable), note: "Wallet answers: can the user physically afford it?" },
    { eyebrow: "03 / BUDGET", title: budget ? `${budget.title} budget` : "Budget check", body: budget ? `Budget room is ${money(Math.max(0, remaining))}. This purchase uses ${budgetPercent}% of remaining room and would leave ${money(Math.max(0, remaining - price))}.` : `No exact ${context.purchaseSummary.inferredCategory} budget was found, so CLARA treats this with caution.`, stat: budget ? money(Math.max(0, remaining)) : "No match", note: "Budget answers: does it fit the category plan?" },
    { eyebrow: "04 / GOALS", title: goal ? goal.name : "Savings goals", body: goal ? `${goal.name} currently has ${money(goal.savedAmount)} saved toward ${money(goal.targetAmount)}. This purchase should not slow the goal unless it is truly necessary.` : "No savings goal was loaded for this check.", stat: goal ? `${money(goal?.savedAmount || 0)}` : "None", note: "Goals answer: will this delay progress?" },
    { eyebrow: "05 / EMERGENCY", title: "Emergency fund", body: emergency ? `Emergency fund is ${money(emergency.savedAmount)} / ${money(emergency.targetAmount)}${emergencyPercent ? ` (${emergencyPercent}%)` : ""}. This money should stay protected from wants or non-urgent purchases.` : "No emergency fund was loaded for this check.", stat: emergency ? money(emergency.savedAmount) : "None", note: "Emergency answers: is protected money threatened?" },
    { eyebrow: "06 / SCHEDULE", title: "Timing check", body: scheduleText(context), stat: scheduleStat(context), note: "Schedule answers: is this the right time to spend?" },
    { eyebrow: "07 / PATTERN", title: "Pattern & memory", body: patternText(context), stat: `${(context.financeContext.categoryExpenses || []).length} hit${(context.financeContext.categoryExpenses || []).length === 1 ? "" : "s"} • ${money(categorySpend)}`, note: "Pattern answers: does this match the user’s behavior and identity?" },
    { eyebrow: "08 / FINAL SUMMARY", title: decision, body: buildFinalSummary(context, decision), stat: `Risk: ${risk}`, note: `Safer move: ${saferMove}`, final: true },
  ];
}

function buildReport(reply, context) {
  const fallback = localDecision(context);
  const useAi = goodReply(reply);
  const decision = useAi ? extractDecision(reply, fallback.decision) : fallback.decision;
  const risk = useAi ? extractRisk(reply, fallback.risk) : fallback.risk;
  const saferMove = useAi ? extractSaferMove(reply, fallbackSaferMove(context, decision, risk)) : fallbackSaferMove(context, decision, risk);
  return { decision, risk, saferMove, cards: buildEvidenceCards(context, decision, risk, saferMove) };
}

function renderReport(report) {
  const main = getMain();
  if (!main) return;
  const cardCount = report.cards.length;
  main.innerHTML = `
    <button type="button" class="clara-buy-check-static-close" data-clara-buy-check-close-board="true" aria-label="Close CLARA AI mode">×</button>
    <div class="clara-buy-check-static-wrap" data-clara-buy-check-report="true">
      <section class="relative mx-auto w-full max-w-[354px] rounded-[28px] border border-cyan-100/15 bg-white/[0.075] px-4 py-5 text-center shadow-[0_22px_58px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl">
        <p class="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">BUY CHECK REPORT</p>
        <p class="mx-auto mt-2 max-w-[260px] text-[12px] font-bold leading-5 text-slate-300/65">Swipe from purchase details to the final decision.</p>
        <div class="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none]" style="scrollbar-width:none; -ms-overflow-style:none;">
          ${report.cards.map((card) => `
            <article class="min-w-full snap-center rounded-[24px] border ${card.final ? "border-emerald-200/20 bg-emerald-300/10" : "border-white/10 bg-slate-950/20"} px-5 py-5 text-left">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/45">${escapeHtml(card.eyebrow)}</p>
              <h3 class="mt-2 text-[22px] font-black leading-tight tracking-tight text-white">${escapeHtml(card.title)}</h3>
              <div class="mt-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[12px] font-black text-slate-100/90">${escapeHtml(card.stat)}</div>
              <p class="mt-4 text-[13.5px] font-bold leading-6 text-slate-100/90">${escapeHtml(card.body)}</p>
              <p class="mt-4 text-[12px] font-black leading-5 ${card.final ? "text-emerald-50/90" : "text-slate-300/58"}">${escapeHtml(card.note)}</p>
            </article>
          `).join("")}
        </div>
        <div class="mt-1 flex justify-center gap-1.5">
          ${Array.from({ length: cardCount }).map((_, index) => `<span class="h-1.5 w-${index === 0 ? "5" : "1.5"} rounded-full bg-cyan-100/${index === 0 ? "70" : "25"}"></span>`).join("")}
        </div>
        <p class="mx-auto mt-4 max-w-[286px] text-[11.5px] font-bold leading-5 text-slate-300/62">Phase 3: purchase, wallet, budget, goals, emergency, schedule, pattern, then final summary.</p>
        <div class="mt-5 flex flex-wrap justify-center gap-2"><button type="button" class="clara-buy-check-static-button" data-clara-buy-check-again="true">Check another</button><button type="button" class="clara-buy-check-static-button" data-clara-buy-check-close-board="true">Done</button></div>
      </section>
    </div>`;
  main.scrollTo?.({ top: 0, behavior: "smooth" });
}

function errorReport() {
  return {
    decision: "PAUSE",
    risk: "Medium",
    saferMove: "Try again in a moment, or check your wallet and budget manually before buying.",
    cards: [
      { eyebrow: "01 / PURCHASE", title: "Context missing", stat: "Pause", body: "CLARA could not complete the full wallet and budget read right now.", note: "The safest move is to pause." },
      { eyebrow: "02 / FINAL SUMMARY", title: "PAUSE", stat: "Risk: Medium", body: "Goals and emergency money should stay protected until the context check works.", note: "Safer move: Try again in a moment.", final: true },
    ],
  };
}

async function runDiagnosis(state) {
  state.busy = true;
  appendBubble("clara", "Got it. I’m checking wallet, budget, goals, emergency, schedule, and memory now...");
  try {
    const user = await getUser();
    const localUserId = clean(user?.id || user?.email || FALLBACK_USER_ID) || FALLBACK_USER_ID;
    const messages = [
      { role: "user", text: state.item },
      { role: "user", text: money(state.price) },
      { role: "user", text: state.reason },
    ];
    const effective = await getClaraEffectiveFinanceContext(localUserId, { user, messages });
    const context = buildContext(state, effective);
    const prompt = promptFor(context);
    window.__CLARA_LAST_BUY_CHECK_DATA_READ_STATUS__ = context.dataReadStatus;
    window.__CLARA_LAST_BUY_CHECK_CONTEXT__ = context;
    window.__CLARA_LAST_BUY_CHECK_PROMPT__ = prompt;
    let reply = "";
    if (hasGeminiConfig()) {
      try {
        reply = await generateClaraGeminiReply({ message: prompt, context, mode: "buy_check_phase_three_carousel", conversationHistory: messages });
      } catch (error) {
        console.warn("[CLARA Buy Check Report] Gemini failed; deterministic report used.", error);
      }
    }
    renderReport(buildReport(reply, context));
  } catch (error) {
    console.warn("[CLARA Buy Check Report] Diagnosis failed", error);
    renderReport(errorReport());
  } finally {
    state.busy = false;
    state.done = true;
  }
}

function handleAnswer(value = "") {
  const state = getState();
  if (!state || state.busy || state.done) return;
  const answer = clean(value);
  if (!answer) return;
  ensureOpening();
  appendBubble("user", answer);
  if (state.step === "item") {
    state.item = answer;
    state.step = "price";
    appendBubble("clara", `How much does ${answer} cost?\n\nType the amount only if you can. Example: ₱3,500`);
    return;
  }
  if (state.step === "price") {
    const price = extractPrice(answer);
    if (!price) {
      appendBubble("clara", "Please type the price clearly so I can check it properly. Example: ₱3,500");
      return;
    }
    state.price = price;
    state.step = "reason";
    appendBubble("clara", "Why do you want to buy it?\n\nExample: replacement, work need, reward, health, hobby, or just want it.");
    return;
  }
  if (state.step === "reason") {
    state.reason = answer;
    state.step = "diagnosis";
    runDiagnosis(state);
  }
}

function route(event) {
  const chat = getChat();
  if (!chat) return false;
  const shell = getShell();
  const input = getInput();
  if (!shell || !input) return false;
  if (event.target && !shell.contains(event.target)) return false;
  const value = clean(input.value);
  if (!value) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  setInputValue(input, "");
  handleAnswer(value);
  return true;
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_REPORT_ROUTER_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_REPORT_ROUTER_INSTALLED__ = true;
  document.addEventListener("submit", route, true);
  document.addEventListener("click", (event) => {
    const shell = getShell();
    if (!shell || !getChat()) return;
    const button = event.target?.closest?.("button");
    if (!button || !shell.contains(button)) return;
    const isSend = button.type === "submit" || String(button.getAttribute("aria-label") || "").toLowerCase().includes("send");
    if (isSend) route(event);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const input = getInput();
    if (!input || event.target !== input) return;
    route(event);
  }, true);
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-buy-check-close-board]")) resetState();
    if (event.target?.closest?.("[data-clara-buy-check-again]")) resetState();
  }, true);
}

install();
