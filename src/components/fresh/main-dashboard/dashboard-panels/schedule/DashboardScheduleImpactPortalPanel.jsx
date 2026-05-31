import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  if (/gala|lakad|alis|labas|outing|hangout/.test(lower) && /church|service|simbahan/.test(lower)) return "After-church outing";
  if (/birthday/.test(lower) && /mama|mom|mother|nanay/.test(lower)) return "Mama’s birthday plan";
  if (/birthday/.test(lower) && /papa|dad|father|tatay/.test(lower)) return "Papa’s birthday plan";
  if (/birthday/.test(lower)) return "Birthday preparation";
  if (/doctor|checkup|clinic|hospital|medical/.test(lower)) return "Doctor checkup";
  if (/renew/.test(lower) && /license|licence/.test(lower)) return "License renewal";
  if (/buy|bili|gift|regalo/.test(lower)) return "Gift buying errand";
  if (/team/.test(lower) && /outing|gala|trip/.test(lower)) return "Team outing";
  if (/church/.test(lower) && /outing/.test(lower)) return "Church outing";
  if (/church|service|simbahan|ministry/.test(lower)) return "Church event";
  if (/outing|beach|resort|trip|gala|lakad|alis|labas/.test(lower)) return "Personal outing";
  if (/meeting|office|shift|work/.test(lower)) return "Work meeting";
  if (/family|fiesta|mama|papa|nanay|tatay/.test(lower)) return "Family schedule";

  const shortText = text.split(" ").filter(Boolean).slice(0, 4).join(" ");
  return toTitleCase(shortText) || `${type || "Personal"} schedule`;
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

function getEventPhrase(form) {
  const source = cleanText(form.note || form.title);
  const lower = source.toLowerCase();

  if (/gala|lakad|alis|labas|outing|hangout/.test(lower) && /church|service|simbahan/.test(lower)) {
    return "go somewhere after church";
  }
  if (/birthday/.test(lower) && /mama|mom|mother|nanay/.test(lower)) {
    return "prepare for your mother’s birthday";
  }
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
  transport: {
    key: "transport",
    label: "transportation",
    question: "Alright. First, let’s estimate transportation. How much do you think you might spend on fare, gas, parking, or ride booking?",
  },
  food: {
    key: "food",
    label: "food and drinks",
    question: "Next, food and drinks. How much might you spend for snacks, meals, or drinks?",
  },
  fees: {
    key: "fees",
    label: "fees or contributions",
    question: "Will there be any contribution, entrance fee, ticket, offering, or shared payment for this plan?",
  },
  shared: {
    key: "shared",
    label: "shared or extra group costs",
    question: "Any gift, group share, or extra spending you might need to prepare for?",
  },
  buffer: {
    key: "buffer",
    label: "emergency buffer",
    question: "Last one: do you want to add a small emergency buffer just in case something unexpected comes up?",
  },
};

const STEP_ORDER = ["transport", "food", "fees", "shared", "buffer"];

function getNextStep(stage) {
  const index = STEP_ORDER.indexOf(stage);
  return STEP_ORDER[index + 1] || "summary";
}

function formatPeso(value) {
  return `₱${Math.max(0, Number(value || 0)).toLocaleString()}`;
}

function buildSummaryMessage(total, breakdown = {}) {
  const lines = STEP_ORDER
    .map((key) => `${IMPACT_STEPS[key].label}: ${formatPeso(breakdown[key] || 0)}`)
    .join("\n");

  return `Here’s the estimated money impact for this schedule:\n${lines}\n\nEstimated total: ${formatPeso(total)}. Does this look right?`;
}

function getReplyForStage({ stage, reply, total, breakdown }) {
  if (stage === "confirm_intent") {
    if (isAffirmative(reply)) {
      return {
        stage: "ask_permission",
        total,
        breakdown,
        message: "Great! That sounds exciting. Let’s assess the possible spending for this plan. Ready to start?",
      };
    }

    return {
      stage: "clarify_intent",
      total,
      breakdown,
      message: "No worries. What do you really want this schedule to mean?",
    };
  }

  if (stage === "clarify_intent") {
    return {
      stage: "ask_permission",
      total,
      breakdown,
      message: "Got it. I’ll use that as the context. Ready to start checking the possible spending?",
    };
  }

  if (stage === "ask_permission") {
    if (isAffirmative(reply)) {
      return {
        stage: "transport",
        total,
        breakdown,
        message: IMPACT_STEPS.transport.question,
      };
    }

    return {
      stage: "ask_permission",
      total,
      breakdown,
      message: "Sure. Reply “Start” whenever you’re ready, and we’ll go one spending area at a time.",
    };
  }

  if (STEP_ORDER.includes(stage)) {
    const step = IMPACT_STEPS[stage];
    const amount = parseAmount(reply);
    const hasClearZero = isNegativeOrFree(reply);

    if (amount <= 0 && !hasClearZero) {
      return {
        stage,
        total,
        breakdown,
        message: `For ${step.label}, how much should I estimate? You can reply with an amount like 100, or say none/free.`,
      };
    }

    const nextBreakdown = { ...breakdown, [step.key]: amount };
    const nextTotal = Object.values(nextBreakdown).reduce((sum, value) => sum + Number(value || 0), 0);
    const nextStage = getNextStep(stage);
    const acknowledge = amount > 0 ? `Got it — adding ${formatPeso(amount)} for ${step.label}.` : `Got it — ${formatPeso(0)} for ${step.label}.`;

    if (nextStage === "summary") {
      return {
        stage: "complete",
        total: nextTotal,
        breakdown: nextBreakdown,
        message: `${acknowledge}\n\n${buildSummaryMessage(nextTotal, nextBreakdown)}`,
      };
    }

    return {
      stage: nextStage,
      total: nextTotal,
      breakdown: nextBreakdown,
      message: `${acknowledge}\n\n${IMPACT_STEPS[nextStage].question}`,
    };
  }

  return {
    stage: "complete",
    total,
    breakdown,
    message: `Your current estimated impact is ${formatPeso(total)}. You can use this estimate or adjust the details before saving.`,
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
    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
              </div>
              <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/66 active:scale-95" aria-label="Close impact coach">
                ×
              </button>
            </div>

            <div className="mt-4 rounded-[22px] border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_24px_rgba(34,211,238,0.06)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/58">Running estimate</p>
              <p className="mt-1 text-2xl font-black text-white">{formatPeso(session.total)}</p>
            </div>
          </header>

          <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {session.messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] whitespace-pre-line rounded-[22px] px-4 py-3 text-sm font-semibold leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${message.role === "user" ? "bg-cyan-300/[0.12] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.08)]" : "border border-white/12 bg-white/[0.035] text-white/76"}`}>
                  {message.text}
                </div>
              </div>
            ))}

            {thinking ? (
              <div className="flex justify-start">
                <div className="rounded-[22px] border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/54">CLARA is thinking…</div>
              </div>
            ) : null}
          </main>

          <footer className="shrink-0 border-t border-white/10 bg-[#071026]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-2xl">
            {session.total > 0 ? (
              <button type="button" onClick={() => onUseEstimate(session.total)} className="mb-3 w-full rounded-2xl border border-cyan-300/24 bg-cyan-300/[0.10] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.08)]">
                Use {formatPeso(session.total)} estimate
              </button>
            ) : null}
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

  const startImpactChat = (form) => {
    const cleanTitle = cleanText(form.title) || makeTitle(form.note, form.type);
    const preparedForm = { ...form, title: cleanTitle };

    if (form.elements?.titleInput && !cleanText(form.elements.titleInput.value)) {
      updateControlledField(form.elements.titleInput, cleanTitle);
    }

    setInput("");
    setThinking(false);
    setSession({
      form: preparedForm,
      total: 0,
      breakdown: {},
      stage: "confirm_intent",
      messages: [{ role: "assistant", text: getOpeningMessage(preparedForm) }],
    });
  };

  const sendReply = (event) => {
    event.preventDefault();
    const reply = cleanText(input);
    if (!reply || !session || thinking) return;

    const nextUserMessage = { role: "user", text: reply };
    const nextState = getReplyForStage({
      stage: session.stage,
      reply,
      total: session.total,
      breakdown: session.breakdown || {},
    });

    setInput("");
    setThinking(false);
    setSession((current) => ({
      ...current,
      stage: nextState.stage,
      total: nextState.total,
      breakdown: nextState.breakdown,
      messages: [
        ...(current?.messages || []),
        nextUserMessage,
        { role: "assistant", text: nextState.message },
      ],
    }));
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
      if (label.includes("refine with clara")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }

      if (!label.includes("calculate money impact")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      startImpactChat(readForm(root));
    };

    const onSubmit = (event) => {
      const root = rootRef.current;
      if (!root || !root.contains(event.target)) return;
      const submitterText = cleanText(event.submitter?.textContent).toLowerCase();
      if (!submitterText.includes("calculate money impact")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
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
