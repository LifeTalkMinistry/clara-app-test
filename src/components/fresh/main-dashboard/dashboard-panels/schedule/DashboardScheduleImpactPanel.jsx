import React, { useEffect, useRef, useState } from "react";
import { askGeminiForScheduleRefinement } from "@/lib/ai-command/schedule-refinement-service";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

const DEFAULT_IMPACT_CATEGORIES = [
  {
    key: "transportation",
    title: "Transportation",
    intro: "Think about going there, going back home, jeep/tricycle/ride-hailing, parking, or any fare related to the trip.",
    prompt: "Type the total transportation amount now.",
  },
  {
    key: "food",
    title: "Food",
    intro: "Think about meals, snacks, shared food, or anything you might buy to eat.",
    prompt: "Type your estimated food amount.",
  },
  {
    key: "drinks_snacks",
    title: "Drinks/snacks",
    intro: "Think about coffee, bottled water, dessert, small cravings, or quick snacks during or after the activity.",
    prompt: "Type your estimated drinks or snacks amount.",
  },
  {
    key: "contribution_gift",
    title: "Contribution/gift",
    intro: "Think about offering, gift, shared contribution, group share, or any amount connected to the event.",
    prompt: "Type your estimated contribution or gift amount.",
  },
  {
    key: "extra_stop",
    title: "Extra stop or side trip",
    intro: "Think about side trips, quick errands, extra rides, or unplanned stops after the activity.",
    prompt: "Type your estimated extra stop or side trip amount.",
  },
  {
    key: "other",
    title: "Other",
    intro: "Think about anything not covered yet, like load, small fees, parking, or emergency buffer.",
    prompt: "Type any other estimated amount, or type skip.",
  },
];

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
  const title = cleanText(titleInput?.value) || makeTitle(note, type);

  return {
    title,
    note,
    type,
    date: dateInput?.value || "",
    time: timeInput?.value || "",
    amount: amountInput?.value || "",
    elements: {
      titleInput,
      typeInput,
      noteInput,
      amountInput,
    },
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

function hasAmountText(text) {
  return /\d/.test(String(text || ""));
}

function isYes(text) {
  return /\b(yes|yep|yeah|sure|ok|okay|ready|go|start|continue|confirm|finalize|final|oo|opo|sige)\b/i.test(String(text || ""));
}

function isNo(text) {
  return /\b(no|nope|not yet|hindi|di muna|wait)\b/i.test(String(text || ""));
}

function isSkip(text) {
  return /\b(skip|none|wala|no amount|zero|0)\b/i.test(String(text || ""));
}

function formatPeso(value) {
  return `₱${Math.max(0, Number(value) || 0).toLocaleString()}`;
}

function suggestImpactCategories(form) {
  const text = `${form?.title || ""} ${form?.note || ""} ${form?.type || ""}`.toLowerCase();
  const categories = [...DEFAULT_IMPACT_CATEGORIES];

  if (/work|office|meeting|shift|interview/.test(text)) {
    return [
      categories[0],
      categories[1],
      categories[2],
      {
        key: "work_needs",
        title: "Work needs",
        intro: "Think about printing, documents, load, internet, supplies, or anything needed for work.",
        prompt: "Type your estimated work-related amount.",
      },
      categories[4],
      categories[5],
    ];
  }

  if (/family|birthday|fiesta|celebration|party/.test(text)) {
    return [
      categories[0],
      categories[1],
      categories[2],
      {
        key: "gift_share",
        title: "Gift/shared contribution",
        intro: "Think about gifts, ambag, shared food, or any contribution expected from you.",
        prompt: "Type your estimated gift or contribution amount.",
      },
      categories[4],
      categories[5],
    ];
  }

  return categories;
}

function buildCategoryList(categories) {
  return categories.map((category) => `- ${category.title}`).join("\n");
}

function buildIntroMessage(form, categories) {
  return `Got it. For ${form.title}, here are possible spending areas we should estimate:\n\n${buildCategoryList(categories)}\n\nReady to estimate?`;
}

function buildCategoryPrompt(category, index) {
  const label = index === 0 ? "First spending" : "Next spending";
  return `${label}: ${category.title}.\n${category.intro}\n${category.prompt}`;
}

function buildFinalMessage(answers, categories) {
  const rows = categories.map((category) => {
    const answer = answers.find((item) => item.key === category.key);
    if (!answer || answer.skipped || !answer.amount) return `- ${category.title}: skipped`;
    return `- ${category.title}: ${formatPeso(answer.amount)}`;
  });
  const total = answers.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return `All set. Here is your estimate:\n\n${rows.join("\n")}\n\nTotal estimated impact: ${formatPeso(total)}\n\nReply yes to save this estimate.`;
}

function replaceAnswer(answers, nextAnswer) {
  const filtered = answers.filter((answer) => answer.key !== nextAnswer.key);
  return [...filtered, nextAnswer];
}

function advanceAfterAnswer(session, answer) {
  const answers = replaceAnswer(session.answers || [], answer);
  const nextIndex = session.currentIndex + 1;
  const total = answers.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  if (nextIndex >= session.categories.length) {
    return {
      ...session,
      total,
      answers,
      currentIndex: nextIndex,
      stage: "done",
      pendingAmount: null,
      messages: [
        ...session.messages,
        {
          role: "assistant",
          text: buildFinalMessage(answers, session.categories),
        },
      ],
    };
  }

  return {
    ...session,
    total,
    answers,
    currentIndex: nextIndex,
    stage: "amount",
    pendingAmount: null,
    messages: [
      ...session.messages,
      {
        role: "assistant",
        text: `Great. ${buildCategoryPrompt(session.categories[nextIndex], nextIndex)}`,
      },
    ],
  };
}

function buildNextImpactSession(session, reply) {
  const userMessage = { role: "user", text: reply };
  const currentCategory = session.categories[session.currentIndex];
  const baseSession = {
    ...session,
    messages: [...session.messages, userMessage],
  };

  if (session.stage === "intro") {
    if (isYes(reply) || hasAmountText(reply)) {
      return {
        ...baseSession,
        stage: "amount",
        messages: [
          ...baseSession.messages,
          {
            role: "assistant",
            text: `Please think of all possible spending before entering the amount so we can make the forecast closer to reality.\n\n${buildCategoryPrompt(session.categories[0], 0)}`,
          },
        ],
      };
    }

    if (isNo(reply)) {
      return {
        ...baseSession,
        messages: [
          ...baseSession.messages,
          {
            role: "assistant",
            text: "No problem. Reply yes when you're ready to estimate this schedule.",
          },
        ],
      };
    }

    return {
      ...baseSession,
      messages: [
        ...baseSession.messages,
        {
          role: "assistant",
          text: "Reply yes when you're ready. I will guide you one spending area at a time.",
        },
      ],
    };
  }

  if (session.stage === "amount") {
    if (!currentCategory) return baseSession;

    if (isSkip(reply)) {
      return advanceAfterAnswer(baseSession, {
        key: currentCategory.key,
        title: currentCategory.title,
        amount: 0,
        skipped: true,
      });
    }

    const amount = parseAmount(reply);
    if (!hasAmountText(reply) || amount <= 0) {
      return {
        ...baseSession,
        messages: [
          ...baseSession.messages,
          {
            role: "assistant",
            text: `Please type the estimated amount for ${currentCategory.title}, or type skip if this does not apply.`,
          },
        ],
      };
    }

    return {
      ...baseSession,
      stage: "confirm",
      pendingAmount: amount,
      messages: [
        ...baseSession.messages,
        {
          role: "assistant",
          text: `You want me to finalize ${currentCategory.title} as ${formatPeso(amount)} total?`,
        },
      ],
    };
  }

  if (session.stage === "confirm") {
    if (!currentCategory) return baseSession;

    if (isYes(reply)) {
      return advanceAfterAnswer(baseSession, {
        key: currentCategory.key,
        title: currentCategory.title,
        amount: session.pendingAmount || 0,
        skipped: false,
      });
    }

    if (isNo(reply)) {
      return {
        ...baseSession,
        stage: "amount",
        pendingAmount: null,
        messages: [
          ...baseSession.messages,
          {
            role: "assistant",
            text: `No problem. Type the corrected amount for ${currentCategory.title}, or type skip.`,
          },
        ],
      };
    }

    if (isSkip(reply)) {
      return advanceAfterAnswer(baseSession, {
        key: currentCategory.key,
        title: currentCategory.title,
        amount: 0,
        skipped: true,
      });
    }

    const amount = parseAmount(reply);
    if (hasAmountText(reply) && amount > 0) {
      return {
        ...baseSession,
        pendingAmount: amount,
        messages: [
          ...baseSession.messages,
          {
            role: "assistant",
            text: `Got it. Finalize ${currentCategory.title} as ${formatPeso(amount)} total?`,
          },
        ],
      };
    }

    return {
      ...baseSession,
      messages: [
        ...baseSession.messages,
        {
          role: "assistant",
          text: `Please reply yes to finalize ${currentCategory.title} as ${formatPeso(session.pendingAmount)}, or no to change it.`,
        },
      ],
    };
  }

  if (session.stage === "done") {
    return {
      ...baseSession,
      messages: [
        ...baseSession.messages,
        {
          role: "assistant",
          text: `The forecast is already complete. Reply yes to save this estimate.`,
        },
      ],
    };
  }

  return baseSession;
}

function ScheduleRefinementPanel({ session, input, setInput, thinking, onSend, onClose }) {
  if (!session) return null;

  const result = session.result || {};
  const questions = Array.isArray(result.next_questions) ? result.next_questions : [];
  const missing = Array.isArray(result.missing_details) ? result.missing_details : [];

  return (
    <div className="fixed inset-0 z-[145] flex items-end justify-center bg-black/60 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md">
      <div className="max-h-[86svh] w-full max-w-[520px] overflow-hidden rounded-[30px] border border-cyan-300/18 bg-[#071026]/98 shadow-[0_22px_90px_rgba(0,0,0,.62),0_0_42px_rgba(34,211,238,.12)] backdrop-blur-2xl">
        <div className="border-b border-white/8 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[.22em] text-cyan-100/70">Refine with CLARA</p>
              <h3 className="mt-2 text-xl font-black leading-tight text-white">Clear schedule intention</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60"
              aria-label="Close schedule refinement"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[58svh] space-y-3 overflow-y-auto p-4">
          {session.error ? (
            <div className="rounded-[22px] border border-rose-300/18 bg-rose-400/[.075] px-4 py-3 text-sm font-semibold leading-6 text-rose-50/82">
              CLARA couldn’t refine this yet. You can still save manually.
            </div>
          ) : (
            <>
              <div className="rounded-[22px] border border-cyan-300/16 bg-cyan-300/[.065] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100/56">Refined intention</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/82">
                  {result.refined_intention || "CLARA is clarifying this schedule."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/8 bg-white/[.035] px-3 py-2.5">
                  <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/32">Suggested title</p>
                  <p className="mt-1 text-xs font-bold text-white/76">{result.suggested_title || "Schedule plan"}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.035] px-3 py-2.5">
                  <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/32">Category</p>
                  <p className="mt-1 text-xs font-bold text-white/76">{result.suggested_category || "Personal"}</p>
                </div>
              </div>

              {missing.length ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[.025] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/38">Missing details</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {missing.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1 text-[10px] font-black uppercase tracking-[.11em] text-white/48">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {questions.length ? (
                <div className="space-y-2">
                  {questions.map((item, index) => (
                    <div key={`${item.key}-${index}`} className="rounded-[20px] border border-white/8 bg-white/[.035] px-4 py-3">
                      <p className="text-sm font-black leading-6 text-white/86">{index + 1}. {item.question}</p>
                      {item.reason ? <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{item.reason}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-400/[.075] px-4 py-3 text-sm font-bold leading-6 text-emerald-50/82">
                  This schedule looks clear now. Ready to save?
                </div>
              )}

              {session.messages?.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[84%] whitespace-pre-line rounded-[20px] px-4 py-3 text-sm font-semibold leading-6 ${message.role === "user" ? "bg-cyan-300/[.12] text-cyan-50" : "border border-white/8 bg-white/[.035] text-white/64"}`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </>
          )}

          {thinking ? (
            <div className="rounded-[22px] border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/54">
              CLARA is refining…
            </div>
          ) : null}
        </div>

        {!session.error ? (
          <div className="border-t border-white/8 p-4">
            <form onSubmit={onSend} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Answer CLARA’s question..."
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
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ScheduleImpactChat({ session, input, setInput, thinking, onSend, onClose, onUseEstimate }) {
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
            <p className="mt-1 text-2xl font-black text-white">{formatPeso(session.total)}</p>
          </div>
        </header>

        <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {session.messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[84%] whitespace-pre-line rounded-[22px] px-4 py-3 text-sm font-semibold leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${
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
          {session.stage === "done" && session.total > 0 ? (
            <button
              type="button"
              onClick={onUseEstimate}
              className="mb-3 flex w-full items-center justify-center rounded-2xl border border-cyan-200/60 bg-cyan-300/[0.10] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.10)] active:scale-[0.99]"
            >
              Use {formatPeso(session.total)} Estimate
            </button>
          ) : null}

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
  const [refineSession, setRefineSession] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [refineThinking, setRefineThinking] = useState(false);

  const startImpactChat = (form) => {
    const categories = suggestImpactCategories(form);
    const baseSession = {
      form,
      categories,
      currentIndex: 0,
      stage: "intro",
      pendingAmount: null,
      answers: [],
      total: 0,
      messages: [
        {
          role: "assistant",
          text: buildIntroMessage(form, categories),
        },
      ],
    };

    setSession(baseSession);
    setInput("");
    setThinking(false);
  };

  const startRefinement = async (button = null) => {
    const root = rootRef.current;
    if (!root || refineThinking) return;

    const form = readForm(root);
    const hasRoughNote = cleanText(form.note || form.title);
    if (!hasRoughNote) return;

    const originalLabel = button?.textContent || "Refine with CLARA";
    if (button) {
      button.disabled = true;
      button.textContent = "CLARA is refining…";
      button.classList.add("cursor-wait", "opacity-70");
    }

    setRefineInput("");
    setRefineThinking(true);
    setRefineSession({ form, result: null, messages: [], error: false });

    try {
      const result = await askGeminiForScheduleRefinement({ form, conversation: [] });
      applyRefinementToForm(root, result);
      setRefineSession({ form, result, messages: [], error: false });
    } catch (error) {
      console.warn("[CLARA Schedule] Refinement unavailable:", error);
      setRefineSession({ form, result: null, messages: [], error: true });
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
    const nextMessages = [
      ...(refineSession.messages || []),
      { role: "user", text: reply },
    ];

    setRefineInput("");
    setRefineThinking(true);
    setRefineSession((current) => ({ ...current, form: currentForm, messages: nextMessages }));

    try {
      const conversation = [
        ...(refineSession.result?.refined_intention
          ? [{ role: "assistant", content: refineSession.result.refined_intention }]
          : []),
        ...nextMessages.map((message) => ({ role: message.role, content: message.text })),
      ];

      const result = await askGeminiForScheduleRefinement({
        form: currentForm,
        conversation,
        latestAnswer: reply,
      });

      applyRefinementToForm(root, result);
      setRefineSession({
        form: currentForm,
        result,
        messages: [
          ...nextMessages,
          {
            role: "assistant",
            text: result.ready_to_save
              ? "This schedule looks clear now. Ready to save?"
              : result.next_questions?.[0]?.question || result.refined_intention,
          },
        ],
        error: false,
      });
    } catch (error) {
      console.warn("[CLARA Schedule] Follow-up refinement unavailable:", error);
      setRefineSession((current) => ({ ...current, error: true }));
    } finally {
      setRefineThinking(false);
    }
  };

  const sendReply = (event) => {
    event.preventDefault();
    const reply = cleanText(input);
    if (!reply || !session || thinking) return;

    setSession((current) => buildNextImpactSession(current, reply));
    setInput("");
    setThinking(false);
  };

  const useImpactEstimate = () => {
    const root = rootRef.current;
    if (!root || !session || session.total <= 0) return;

    const form = readForm(root);
    updateControlledField(form.elements.amountInput, String(session.total));
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
      <ScheduleImpactChat
        session={session}
        input={input}
        setInput={setInput}
        thinking={thinking}
        onSend={sendReply}
        onClose={() => setSession(null)}
        onUseEstimate={useImpactEstimate}
      />
      <ScheduleRefinementPanel
        session={refineSession}
        input={refineInput}
        setInput={setRefineInput}
        thinking={refineThinking}
        onSend={sendRefineReply}
        onClose={() => setRefineSession(null)}
      />
    </div>
  );
}
