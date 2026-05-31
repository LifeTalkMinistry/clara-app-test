import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { askGeminiForUnderstanding } from "@/lib/ai-command/gemini-service";
import { askGeminiForScheduleRefinement } from "@/lib/ai-command/schedule-refinement-service";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function makeTitle(value, type) {
  const text = cleanText(value).replace(/[.!?]+$/g, "");
  if (/church/i.test(text) && /outing/i.test(text)) return "Church outing";
  if (/church/i.test(text)) return "Church event";
  if (/outing|beach|resort|trip/i.test(text)) return "Outing";
  if (/meeting|office|shift|work/i.test(text)) return "Work schedule";
  if (/family|birthday|fiesta/i.test(text)) return "Family schedule";
  const shortText = text.split(" ").filter(Boolean).slice(0, 4).join(" ");
  return shortText || `${type || "Personal"} schedule`;
}

function readForm(root) {
  const dialog = root.querySelector('[role="dialog"]');
  const titleInput = dialog?.querySelector('input[placeholder="Schedule title"]');
  const noteInput = dialog?.querySelector("textarea");
  const typeInput = dialog?.querySelector("select");
  const dateInput = dialog?.querySelector('input[type="date"]');
  const timeInput = dialog?.querySelector('input[type="time"]');
  const amountInput = dialog?.querySelector('input[placeholder="AI will calculate"]');
  const note = cleanText(noteInput?.value);
  const type = cleanText(typeInput?.value) || "Personal";

  return {
    title: cleanText(titleInput?.value) || makeTitle(note, type),
    note,
    type,
    date: dateInput?.value || "",
    time: timeInput?.value || "",
    amount: amountInput?.value || "",
    elements: { titleInput, noteInput, typeInput, amountInput },
  };
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

function mapToScheduleType(category) {
  const raw = cleanText(category).toLowerCase();
  if (raw.includes("work")) return "Work";
  if (raw.includes("family")) return "Family";
  if (raw.includes("health")) return "Health";
  if (raw.includes("relationship")) return "Relationship";
  if (raw.includes("bill")) return "Bill";
  if (raw.includes("payday")) return "Payday";
  return "Personal";
}

function applyRefinementToForm(root, result) {
  const form = readForm(root);
  const suggestedTitle = cleanText(result?.suggested_title);
  const suggestedType = mapToScheduleType(result?.suggested_category);

  if (suggestedTitle && !cleanText(form.elements.titleInput?.value)) {
    updateControlledField(form.elements.titleInput, suggestedTitle);
  }

  if (suggestedType && form.elements.typeInput) {
    updateControlledField(form.elements.typeInput, suggestedType);
  }
}

function parseAmount(text) {
  const match = String(text || "").replace(/,/g, "").match(/(?:₱|php\s*)?\s*(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  return Math.round(Number(match[1]) || 0);
}

function isGeminiFallback(result) {
  const message = cleanText(result?.assistantMessage).toLowerCase();
  return (
    result?.meta?.source === "local_fallback" ||
    message.includes("trouble reaching gemini") ||
    message.includes("expense, wallet update, or budget action")
  );
}

function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function InlinePortal({ target, children }) {
  if (!target || typeof document === "undefined") return null;
  return createPortal(children, target);
}

function ensureRefinementTarget(root) {
  const textarea = root?.querySelector('[role="dialog"] textarea');
  if (!textarea) return null;

  let target = root.querySelector("[data-clara-schedule-refinement-inline]");
  if (target) return target;

  target = document.createElement("div");
  target.setAttribute("data-clara-schedule-refinement-inline", "true");
  target.className = "mt-3";
  textarea.insertAdjacentElement("afterend", target);
  return target;
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

async function askScheduleImpactAI({ form, messages, total, userReply }) {
  const history = messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.text,
  }));

  const result = await askGeminiForUnderstanding({
    text: `You are CLARA's Schedule Impact Coach inside the Schedule page.

Your task is to have a natural AI conversation about possible expenses for this exact event.

Event:
${JSON.stringify({ title: form.title, note: form.note, type: form.type, date: form.date, time: form.time }, null, 2)}

Running estimate so far: PHP ${total}
Latest user reply: ${userReply || "The user just opened the impact coach."}

Rules:
- Do not use a fixed checklist.
- Think about the event context and ask the next most useful money-impact question.
- Ask only one question at a time.
- Keep it short, warm, and conversational.
- If the user gives an amount, acknowledge it and naturally move to the next likely expense.
- For church events, consider transport, food, offering/contribution, group share, and after-event spending only when relevant.
- Do not claim anything was saved.
- Do not say you cannot help with schedules.
- Do not ask generic wallet/budget commands.
- Reply as CLARA in one short assistantMessage.`,
    session: {
      history,
      currentCommand: {
        screen: "schedule",
        action: "ai_schedule_impact_chat",
        runningEstimate: total,
      },
    },
    financeSnapshot: {},
  });

  if (isGeminiFallback(result)) {
    throw new Error(result?.meta?.errorMessage || "Gemini is unavailable for schedule impact chat.");
  }

  return cleanText(result?.assistantMessage) || "What other possible spending should we include for this schedule?";
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
              <p className="mt-1 text-2xl font-black text-white">₱{session.total.toLocaleString()}</p>
            </div>
          </header>

          <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {session.messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] rounded-[22px] px-4 py-3 text-sm font-semibold leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${message.role === "user" ? "bg-cyan-300/[0.12] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.08)]" : "border border-white/12 bg-white/[0.035] text-white/76"}`}>
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
                Use ₱{session.total.toLocaleString()} estimate
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

function ScheduleRefinementInline({ target, session, input, setInput, thinking, onSend, onClose }) {
  if (!session || !target) return null;

  const result = session.result || {};
  const questions = Array.isArray(result.next_questions) ? result.next_questions : [];
  const missing = Array.isArray(result.missing_details) ? result.missing_details : [];

  return (
    <InlinePortal target={target}>
      <div className="rounded-[20px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(168,85,247,0.07))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100/62">CLARA refinement</p>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-black text-white/42">×</button>
        </div>

        {session.error ? (
          <p className="rounded-2xl border border-rose-300/18 bg-rose-400/[.075] px-3 py-2 text-xs font-bold leading-5 text-rose-50/82">
            CLARA couldn’t refine this yet. You can still save manually.
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="rounded-2xl border border-white/8 bg-white/[.035] px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/34">Refined intention</p>
              <p className="mt-1 text-xs font-bold leading-5 text-white/82">{result.refined_intention || "CLARA is clarifying this schedule."}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/8 bg-white/[.025] px-3 py-2">
                <p className="text-[8px] font-black uppercase tracking-[.12em] text-white/30">Title</p>
                <p className="mt-1 truncate text-[11px] font-bold text-white/68">{result.suggested_title || "Schedule plan"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[.025] px-3 py-2">
                <p className="text-[8px] font-black uppercase tracking-[.12em] text-white/30">Category</p>
                <p className="mt-1 truncate text-[11px] font-bold text-white/68">{result.suggested_category || "Personal"}</p>
              </div>
            </div>

            {missing.length ? (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.09em] text-white/44">{item}</span>
                ))}
              </div>
            ) : null}

            {questions.length ? (
              <div className="space-y-1.5">
                {questions.map((item, index) => (
                  <div key={`${item.key}-${index}`} className="rounded-2xl border border-white/8 bg-white/[.028] px-3 py-2">
                    <p className="text-xs font-black leading-5 text-white/82">{index + 1}. {item.question}</p>
                    {item.reason ? <p className="mt-0.5 text-[10px] font-semibold leading-4 text-white/38">{item.reason}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[.075] px-3 py-2 text-xs font-bold leading-5 text-emerald-50/82">This schedule looks clear now. Ready to save?</p>
            )}

            {thinking ? <p className="rounded-2xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs font-bold text-white/50">CLARA is refining…</p> : null}

            <form onSubmit={onSend} className="flex gap-2">
              <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Answer CLARA…" disabled={thinking} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-xs font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32 disabled:opacity-60" />
              <button type="submit" disabled={thinking || !cleanText(input)} className="rounded-2xl border border-cyan-300/22 bg-cyan-300/[0.10] px-3 py-2.5 text-xs font-black text-cyan-50 disabled:opacity-50">Send</button>
            </form>
          </div>
        )}
      </div>
    </InlinePortal>
  );
}

export default function DashboardScheduleImpactPortalPanel() {
  const rootRef = useRef(null);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [refineSession, setRefineSession] = useState(null);
  const [refineTarget, setRefineTarget] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [refineThinking, setRefineThinking] = useState(false);

  useBodyScrollLock(Boolean(session));

  const startImpactChat = async (form) => {
    const baseSession = { form, total: 0, messages: [] };
    setSession(baseSession);
    setInput("");
    setThinking(true);

    try {
      const firstMessage = await askScheduleImpactAI({ form, messages: [], total: 0, userReply: "" });
      setSession({ ...baseSession, messages: [{ role: "assistant", text: firstMessage }] });
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI unavailable:", error);
      setSession({ ...baseSession, messages: [{ role: "assistant", text: "I can't reach CLARA's AI brain right now. Please check the Gemini setup for this build, then try the impact coach again." }] });
    } finally {
      setThinking(false);
    }
  };

  const startRefinement = async (button = null) => {
    const root = rootRef.current;
    if (!root || refineThinking) return;

    const form = readForm(root);
    if (!cleanText(form.note || form.title)) return;

    const target = ensureRefinementTarget(root);
    setRefineTarget(target);
    setRefineInput("");
    setRefineThinking(true);
    setRefineSession({ form, result: null, error: false });

    const originalLabel = button?.textContent || "Refine with CLARA";
    if (button) {
      button.disabled = true;
      button.textContent = "CLARA is refining…";
      button.classList.add("cursor-wait", "opacity-70");
    }

    try {
      const result = await askGeminiForScheduleRefinement({ form, conversation: [] });
      applyRefinementToForm(root, result);
      setRefineSession({ form, result, error: false });
    } catch (error) {
      console.warn("[CLARA Schedule] Refinement unavailable:", error);
      setRefineSession({ form, result: null, error: true });
    } finally {
      setRefineThinking(false);
      if (button) {
        button.disabled = false;
        button.textContent = cleanText(originalLabel) || "Refine with CLARA";
        button.classList.remove("cursor-wait", "opacity-70");
      }
    }
  };

  const sendRefineReply = async (event) => {
    event.preventDefault();
    const reply = cleanText(refineInput);
    const root = rootRef.current;
    if (!reply || !root || !refineSession || refineThinking) return;

    const currentForm = readForm(root);
    setRefineInput("");
    setRefineThinking(true);

    try {
      const result = await askGeminiForScheduleRefinement({
        form: currentForm,
        conversation: [
          { role: "assistant", content: refineSession.result?.refined_intention || "" },
          { role: "user", content: reply },
        ],
        latestAnswer: reply,
      });
      applyRefinementToForm(root, result);
      setRefineSession({ form: currentForm, result, error: false });
    } catch (error) {
      console.warn("[CLARA Schedule] Follow-up refinement unavailable:", error);
      setRefineSession((current) => ({ ...current, error: true }));
    } finally {
      setRefineThinking(false);
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    const reply = cleanText(input);
    if (!reply || !session || thinking) return;

    const amount = parseAmount(reply);
    const nextTotal = amount > 0 ? session.total + amount : session.total;
    const nextMessages = [...session.messages, { role: "user", text: reply }];

    setSession({ ...session, total: nextTotal, messages: nextMessages });
    setInput("");
    setThinking(true);

    try {
      const aiMessage = await askScheduleImpactAI({ form: session.form, messages: nextMessages, total: nextTotal, userReply: reply });
      setSession((current) => ({ ...current, total: nextTotal, messages: [...nextMessages, { role: "assistant", text: aiMessage }] }));
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI unavailable:", error);
      setSession((current) => ({ ...current, total: nextTotal, messages: [...nextMessages, { role: "assistant", text: "I can't reach CLARA's AI brain right now, so I don't want to pretend this is an AI-guided estimate. Please check Gemini, then try again." }] }));
    } finally {
      setThinking(false);
    }
  };

  const useEstimate = (amount) => {
    const root = rootRef.current;
    const form = root ? readForm(root) : null;
    if (form?.elements?.amountInput) updateControlledField(form.elements.amountInput, `₱${amount}`);
    setSession(null);
  };

  useEffect(() => {
    const onClick = (event) => {
      const root = rootRef.current;
      const button = event.target?.closest?.("button");
      if (!root || !button || !root.contains(button)) return;

      const label = cleanText(button.textContent).toLowerCase();
      if (label.includes("refine with clara") || label.includes("clara is refining")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        startRefinement(button);
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
  }, [refineThinking, session, thinking]);

  return (
    <div ref={rootRef} className="contents">
      <OriginalDashboardSchedulePanel />
      <ScheduleImpactChat session={session} input={input} setInput={setInput} thinking={thinking} onSend={sendReply} onClose={() => setSession(null)} onUseEstimate={useEstimate} />
      <ScheduleRefinementInline target={refineTarget} session={refineSession} input={refineInput} setInput={setRefineInput} thinking={refineThinking} onSend={sendRefineReply} onClose={() => setRefineSession(null)} />
    </div>
  );
}
