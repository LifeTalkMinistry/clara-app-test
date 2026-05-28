import React, { useEffect, useRef, useState } from "react";
import { askGeminiForUnderstanding } from "@/lib/ai-command/gemini-service";
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

  const note = cleanText(noteInput?.value);
  const type = cleanText(typeInput?.value) || "Personal";
  const title = cleanText(titleInput?.value) || makeTitle(note, type);

  return {
    title,
    note,
    type,
    date: dateInput?.value || "",
    time: timeInput?.value || "",
  };
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

async function askScheduleImpactAI({ form, messages, total, userReply }) {
  const history = messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.text,
  }));

  const result = await askGeminiForUnderstanding({
    text: `You are CLARA's Schedule Impact Coach inside the Schedule page.

Your task is to have a natural AI conversation about possible expenses for this exact event.

Event:
${JSON.stringify(form, null, 2)}

Running estimate so far: PHP ${total}
Latest user reply: ${userReply || "The user just opened the impact coach."}

Rules:
- Do not use a fixed checklist.
- Think about the event context and ask the next most useful money-impact question.
- Ask only one question at a time.
- Keep it short, warm, and conversational.
- If the user reply is vague like "hmm", ask a helpful clarifying question instead of marking it zero.
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

function ScheduleImpactChat({ session, input, setInput, thinking, onSend, onClose }) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-[140] flex justify-center bg-[#020617] text-white">
      <div className="flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden border-x border-cyan-200/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_34%),#071026]">
        <header className="shrink-0 border-b border-white/10 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.1rem)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/62">CLARA impact coach</p>
              <h2 className="mt-2 text-xl font-black leading-tight text-white">Calculate money impact</h2>
              <p className="mt-1 truncate text-xs font-semibold text-white/42">{session.form.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/60"
              aria-label="Close impact coach"
            >
              ×
            </button>
          </div>

          <div className="mt-4 rounded-[22px] border border-cyan-200/25 bg-cyan-300/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/58">Running estimate</p>
            <p className="mt-1 text-2xl font-black text-white">₱{session.total.toLocaleString()}</p>
          </div>
        </header>

        <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {session.messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[84%] rounded-[22px] px-4 py-3 text-sm font-semibold leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${
                  message.role === "user"
                    ? "bg-cyan-300/[0.12] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                    : "border border-white/12 bg-white/[0.035] text-white/76"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {thinking ? (
            <div className="flex justify-start">
              <div className="rounded-[22px] border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/54">
                CLARA is thinking…
              </div>
            </div>
          ) : null}
        </main>

        <footer className="shrink-0 border-t border-white/10 bg-[#071026]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <form onSubmit={onSend} className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Reply with amount or details..."
              disabled={thinking}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/32 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={thinking || !cleanText(input)}
              className="rounded-2xl border border-cyan-300/22 bg-cyan-300/[0.10] px-4 py-3 text-sm font-black text-cyan-50 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}

export default function DashboardScheduleImpactPanel() {
  const rootRef = useRef(null);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const startImpactChat = async (form) => {
    const baseSession = {
      form,
      total: 0,
      messages: [],
    };

    setSession(baseSession);
    setInput("");
    setThinking(true);

    try {
      const firstMessage = await askScheduleImpactAI({
        form,
        messages: [],
        total: 0,
        userReply: "",
      });

      setSession({
        ...baseSession,
        messages: [{ role: "assistant", text: firstMessage }],
      });
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI unavailable:", error);
      setSession({
        ...baseSession,
        messages: [
          {
            role: "assistant",
            text: "I can't reach CLARA's AI brain right now. Please check the Gemini setup for this build, then try the impact coach again.",
          },
        ],
      });
    } finally {
      setThinking(false);
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
      const aiMessage = await askScheduleImpactAI({
        form: session.form,
        messages: nextMessages,
        total: nextTotal,
        userReply: reply,
      });

      setSession((current) => ({
        ...current,
        total: nextTotal,
        messages: [...nextMessages, { role: "assistant", text: aiMessage }],
      }));
    } catch (error) {
      console.warn("[CLARA Schedule] Impact AI unavailable:", error);
      setSession((current) => ({
        ...current,
        total: nextTotal,
        messages: [
          ...nextMessages,
          {
            role: "assistant",
            text: "I can't reach CLARA's AI brain right now, so I don't want to pretend this is an AI-guided estimate. Please check Gemini, then try again.",
          },
        ],
      }));
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const onClick = (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !root.contains(button)) return;

      const label = cleanText(button.textContent).toLowerCase();
      if (!label.includes("calculate money impact")) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const form = readForm(root);
      startImpactChat(form);
    };

    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div ref={rootRef} className="contents">
      <OriginalDashboardSchedulePanel />
      <ScheduleImpactChat
        session={session}
        input={input}
        setInput={setInput}
        thinking={thinking}
        onSend={sendReply}
        onClose={() => setSession(null)}
      />
    </div>
  );
}
