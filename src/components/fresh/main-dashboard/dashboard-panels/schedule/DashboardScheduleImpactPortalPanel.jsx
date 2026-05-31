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

  if (/gala|lakad|alis|labas|outing|hangout/.test(lower) && /church|service|simbahan/.test(lower)) {
    return "Simple fellowship with churchmates after the church service.";
  }
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

  return {
    title: suggestedTitle || form.title,
    note: suggestedDescription || form.note,
  };
}

function parseAmount(text) {
  const match = String(text || "").replace(/,/g, "").match(/(?:₱|php\s*)?\s*(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  return Math.round(Number(match[1]) || 0);
}

function isAffirmative(value) {
  return /\b(yes|yeah|yep|yup|correct|tama|oo|opo|sure|sige|go|start|okay|ok|alright)\b/i.test(cleanText(value));
}

function isNegativeOrFree(value) {
  return /\b(no|none|wala|free|libre|zero|0|not really|hindi|skip)\b/i.test(cleanText(value));
}

function isQuantityOnlyReply(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return false;
  return /\b(ride|rides|jeep|jeepney|tricycle|bus|train|taxi|grab|angkas|people|person|persons|friend|friends|churchmate|churchmates|ticket|tickets|item|items|piece|pieces|times|pax)\b/.test(text) && !/(₱|php|peso|pesos|fare|cost|budget|spend|around|maybe|estimate)/i.test(text);
}

function isClearMoneyReply(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return false;
  if (isQuantityOnlyReply(text)) return false;
  if (/(₱|php|peso|pesos|fare|cost|budget|spend|around|maybe|estimate)/i.test(text) && parseAmount(text) > 0) return true;
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

const IMPACT_STEPS = {
  transport: { key: "transport", label: "transportation", question: "Alright. First, let’s estimate transportation. How much do you think you might spend on fare, gas, parking, or ride booking?" },
  food: { key: "food", label: "food and drinks", question: "Next, food and drinks. How much might you spend for snacks, meals, or drinks?" },
  fees: { key: "fees", label: "fees or contributions", question: "Will there be any contribution, entrance fee, ticket, offering, or shared payment for this plan?" },
  shared: { key: "shared", label: "shared or extra group costs", question: "Any gift, group share, or extra spending you might need to prepare for?" },
  buffer: { key: "buffer", label: "emergency buffer", question: "Last one: do you want to add a small emergency buffer just in case something unexpected comes up?" },
};

const STEP_ORDER = ["transport", "food", "fees", "shared", "buffer"];

function getNextStep(stage) {
  const index = STEP_ORDER.indexOf(stage);
  return STEP_ORDER[index + 1] || "summary";
}

function formatPeso(value) {
  return `₱${Math.max(0, Number(value || 0)).toLocaleString()}`;
}

function sumBreakdown(breakdown = {}) {
  return Object.values(breakdown || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function buildSummaryMessage(total, breakdown = {}) {
  const lines = STEP_ORDER.map((key) => `${IMPACT_STEPS[key].label}: ${formatPeso(breakdown[key] || 0)}`).join("\n");
  return `Here’s the estimated money impact for this schedule:\n${lines}\n\nEstimated total: ${formatPeso(total)}. Does this look right?`;
}

function getLocalReplyForStage({ stage, reply, total, breakdown, form }) {
  if (stage === "confirm_intent") {
    if (isAffirmative(reply)) return { stage: "ask_permission", total, breakdown, message: "Great! I’ll treat this as your confirmed schedule. Before saving, let’s assess possible spending for it. Ready to start?" };
    return { stage: "clarify_intent", total, breakdown, message: "No worries. What do you really want this schedule to mean?" };
  }

  if (stage === "clarify_intent") return { stage: "ask_permission", total, breakdown, message: "Got it. I’ll use that as the context. Ready to start checking the possible spending?" };
  if (stage === "ask_permission") {
    if (isAffirmative(reply)) return { stage: "transport", total, breakdown, message: IMPACT_STEPS.transport.question };
    return { stage: "ask_permission", total, breakdown, message: "Sure. Reply “Start” whenever you’re ready, and we’ll go one spending area at a time." };
  }

  if (STEP_ORDER.includes(stage)) {
    const step = IMPACT_STEPS[stage];
    const hasClearZero = isNegativeOrFree(reply);
    const hasClearCost = isClearMoneyReply(reply);
    const amount = hasClearCost ? parseAmount(reply) : 0;

    if (!hasClearCost && !hasClearZero) {
      const quantityPrompt = isQuantityOnlyReply(reply) ? `Got it. For ${step.label}, how much do you think that might cost in total?` : `For ${step.label}, how much should I estimate? You can reply with an amount like 100, or say none/free.`;
      return { stage, total, breakdown, message: quantityPrompt };
    }

    const nextBreakdown = { ...breakdown, [step.key]: amount };
    const nextTotal = sumBreakdown(nextBreakdown);
    const nextStage = getNextStep(stage);
    const acknowledge = amount > 0 ? `Got it — adding ${formatPeso(amount)} for ${step.label}.` : `Got it — ${formatPeso(0)} for ${step.label}.`;

    if (nextStage === "summary") return { stage: "complete", total: nextTotal, breakdown: nextBreakdown, message: `${acknowledge}\n\n${buildSummaryMessage(nextTotal, nextBreakdown)}` };
    return { stage: nextStage, total: nextTotal, breakdown: nextBreakdown, message: `${acknowledge}\n\n${IMPACT_STEPS[nextStage].question}` };
  }

  return { stage: "complete", total, breakdown, message: `Your current estimated impact for ${form?.title || "this schedule"} is ${formatPeso(total)}. You can use this estimate or adjust the details before saving.` };
}

function normalizeGeminiStage(value, fallback) {
  const stage = cleanText(value).toLowerCase();
  const allowed = new Set(["confirm_intent", "clarify_intent", "ask_permission", "transport", "food", "fees", "shared", "buffer", "complete"]);
  return allowed.has(stage) ? stage : fallback;
}

function getStageAfterGemini({ currentStage, geminiStage, reply, costWasAdded }) {
  const normalized = normalizeGeminiStage(geminiStage, currentStage);
  if (currentStage === "confirm_intent" && isAffirmative(reply)) return "ask_permission";
  if (currentStage === "ask_permission" && isAffirmative(reply)) return "transport";
  if (STEP_ORDER.includes(currentStage) && costWasAdded) return getNextStep(currentStage) === "summary" ? "complete" : getNextStep(currentStage);
  if (STEP_ORDER.includes(currentStage) && !costWasAdded && !isNegativeOrFree(reply)) return currentStage;
  return normalized;
}

function applyConfirmedCost({ ai, currentStage, currentBreakdown = {}, currentTotal = 0 }) {
  const category = cleanText(ai?.cost_category || "");
  const isValidCategory = STEP_ORDER.includes(category);
  const shouldAdd = Boolean(ai?.should_add_cost) && isValidCategory;
  const amount = Math.max(0, Number(ai?.confirmed_cost || 0));

  if (!shouldAdd) return { breakdown: currentBreakdown, total: currentTotal, costWasAdded: false };
  const targetCategory = category || currentStage;
  const nextBreakdown = { ...currentBreakdown, [targetCategory]: Math.round(amount) };
  return { breakdown: nextBreakdown, total: sumBreakdown(nextBreakdown), costWasAdded: true };
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
                <p className="mt-1 truncate text-xs font-semibold text-white/44">{session.form.title}</p>
                {session.form.note ? <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/30">{session.form.note}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/66 active:scale-95" aria-label="Close impact coach">×</button>
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_24px_rgba(34,211,238,0.06)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/58">Running estimate</p>
              <p className="mt-1 text-2xl font-black text-white">{formatPeso(session.total)}</p>
            </div>
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

    if (form.elements?.titleInput && !cleanText(form.elements.titleInput.value)) updateControlledField(form.elements.titleInput, cleanTitle);
    if (form.elements?.noteInput && !cleanText(form.elements.noteInput.value)) updateControlledField(form.elements.noteInput, preparedForm.note);

    const baseSession = { form: preparedForm, total: 0, breakdown: {}, stage: "confirm_intent", messages: [] };
    setInput("");
    setThinking(true);
    setSession(baseSession);

    try {
      const ai = await askGeminiForScheduleImpact({ form: preparedForm, messages: [], stage: "confirm_intent", total: 0, breakdown: {}, latestUserReply: "" });
      const suggestions = applyScheduleSuggestions(rootRef.current, ai);
      const nextForm = { ...preparedForm, ...suggestions };
      setSession({ ...baseSession, form: nextForm, stage: normalizeGeminiStage(ai.stage, "confirm_intent"), messages: [{ role: "assistant", text: cleanText(ai.assistant_message) || getOpeningMessage(nextForm) }] });
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
      const ai = await askGeminiForScheduleImpact({ form: session.form, messages: optimisticMessages, stage: currentStage, total: session.total, breakdown: session.breakdown || {}, latestUserReply: reply });
      const suggestions = applyScheduleSuggestions(rootRef.current, ai);
      const applied = applyConfirmedCost({ ai, currentStage, currentBreakdown: session.breakdown || {}, currentTotal: session.total });
      const nextStage = getStageAfterGemini({ currentStage, geminiStage: ai.stage, reply, costWasAdded: applied.costWasAdded });

      setSession((current) => ({
        ...current,
        form: { ...(current?.form || session.form), ...suggestions },
        stage: nextStage,
        total: applied.total,
        breakdown: applied.breakdown,
        messages: [...optimisticMessages, { role: "assistant", text: cleanText(ai.assistant_message) || getLocalReplyForStage({ stage: currentStage, reply, total: session.total, breakdown: session.breakdown || {}, form: session.form }).message }],
      }));
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI reply unavailable, using local safety reply:", error);
      const local = getLocalReplyForStage({ stage: currentStage, reply, total: session.total, breakdown: session.breakdown || {}, form: session.form });
      setSession((current) => ({ ...current, stage: local.stage, total: local.total, breakdown: local.breakdown, messages: [...optimisticMessages, { role: "assistant", text: local.message }] }));
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
