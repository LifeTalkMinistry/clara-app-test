import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { askGeminiForScheduleImpact } from "@/lib/ai-command/schedule-impact-service";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toTitleCase(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeTitle(value, type = "Personal") {
  const text = cleanText(value).replace(/[.!?]+$/g, "");
  const lower = text.toLowerCase();

  if (!text) return `${type || "Personal"} schedule`;
  if (/gala|lakad|alis|labas|outing|hangout/.test(lower) && /church|service|simbahan/.test(lower)) return "After-church fellowship";
  if (/birthday/.test(lower) && /mama|mom|mother|nanay/.test(lower)) return "Mama’s birthday plan";
  if (/birthday/.test(lower) && /papa|dad|father|tatay/.test(lower)) return "Papa’s birthday plan";
  if (/birthday/.test(lower)) return "Birthday preparation";
  if (/doctor|checkup|clinic|hospital|medical/.test(lower)) return "Doctor checkup";
  if (/renew/.test(lower) && /license|licence/.test(lower)) return "License renewal";
  if (/buy|bili|gift|regalo/.test(lower)) return "Gift buying errand";
  if (/team/.test(lower) && /outing|gala|trip/.test(lower)) return "Team outing";
  if (/church/.test(lower) && /outing/.test(lower)) return "Church fellowship";
  if (/church|service|simbahan|ministry/.test(lower)) return "Church event";
  if (/outing|beach|resort|trip|gala|lakad|alis|labas/.test(lower)) return "Personal outing";
  if (/meeting|office|shift|work/.test(lower)) return "Work meeting";
  if (/family|fiesta|mama|papa|nanay|tatay/.test(lower)) return "Family schedule";

  const shortText = text.split(" ").filter(Boolean).slice(0, 4).join(" ");
  return toTitleCase(shortText) || `${type || "Personal"} schedule`;
}

function makeDescription(value, title = "") {
  const source = cleanText(value || title);
  const lower = source.toLowerCase();

  if (/gala|lakad|alis|labas|outing|hangout/.test(lower) && /church|service|simbahan/.test(lower)) return "Simple fellowship with churchmates after the church service.";
  if (/birthday/.test(lower) && /mama|mom|mother|nanay/.test(lower)) return "Preparation for my mother’s birthday celebration.";
  if (/doctor|checkup|clinic|hospital|medical/.test(lower)) return "Health appointment or checkup that may include travel and medical-related costs.";
  if (/renew/.test(lower) && /license|licence/.test(lower)) return "License renewal errand that may include fees and transportation.";
  if (/buy|bili|gift|regalo/.test(lower)) return "Gift-buying errand that may affect today’s spending plan.";
  if (/meeting|office|shift|work/.test(lower)) return "Work-related schedule that may involve transportation or meal spending.";
  return source || "Schedule that may affect money or plans.";
}

function getNativeValueSetter(element) {
  if (!element) return null;
  const prototype = Object.getPrototypeOf(element);
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set || null;
}

function updateControlledField(element, value) {
  if (!element) return;
  const setter = getNativeValueSetter(element);
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function readForm(root) {
  const dialog = root?.querySelector?.('[role="dialog"]');
  const titleInput = dialog?.querySelector('input[placeholder="Schedule title"]');
  const noteInput = dialog?.querySelector("textarea");
  const typeInput = dialog?.querySelector("select");
  const dateInput = dialog?.querySelector('input[type="date"]');
  const timeInput = dialog?.querySelector('input[type="time"]');
  const amountInput = dialog?.querySelector('input[placeholder="AI will calculate"]');
  const note = cleanText(noteInput?.value);
  const type = cleanText(typeInput?.value) || "Personal";
  const title = cleanText(titleInput?.value) || makeTitle(note, type);

  return {
    title,
    note,
    type,
    date: dateInput?.value || "",
    time: timeInput?.value || "",
    amount: amountInput?.value || "",
    elements: { titleInput, noteInput, typeInput, amountInput },
  };
}

function applyScheduleSuggestions(root, ai = {}) {
  const form = root ? readForm(root) : null;
  if (!form) return {};

  const suggestedTitle = cleanText(ai?.suggested_title);
  const suggestedDescription = cleanText(ai?.suggested_description);
  const currentTitle = cleanText(form.elements.titleInput?.value);
  const currentNote = cleanText(form.elements.noteInput?.value);

  if (suggestedTitle && (!currentTitle || currentTitle === makeTitle(currentNote, form.type) || /gala after church/i.test(currentTitle))) {
    updateControlledField(form.elements.titleInput, suggestedTitle);
  }

  if (suggestedDescription && (!currentNote || currentNote.length < 28 || /gala after church/i.test(currentNote))) {
    updateControlledField(form.elements.noteInput, suggestedDescription);
  }

  return { title: suggestedTitle || form.title, note: suggestedDescription || form.note };
}

function parseAmount(text) {
  const source = String(text || "").replace(/,/g, "");
  const moneyMatches = [...source.matchAll(/(?:₱|php\s*)?\s*(\d+(?:\.\d+)?)(?:\s*(?:pesos?|php|fare|pamasahe|cost|spend|budget))?/gi)];
  if (!moneyMatches.length) return 0;
  return moneyMatches.reduce((sum, match) => sum + Math.round(Number(match[1]) || 0), 0);
}

function isAffirmative(value) {
  return /\b(yes|yeah|yep|yup|correct|tama|oo|opo|sure|sige|go|start|okay|ok|alright)\b/i.test(cleanText(value));
}

function isNegativeOrFree(value) {
  return /\b(no need|none|wala|free|libre|zero|0|not relevant|skip that|no spending there|not really|hindi|skip)\b/i.test(cleanText(value));
}

function isQuantityOnlyReply(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return false;
  return /\b(ride|rides|jeep|jeepney|tricycle|bus|train|taxi|grab|angkas|people|person|persons|friend|friends|churchmate|churchmates|ticket|tickets|item|items|piece|pieces|times|pax)\b/.test(text) && !/(₱|php|peso|pesos|fare|cost|budget|spend|around|maybe|estimate|pamasahe)/i.test(text);
}

function isClearMoneyReply(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return false;
  if (isQuantityOnlyReply(text)) return false;
  if (/(₱|php|peso|pesos|fare|cost|budget|spend|around|maybe|estimate|pamasahe)/i.test(text) && parseAmount(text) > 0) return true;
  return /^\d+(?:\.\d+)?$/.test(text) && parseAmount(text) > 0;
}

function getEventPhrase(form) {
  const source = cleanText(form.note || form.title);
  const lower = source.toLowerCase();

  if (/fellowship/.test(lower) && /church|service|simbahan/.test(lower)) return "have a simple fellowship after church service";
  if (/gala|lakad|alis|labas|outing|hangout/.test(lower) && /church|service|simbahan/.test(lower)) return "have a simple fellowship after church service";
  if (/birthday/.test(lower) && /mama|mom|mother|nanay/.test(lower)) return "prepare for your mother’s birthday";
  if (/birthday/.test(lower)) return "prepare for a birthday plan";
  if (/doctor|checkup|clinic|hospital|medical/.test(lower)) return "attend a health checkup";
  if (/renew/.test(lower) && /license|licence/.test(lower)) return "renew your license";
  if (/buy|bili|gift|regalo/.test(lower)) return "buy a gift";
  if (/meeting|office|shift|work/.test(lower)) return "handle a work-related schedule";
  if (/team/.test(lower) && /outing|gala|trip/.test(lower)) return "join a team outing";
  if (/gala|lakad|alis|labas|outing|trip|hangout/.test(lower)) return "go out for a personal activity";

  return `work through “${source || form.title || "this schedule"}”`;
}

function getOpeningMessage(form) {
  return `Hi Max, so you want to ${getEventPhrase(form)}. Am I understanding that correctly?`;
}

const DEFAULT_EXPENSE_PATH = [
  {
    category: "transport",
    label: "Transportation",
    sub_items: [
      { key: "transport_going_there", label: "Going to the fellowship", status: "pending", amount: 0 },
      { key: "transport_going_home", label: "Going back home", status: "pending", amount: 0 },
      { key: "transport_extra_stop", label: "Extra stop or side trip", status: "pending", amount: 0 },
    ],
  },
  {
    category: "food",
    label: "Food and drinks",
    sub_items: [
      { key: "food_personal", label: "Personal food or drinks", status: "pending", amount: 0 },
      { key: "food_treat_someone", label: "Treating someone / accountable person", status: "pending", amount: 0 },
      { key: "food_group_share", label: "Shared food contribution", status: "pending", amount: 0 },
    ],
  },
  {
    category: "fees",
    label: "Fees or contribution",
    sub_items: [
      { key: "fees_church_group", label: "Church or group contribution", status: "pending", amount: 0 },
      { key: "fees_venue", label: "Venue, entrance, or table fee", status: "pending", amount: 0 },
    ],
  },
  {
    category: "buffer",
    label: "Emergency buffer",
    sub_items: [{ key: "buffer_emergency", label: "Small emergency buffer", status: "pending", amount: 0 }],
  },
];

const CATEGORY_ORDER = DEFAULT_EXPENSE_PATH.map((category) => category.category);

function clonePath(path = DEFAULT_EXPENSE_PATH) {
  return path.map((category) => ({ ...category, sub_items: category.sub_items.map((item) => ({ ...item })) }));
}

function normalizeExpensePath(path) {
  const source = Array.isArray(path) && path.length ? path : DEFAULT_EXPENSE_PATH;
  return source
    .map((category) => ({
      category: cleanText(category.category),
      label: cleanText(category.label) || cleanText(category.category),
      sub_items: (Array.isArray(category.sub_items) ? category.sub_items : [])
        .map((item) => ({
          key: cleanText(item.key),
          label: cleanText(item.label),
          status: ["pending", "completed", "skipped"].includes(cleanText(item.status)) ? cleanText(item.status) : "pending",
          amount: Math.max(0, Math.round(Number(item.amount || 0))),
        }))
        .filter((item) => item.key && item.label),
    }))
    .filter((category) => category.category && category.sub_items.length);
}

function sumPath(path = []) {
  return normalizeExpensePath(path).reduce((total, category) => total + category.sub_items.reduce((sum, item) => sum + Number(item.amount || 0), 0), 0);
}

function findSubItem(path = [], key = "") {
  for (const category of normalizeExpensePath(path)) {
    const item = category.sub_items.find((subItem) => subItem.key === key);
    if (item) return { category, item };
  }
  return { category: null, item: null };
}

function getFirstPending(path = []) {
  for (const category of normalizeExpensePath(path)) {
    const item = category.sub_items.find((subItem) => subItem.status === "pending");
    if (item) return { category: category.category, subItem: item.key, categoryLabel: category.label, subItemLabel: item.label };
  }
  return { category: "", subItem: "", categoryLabel: "", subItemLabel: "" };
}

function getCategoryTotal(path = [], categoryKey = "") {
  const category = normalizeExpensePath(path).find((item) => item.category === categoryKey);
  return category ? category.sub_items.reduce((sum, subItem) => sum + Number(subItem.amount || 0), 0) : 0;
}

function getNextCategoryAfter(path = [], categoryKey = "") {
  const normalized = normalizeExpensePath(path);
  const currentIndex = normalized.findIndex((category) => category.category === categoryKey);
  if (currentIndex === -1) return null;
  for (let index = currentIndex + 1; index < normalized.length; index += 1) {
    const pending = normalized[index].sub_items.find((item) => item.status === "pending");
    if (pending) return { category: normalized[index], item: pending };
  }
  return null;
}

function updatePathSubItem(path = [], subItemKey = "", amount = 0, status = "completed") {
  const normalized = normalizeExpensePath(path);
  return normalized.map((category) => ({
    ...category,
    sub_items: category.sub_items.map((item) =>
      item.key === subItemKey ? { ...item, amount: Math.max(0, Math.round(Number(amount || 0))), status } : item
    ),
  }));
}

function formatPeso(value) {
  return `₱${Math.max(0, Number(value || 0)).toLocaleString()}`;
}

function getLocalPromptForSubItem(subItemKey, path = []) {
  const { category, item } = findSubItem(path, subItemKey);
  if (!item) return "How much should I estimate for this part?";
  if (item.key === "transport_going_there") return "Let’s start with transportation. First, how much might you spend going to the fellowship?";
  if (item.key === "transport_going_home") return "How about going back home? Will you spend the same amount, more, less, or none?";
  if (item.key === "transport_extra_stop") return "Any extra stop or side trip after the fellowship?";
  if (item.key === "food_personal") return "Next, food and drinks. How much might you spend for your own food or drinks?";
  if (item.key === "food_treat_someone") return "Will you treat someone or pay for another person’s food?";
  if (item.key === "food_group_share") return "Will there be any shared food contribution with the group?";
  if (item.key === "fees_church_group") return "Will there be any church or group contribution for this fellowship?";
  if (item.key === "fees_venue") return "Any venue, entrance, table, or reservation fee?";
  if (item.key === "buffer_emergency") return "Last one: do you want to add a small emergency buffer just in case?";
  return `For ${category?.label || "this category"}, how much should I estimate for ${item.label}?`;
}

function getFirstSubItem(categoryKey = "transport", path = []) {
  const category = normalizeExpensePath(path).find((item) => item.category === categoryKey);
  return category?.sub_items?.[0]?.key || "";
}

function buildSummaryMessage(total, path = []) {
  const lines = normalizeExpensePath(path)
    .map((category) => `${category.label}: ${formatPeso(getCategoryTotal(path, category.category))}`)
    .join("\n");
  return `Here’s the estimated money impact for this schedule:\n${lines}\n\nEstimated total: ${formatPeso(total)}. Does this look right?`;
}

function getLocalReplyForStage({ stage, reply, total, expensePath, activeCategory, activeSubItem }) {
  const path = normalizeExpensePath(expensePath);

  if (stage === "confirm_intent") {
    if (isAffirmative(reply)) return { stage: "ask_permission", total, expensePath: path, activeCategory, activeSubItem, message: "Great! I’ll treat this as your confirmed schedule. Before saving, let’s assess possible spending for it. Ready to start?" };
    return { stage: "clarify_intent", total, expensePath: path, activeCategory, activeSubItem, message: "No worries. What do you really want this schedule to mean?" };
  }

  if (stage === "clarify_intent") return { stage: "ask_permission", total, expensePath: path, activeCategory, activeSubItem, message: "Got it. I’ll use that as the context. Ready to start checking the possible spending?" };
  if (stage === "ask_permission") {
    if (isAffirmative(reply)) {
      const first = getFirstPending(path);
      return { stage: "category_assessment", total, expensePath: path, activeCategory: first.category, activeSubItem: first.subItem, message: getLocalPromptForSubItem(first.subItem, path) };
    }
    return { stage: "ask_permission", total, expensePath: path, activeCategory, activeSubItem, message: "Sure. Reply “Start” whenever you’re ready, and we’ll go one spending part at a time." };
  }

  if (stage === "category_assessment") {
    const { category, item } = findSubItem(path, activeSubItem);
    if (!item) return { stage: "complete", total, expensePath: path, activeCategory: "", activeSubItem: "", message: buildSummaryMessage(total, path) };

    const previousAmount = item.key === "transport_going_home" ? findSubItem(path, "transport_going_there").item?.amount || 0 : 0;
    const sameReply = /^same$/i.test(cleanText(reply)) && previousAmount > 0;
    const hasClearZero = isNegativeOrFree(reply);
    const hasClearCost = isClearMoneyReply(reply) || sameReply;
    const amount = sameReply ? previousAmount : hasClearCost ? parseAmount(reply) : 0;

    if (!hasClearCost && !hasClearZero) {
      const quantityPrompt = isQuantityOnlyReply(reply) ? `Got it. For ${item.label.toLowerCase()}, how much do you think that might cost in total?` : `For ${item.label.toLowerCase()}, how much should I estimate? You can reply with an amount like 100, or say none/free.`;
      return { stage, total, expensePath: path, activeCategory: category.category, activeSubItem: item.key, message: quantityPrompt };
    }

    const updatedPath = updatePathSubItem(path, item.key, amount, hasClearZero ? "skipped" : "completed");
    const next = getFirstPending(updatedPath);
    const nextTotal = sumPath(updatedPath);
    const categoryTotal = getCategoryTotal(updatedPath, category.category);
    const acknowledge = hasClearZero ? `Okay, I’ll skip ${item.label.toLowerCase()}.` : `Got it — ${formatPeso(amount)} for ${item.label.toLowerCase()}.`;

    if (!next.subItem) return { stage: "complete", total: nextTotal, expensePath: updatedPath, activeCategory: "", activeSubItem: "", message: `${acknowledge}\n\n${buildSummaryMessage(nextTotal, updatedPath)}` };

    if (next.category !== category.category) {
      const nextCategory = normalizeExpensePath(updatedPath).find((itemCategory) => itemCategory.category === next.category);
      return { stage: "category_assessment", total: nextTotal, expensePath: updatedPath, activeCategory: next.category, activeSubItem: next.subItem, message: `${acknowledge} ${category.label} total is ${formatPeso(categoryTotal)}.\n\nNext, let’s check ${nextCategory?.label?.toLowerCase() || "the next category"}. ${getLocalPromptForSubItem(next.subItem, updatedPath)}` };
    }

    return { stage: "category_assessment", total: nextTotal, expensePath: updatedPath, activeCategory: next.category, activeSubItem: next.subItem, message: `${acknowledge}\n\n${getLocalPromptForSubItem(next.subItem, updatedPath)}` };
  }

  return { stage: "complete", total, expensePath: path, activeCategory: "", activeSubItem: "", message: buildSummaryMessage(total, path) };
}

function normalizeGeminiStage(value, fallback) {
  const stage = cleanText(value).toLowerCase();
  const allowed = new Set(["confirm_intent", "clarify_intent", "ask_permission", "category_assessment", "category_summary", "complete", "transport", "food", "fees", "shared", "buffer"]);
  if (["transport", "food", "fees", "shared", "buffer"].includes(stage)) return "category_assessment";
  return allowed.has(stage) ? stage : fallback;
}

function applyAiPathResult({ ai, currentPath, currentTotal, activeSubItem }) {
  let nextPath = normalizeExpensePath(currentPath);
  const aiPath = normalizeExpensePath(ai?.expense_path);
  if (aiPath.length) nextPath = aiPath;

  const shouldAdd = Boolean(ai?.should_add_cost) && cleanText(ai?.cost_sub_item);
  const shouldSkip = Boolean(ai?.should_skip_sub_item) && cleanText(ai?.skipped_sub_item);

  if (shouldAdd) nextPath = updatePathSubItem(nextPath, cleanText(ai.cost_sub_item), ai.confirmed_cost, "completed");
  if (shouldSkip) nextPath = updatePathSubItem(nextPath, cleanText(ai.skipped_sub_item), 0, "skipped");

  const nextPending = getFirstPending(nextPath);
  const activeCandidate = cleanText(ai?.active_sub_item) || nextPending.subItem || activeSubItem;
  const candidateLookup = findSubItem(nextPath, activeCandidate);
  const nextActiveSubItem = candidateLookup.item?.status === "pending" ? activeCandidate : nextPending.subItem;
  const nextActiveCategory = nextActiveSubItem ? findSubItem(nextPath, nextActiveSubItem).category?.category || nextPending.category : "";

  return {
    expensePath: nextPath,
    total: sumPath(nextPath) || currentTotal,
    activeCategory: nextActiveCategory,
    activeSubItem: nextActiveSubItem,
    costWasAddedOrSkipped: shouldAdd || shouldSkip,
  };
}

function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [locked]);
}

function ExpensePathSummary({ path }) {
  const categories = normalizeExpensePath(path);
  if (!categories.length) return null;

  return (
    <div className="mt-3 rounded-[20px] border border-white/8 bg-white/[0.025] px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/34">Expense path</p>
      <div className="mt-2 space-y-1.5">
        {categories.map((category) => (
          <div key={category.category} className="flex items-center justify-between gap-3 text-[11px] font-bold text-white/48">
            <span className="truncate">{category.label}</span>
            <span>{formatPeso(getCategoryTotal(categories, category.category))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleImpactChat({ session, input, setInput, thinking, onSend, onClose, onUseEstimate }) {
  if (!session) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000] isolate flex justify-center overflow-hidden bg-[#020617] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_36%),linear-gradient(180deg,#020617_0%,#071026_48%,#050816_100%)]" />
        <div className="relative flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden border-x border-cyan-200/10 bg-[#071026]/95 shadow-[0_0_80px_rgba(34,211,238,0.10)] backdrop-blur-2xl">
          <header className="shrink-0 border-b border-white/10 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/62">CLARA Impact Coach</p>
                <h2 className="mt-2 text-xl font-black leading-tight text-white">Calculate money impact</h2>
                <p className="mt-1 truncate text-xs font-semibold text-white/70">{session.form.title}</p>
                {session.form.note ? <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/34">{session.form.note}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/66 active:scale-95" aria-label="Close impact coach">×</button>
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_24px_rgba(34,211,238,0.06)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/58">Running estimate</p>
              <p className="mt-1 text-2xl font-black text-white">{formatPeso(session.total)}</p>
            </div>
            <ExpensePathSummary path={session.expensePath} />
          </header>

          <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {session.messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] whitespace-pre-line rounded-[22px] px-4 py-3 text-sm font-semibold leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${message.role === "user" ? "bg-cyan-300/[0.12] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.08)]" : "border border-white/12 bg-white/[0.035] text-white/76"}`}>{message.text}</div>
              </div>
            ))}
            {thinking ? <div className="flex justify-start"><div className="rounded-[22px] border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/54">CLARA is thinking…</div></div> : null}
          </main>

          <footer className="shrink-0 border-t border-white/10 bg-[#071026]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-2xl">
            {session.total > 0 ? <button type="button" onClick={() => onUseEstimate(session.total)} className="mb-3 w-full rounded-2xl border border-cyan-300/24 bg-cyan-300/[0.10] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.08)]">Use {formatPeso(session.total)} estimate</button> : null}
            <form onSubmit={onSend} className="flex gap-2">
              <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Reply with amount or details..." disabled={thinking} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32 disabled:opacity-60" />
              <button type="submit" disabled={thinking || !cleanText(input)} className="rounded-2xl border border-cyan-300/22 bg-cyan-300/[0.10] px-4 py-3 text-sm font-black text-cyan-50 disabled:opacity-50">Send</button>
            </form>
          </footer>
        </div>
      </div>
    </Portal>
  );
}

function hideRefineButtons(root) {
  if (!root) return;
  root.querySelectorAll("button").forEach((button) => {
    const label = cleanText(button.textContent).toLowerCase();
    if (!label.includes("refine with clara")) return;
    button.style.display = "none";
    button.setAttribute("aria-hidden", "true");
    button.setAttribute("tabindex", "-1");
  });
}

export default function DashboardScheduleImpactPortalPanel() {
  const rootRef = useRef(null);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  useBodyScrollLock(Boolean(session));

  const startImpactChat = async (form) => {
    const cleanTitle = cleanText(form.title) || makeTitle(form.note, form.type);
    const preparedForm = { ...form, title: cleanTitle, note: cleanText(form.note) || makeDescription(form.note, cleanTitle) };
    const basePath = clonePath(DEFAULT_EXPENSE_PATH);

    if (form.elements?.titleInput && !cleanText(form.elements.titleInput.value)) updateControlledField(form.elements.titleInput, cleanTitle);
    if (form.elements?.noteInput && !cleanText(form.elements.noteInput.value)) updateControlledField(form.elements.noteInput, preparedForm.note);

    const baseSession = { form: preparedForm, total: 0, expensePath: basePath, stage: "confirm_intent", activeCategory: "", activeSubItem: "", messages: [] };
    setInput("");
    setThinking(true);
    setSession(baseSession);

    try {
      const ai = await askGeminiForScheduleImpact({ form: preparedForm, messages: [], stage: "confirm_intent", activeCategory: "", activeSubItem: "", expensePath: basePath, total: 0, latestUserReply: "" });
      const suggestions = applyScheduleSuggestions(rootRef.current, ai);
      const nextForm = { ...preparedForm, ...suggestions };
      const nextPath = normalizeExpensePath(ai.expense_path).length ? normalizeExpensePath(ai.expense_path) : basePath;
      setSession({ ...baseSession, form: nextForm, expensePath: nextPath, stage: normalizeGeminiStage(ai.stage, "confirm_intent"), activeCategory: ai.active_category || "", activeSubItem: ai.active_sub_item || "", messages: [{ role: "assistant", text: cleanText(ai.assistant_message) || getOpeningMessage(nextForm) }] });
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI unavailable, using local safety reply:", error);
      setSession({ ...baseSession, messages: [{ role: "assistant", text: getOpeningMessage(preparedForm) }] });
    } finally {
      setThinking(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    const reply = cleanText(input);
    if (!reply || !session || thinking) return;

    const currentStage = session.stage;
    const nextUserMessage = { role: "user", text: reply };
    const optimisticMessages = [...(session.messages || []), nextUserMessage];

    setInput("");
    setThinking(true);
    setSession((current) => ({ ...current, messages: optimisticMessages }));

    try {
      const ai = await askGeminiForScheduleImpact({ form: session.form, messages: optimisticMessages, stage: currentStage, activeCategory: session.activeCategory, activeSubItem: session.activeSubItem, expensePath: session.expensePath, total: session.total, latestUserReply: reply });
      const suggestions = applyScheduleSuggestions(rootRef.current, ai);
      const applied = applyAiPathResult({ ai, currentPath: session.expensePath, currentTotal: session.total, activeSubItem: session.activeSubItem });
      const finalPending = getFirstPending(applied.expensePath);
      const normalizedStage = normalizeGeminiStage(ai.stage, currentStage);
      const nextStage = finalPending.subItem ? (normalizedStage === "confirm_intent" || normalizedStage === "ask_permission" || normalizedStage === "clarify_intent" ? normalizedStage : "category_assessment") : "complete";

      setSession((current) => ({
        ...current,
        form: { ...(current?.form || session.form), ...suggestions },
        stage: nextStage,
        total: applied.total,
        expensePath: applied.expensePath,
        activeCategory: applied.activeCategory,
        activeSubItem: applied.activeSubItem,
        messages: [...optimisticMessages, { role: "assistant", text: cleanText(ai.assistant_message) || getLocalReplyForStage({ stage: currentStage, reply, total: session.total, expensePath: session.expensePath, activeCategory: session.activeCategory, activeSubItem: session.activeSubItem }).message }],
      }));
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI reply unavailable, using local safety reply:", error);
      const local = getLocalReplyForStage({ stage: currentStage, reply, total: session.total, expensePath: session.expensePath, activeCategory: session.activeCategory, activeSubItem: session.activeSubItem });
      setSession((current) => ({ ...current, stage: local.stage, total: local.total, expensePath: local.expensePath, activeCategory: local.activeCategory, activeSubItem: local.activeSubItem, messages: [...optimisticMessages, { role: "assistant", text: local.message }] }));
    } finally {
      setThinking(false);
    }
  };

  const useEstimate = (amount) => {
    const root = rootRef.current;
    const form = root ? readForm(root) : null;
    if (form?.elements?.amountInput) updateControlledField(form.elements.amountInput, formatPeso(amount));
    setSession(null);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof MutationObserver === "undefined") return undefined;
    hideRefineButtons(root);
    const observer = new MutationObserver(() => hideRefineButtons(root));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      const root = rootRef.current;
      const button = event.target?.closest?.("button");
      if (!root || !button || !root.contains(button)) return;
      const label = cleanText(button.textContent).toLowerCase();
      if (label.includes("refine with clara")) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.(); return; }
      if (!label.includes("calculate money impact")) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      startImpactChat(readForm(root));
    };

    const onSubmit = (event) => {
      const root = rootRef.current;
      if (!root || !root.contains(event.target)) return;
      const submitterText = cleanText(event.submitter?.textContent).toLowerCase();
      if (!submitterText.includes("calculate money impact")) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      startImpactChat(readForm(root));
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [session, thinking]);

  return (
    <div ref={rootRef} className="contents">
      <OriginalDashboardSchedulePanel />
      <ScheduleImpactChat session={session} input={input} setInput={setInput} thinking={thinking} onSend={sendReply} onClose={() => setSession(null)} onUseEstimate={useEstimate} />
    </div>
  );
}
