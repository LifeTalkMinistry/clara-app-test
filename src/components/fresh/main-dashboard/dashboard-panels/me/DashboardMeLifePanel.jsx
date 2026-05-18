import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain, CheckCircle2, ChevronRight, MessageCircle, RefreshCcw, Send, X } from "lucide-react";

const KEY = "clara_behavioral_memory_v1";

const DRAWERS = [
  {
    id: "core",
    level: 1,
    eyebrow: "LEVEL 1",
    title: "Core Identity",
    subtitle: "Life situation, pressure, responsibilities, and goals.",
    fields: [
      ["Income pattern", "incomePattern"],
      ["Living situation", "livingSituation"],
      ["Responsibilities", "responsibilities"],
      ["Work type", "workType"],
      ["Relationship status", "relationshipStatus"],
      ["Dependents", "dependents"],
      ["Current financial pressure", "currentFinancialPressure"],
      ["Survival pressure level", "survivalPressureLevel"],
      ["Main financial goal", "mainFinancialGoal"],
      ["Current emotional state trend", "emotionalStateTrend"],
    ],
  },
  {
    id: "behavior",
    level: 2,
    eyebrow: "LEVEL 2",
    title: "Behavioral Spending Profile",
    subtitle: "Emotional spending behavior, habits, fears, and pressure triggers.",
    fields: [
      ["Emotional triggers", "emotionalTriggers"],
      ["Stress spending habits", "stressSpendingHabits"],
      ["Reward system", "rewardSystem"],
      ["Common impulsive purchases", "commonImpulsivePurchases"],
      ["Biggest spending weakness", "biggestSpendingWeakness"],
      ["Coping mechanisms", "copingMechanisms"],
      ["Motivation style", "motivationStyle"],
      ["Financial fear", "financialFear"],
      ["Guilt patterns", "guiltPatterns"],
      ["Social pressure triggers", "socialPressureTriggers"],
    ],
  },
  {
    id: "life",
    level: 3,
    eyebrow: "LEVEL 3",
    title: "Life Pattern Intelligence",
    subtitle: "Routine, sleep, energy, environment, and burnout signals.",
    fields: [
      ["Schedule and routine", "scheduleRoutine"],
      ["Sleep pattern", "sleepPattern"],
      ["Work exhaustion", "workExhaustion"],
      ["Social environment", "socialEnvironment"],
      ["Relationship conflicts", "relationshipConflicts"],
      ["Hobby patterns", "hobbyPatterns"],
      ["Energy level trends", "energyLevelTrends"],
      ["Burnout indicators", "burnoutIndicators"],
    ],
  },
  {
    id: "money",
    level: 4,
    eyebrow: "LEVEL 4",
    title: "Financial Infrastructure",
    subtitle: "Wallets, budgets, goals, obligations, and payday rhythm.",
    fields: [
      ["Wallets", "wallets"],
      ["Budgets", "budgets"],
      ["Emergency fund", "emergencyFund"],
      ["Savings goals", "savingsGoals"],
      ["Recurring expenses", "recurringExpenses"],
      ["Debt", "debt"],
      ["Subscriptions", "subscriptions"],
      ["Transfers", "transfers"],
      ["Payday cycle", "paydayCycle"],
    ],
  },
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function readMemory() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { version: data.version || 2, updatedAt: data.updatedAt || "", items: data.items || {} };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

function saveMemory(field, value, level) {
  const nextValue = clean(value);
  if (!nextValue) return readMemory();

  const current = readMemory();
  const previous = current.items?.[field.key] || {};
  const now = new Date().toISOString();
  const next = {
    version: 2,
    updatedAt: now,
    items: {
      ...(current.items || {}),
      [field.key]: {
        key: field.key,
        label: field.label,
        value: nextValue,
        layer: level,
        weight: Math.min(10, Number(previous.weight || 0) + 2),
        pinned: Boolean(previous.pinned),
        source: "me-memory-chat",
        createdAt: previous.createdAt || now,
        updatedAt: now,
      },
    },
  };

  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: next }));
  return next;
}

function dateLabel(value) {
  if (!value) return "Not saved yet";
  try {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function buildDrawers(memory) {
  const items = memory.items || {};
  return DRAWERS.map((drawer) => {
    const fields = drawer.fields.map(([label, key]) => ({ label, key, memory: items[key] || null }));
    const saved = fields.filter((field) => clean(field.memory?.value)).length;
    return { ...drawer, fields, saved, total: fields.length };
  });
}

function MemoryChat({ drawer, field, onClose, onSaved }) {
  const [draft, setDraft] = useState("");
  const [savedText, setSavedText] = useState("");
  const current = clean(field.memory?.value);

  const submit = (event) => {
    event.preventDefault();
    const value = clean(draft);
    if (!value) return;
    onSaved(saveMemory(field, value, drawer.level));
    setSavedText(value);
    setDraft("");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[280] mx-auto max-w-[430px] px-4 pb-[max(env(safe-area-inset-bottom),14px)]">
      <div className="overflow-hidden rounded-[30px] border border-white/12 bg-slate-950/94 shadow-[0_-24px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/46">Refine with CLARA</p>
            <h3 className="mt-1 text-lg font-black text-white">{field.label}</h3>
            <p className="mt-1 text-xs font-semibold text-white/38">{drawer.title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close memory editor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="max-w-[88%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/76">
            {current ? `I currently understand this as: “${current}.” Tell me the correct version if this changed.` : `I do not have this yet. Tell me what CLARA should remember.`}
          </div>
          {savedText ? (
            <>
              <div className="ml-auto max-w-[88%] rounded-[22px] bg-emerald-300 px-4 py-3 text-sm font-semibold leading-6 text-slate-950">{savedText}</div>
              <div className="max-w-[88%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/76">Saved. I’ll use this when giving you money guidance.</div>
            </>
          ) : null}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-white/32" placeholder="Tell CLARA what to remember..." />
            <button type="submit" disabled={!draft.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 disabled:opacity-40 active:scale-95" aria-label="Save memory">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardMeLifePanel() {
  const [memory, setMemory] = useState(() => readMemory());
  const [activeDrawerId, setActiveDrawerId] = useState(null);
  const [activeField, setActiveField] = useState(null);

  const drawers = useMemo(() => buildDrawers(memory), [memory]);
  const activeDrawer = drawers.find((drawer) => drawer.id === activeDrawerId) || null;
  const total = drawers.reduce((sum, drawer) => sum + drawer.total, 0);
  const saved = drawers.reduce((sum, drawer) => sum + drawer.saved, 0);

  const refresh = () => setMemory(readMemory());

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("clara-behavioral-memory-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("clara-behavioral-memory-updated", handler);
    };
  }, []);

  return (
    <div className="pb-28">
      <section className="relative min-h-[calc(100svh-150px)] overflow-hidden rounded-[34px] border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(8,55,69,.94),rgba(15,23,48,.97)_48%,rgba(47,23,83,.95))] p-5 shadow-[0_18px_60px_rgba(0,0,0,.22)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-violet-400/12 blur-3xl" />

        <div className="relative flex min-h-[calc(100svh-190px)] flex-col">
          {!activeDrawer ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/46">Personal Cabinet</p>
                  <h2 className="mt-2 text-3xl font-black leading-none text-white">Me</h2>
                  <p className="mt-3 max-w-[25rem] text-sm font-semibold leading-6 text-white/58">Four private drawers where CLARA keeps what she understands about you.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/[0.055] px-3 py-1 text-[11px] font-black text-white/46">{saved}/{total} learned</span>
                    <span className="rounded-full bg-white/[0.045] px-3 py-1 text-[11px] font-bold text-white/38">{dateLabel(memory.updatedAt)}</span>
                  </div>
                </div>
                <button type="button" onClick={refresh} className="grid h-11 w-11 shrink-0 place-items-center rounded-[20px] border border-white/10 bg-white/[0.045] text-white/60 active:scale-95" aria-label="Refresh CLARA memory">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-white/8 bg-white/[0.035] p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-300/[0.08] text-emerald-50/76"><Brain className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-black text-white">Choose one memory drawer</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/40">Open a drawer, then tap any detail to correct or refine it.</p>
                </div>
              </div>

              <div className="mt-4 grid flex-1 grid-cols-1 gap-3">
                {drawers.map((drawer) => (
                  <button key={drawer.id} type="button" onClick={() => setActiveDrawerId(drawer.id)} className="group rounded-[26px] border border-white/10 bg-white/[0.035] p-4 text-left transition active:scale-[0.985]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">{drawer.eyebrow}</p>
                        <h3 className="mt-2 text-xl font-black leading-tight text-white">{drawer.title}</h3>
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/42">{drawer.subtitle}</p>
                      </div>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-white/34" />
                    </div>
                    <div className="mt-4 inline-flex rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-black text-white/44">{drawer.saved}/{drawer.total} saved</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => { setActiveDrawerId(null); setActiveField(null); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/68 active:scale-95" aria-label="Back to drawers">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/46">{activeDrawer.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-white">{activeDrawer.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/46">{activeDrawer.subtitle}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.055] px-3 py-1 text-[11px] font-black text-white/48">{activeDrawer.saved}/{activeDrawer.total}</span>
              </div>

              <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.03] px-4">
                {activeDrawer.fields.map((field) => {
                  const hasValue = clean(field.memory?.value);
                  return (
                    <button key={field.key} type="button" onClick={() => setActiveField(field)} className="w-full border-b border-white/8 py-3 text-left last:border-b-0 active:scale-[0.995]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {hasValue ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-200/80" /> : <MessageCircle className="h-3.5 w-3.5 shrink-0 text-white/28" />}
                            <p className="truncate text-sm font-black text-white/88">{field.label}</p>
                          </div>
                          <p className={`mt-1.5 line-clamp-2 text-sm font-semibold leading-5 ${hasValue ? "text-white/58" : "text-white/30"}`}>{hasValue || "Tap to teach CLARA"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/28" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {activeDrawer && activeField ? <MemoryChat drawer={activeDrawer} field={activeField} onClose={() => setActiveField(null)} onSaved={setMemory} /> : null}
    </div>
  );
}
