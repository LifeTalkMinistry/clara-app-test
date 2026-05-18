import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  RefreshCcw,
  Send,
  X,
} from "lucide-react";

const MEMORY_KEY = "clara_behavioral_memory_v1";

const DRAWERS = [
  {
    id: "core",
    level: 1,
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
    title: "Behavioral Spending Profile",
    subtitle: "Emotional habits, fears, and pressure triggers.",
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

const DRAWER_TONE = {
  core: {
    empty: "This helps me understand the basic shape of your life, not just your numbers.",
    saved: "I’ll use this as part of your personal financial context.",
  },
  behavior: {
    empty: "This helps me understand the emotion or habit behind the spending pattern.",
    saved: "I’ll keep this in mind when helping you pause before emotional spending.",
  },
  life: {
    empty: "This helps me understand your rhythm, energy, and environment.",
    saved: "I’ll use this to read your spending risks with more human context.",
  },
  money: {
    empty: "This helps me understand the system that carries your money decisions.",
    saved: "I’ll use this when giving you practical money guidance.",
  },
};

const FIELD_REFLECTIONS = {
  incomePattern: (value) => `I understand that your income pattern is currently “${value}.” That helps me plan around the rhythm of your money instead of treating every day the same.`,
  livingSituation: (value) => `I understand that your living situation is “${value}.” That matters because home life can either reduce pressure or create hidden responsibilities that affect your money decisions.`,
  responsibilities: (value) => `I see that your current responsibilities include “${value}.” I’ll treat this as part of the real pressure you carry, not as random spending.`,
  workType: (value) => `I understand that your work or daily role is “${value}.” Your work environment can affect stress, energy, cravings, and the way you spend after a long day.`,
  relationshipStatus: (value) => `I understand your relationship situation as “${value}.” Emotional situations can quietly influence spending, so I’ll keep this context in mind gently.`,
  dependents: (value) => `I understand that your dependent situation is “${value}.” Support responsibilities can change what feels safe, urgent, or emotionally difficult financially.`,
  currentFinancialPressure: (value) => `I can see that your main financial pressure right now is “${value}.” That tells me where we should be careful before suggesting any spending or saving move.`,
  survivalPressureLevel: (value) => `I understand your current survival pressure as “${value}.” I’ll use this to adjust how strict or gentle my guidance should be.`,
  mainFinancialGoal: (value) => `I understand that your main financial goal is “${value}.” That gives your money a direction, so decisions can be compared against what you’re trying to protect.`,
  emotionalStateTrend: (value) => `I understand that your emotional state around money is currently “${value}.” That helps me support the person behind the spending, not just the transaction.`,

  emotionalTriggers: (value) => `I noticed that “${value}” can trigger spending for you. That is important because spending is often a response to a feeling before it becomes a money decision.`,
  stressSpendingHabits: (value) => `I understand that stress can lead you toward “${value}.” When stress shows up, I’ll try to help you pause without making you feel judged.`,
  rewardSystem: (value) => `I understand that your reward pattern is “${value}.” Rewards are not bad, but we should make sure they restore you without quietly hurting your goals.`,
  commonImpulsivePurchases: (value) => `I noticed that “${value}” can be one of your impulsive purchase areas. I’ll watch for this pattern when you ask before buying.`,
  biggestSpendingWeakness: (value) => `I understand that your biggest spending weakness is “${value}.” That gives us a clear place to build better friction, not just more discipline.`,
  copingMechanisms: (value) => `I understand that you often cope through “${value}.” I’ll try to suggest alternatives that still feel realistic when life feels heavy.`,
  motivationStyle: (value) => `I understand that “${value}” works better for motivating you. I’ll try to match my tone to the kind of support you actually respond to.`,
  financialFear: (value) => `I understand that one financial fear you carry is “${value}.” Fear can shape decisions, so I’ll help you build safety instead of just pressure.`,
  guiltPatterns: (value) => `I noticed that “${value}” can create guilt after spending. I’ll help you turn that guilt into awareness, not shame.`,
  socialPressureTriggers: (value) => `I understand that “${value}” can create social pressure to spend. I’ll help you protect your boundaries when people or situations pull on your money.`,

  scheduleRoutine: (value) => `I understand that your routine is currently “${value}.” Your schedule affects when you feel tired, tempted, rushed, or more likely to spend for convenience.`,
  sleepPattern: (value) => `I understand your sleep pattern as “${value}.” Sleep can quietly affect cravings, patience, and impulse control, so this matters for financial decisions.`,
  workExhaustion: (value) => `I understand your work exhaustion level as “${value}.” When energy is low, spending often becomes a shortcut for comfort or convenience.`,
  socialEnvironment: (value) => `I understand your social environment as “${value}.” The people around you can support your goals or pressure your wallet, so I’ll keep that in mind.`,
  relationshipConflicts: (value) => `I understand relationship conflict currently as “${value}.” Conflict can affect emotions and spending, so I’ll treat this carefully and respectfully.`,
  hobbyPatterns: (value) => `I understand that “${value}” gives you fulfillment. That matters because meaningful activities can replace spending as a source of relief or reward.`,
  energyLevelTrends: (value) => `I understand that your energy tends to shift around “${value}.” I’ll use this to notice when spending risks may rise because you’re tired or drained.`,
  burnoutIndicators: (value) => `I understand that “${value}” may be a burnout signal for you. When this appears, we may need protection and rest before strict budgeting.`,

  wallets: (value) => `I understand that your wallet or money source setup includes “${value}.” This helps me know where spending decisions actually happen.`,
  budgets: (value) => `I understand your budgeting style as “${value}.” I’ll use this to give advice that fits your current system instead of forcing a perfect one.`,
  emergencyFund: (value) => `I understand your emergency fund status as “${value}.” This tells me how much safety we need to protect before taking financial risks.`,
  savingsGoals: (value) => `I understand that your savings goal is “${value}.” I’ll treat this as something worth protecting when temptations or pressure appear.`,
  recurringExpenses: (value) => `I understand that “${value}” is a recurring expense that matters. I’ll keep this in mind before suggesting what money is safe to use.`,
  debt: (value) => `I understand your debt situation as “${value}.” Debt can carry both financial and emotional weight, so I’ll account for that carefully.`,
  subscriptions: (value) => `I understand your subscription situation as “${value}.” Small automatic charges can become quiet leaks, so this helps me watch for them.`,
  transfers: (value) => `I understand your transfer pattern as “${value}.” Transfers often reveal obligations, family support, or how your money moves between priorities.`,
  paydayCycle: (value) => `I understand your payday cycle as “${value}.” Payday rhythm matters because spending risk and budgeting pressure often change right after income arrives.`,
};

const FIELD_EMPTY_PROMPTS = {
  incomePattern: "Tell me how your income usually arrives, so I can plan around your real money rhythm.",
  livingSituation: "Tell me about your living setup, so I can understand your home pressure and support system.",
  responsibilities: "Tell me what responsibilities your money is carrying right now.",
  workType: "Tell me about your work or daily role, especially if it affects stress or spending.",
  relationshipStatus: "Tell me if your relationship situation affects your emotions, pressure, or spending decisions.",
  dependents: "Tell me if someone depends on your money, care, or support.",
  currentFinancialPressure: "Tell me what financial pressure feels loudest right now.",
  survivalPressureLevel: "Tell me how heavy your current money pressure feels.",
  mainFinancialGoal: "Tell me the goal your money should protect right now.",
  emotionalStateTrend: "Tell me how you’ve been feeling lately when making money decisions.",
  emotionalTriggers: "Tell me what feeling usually makes spending more tempting.",
  stressSpendingHabits: "Tell me what you usually spend on when stress is high.",
  rewardSystem: "Tell me how you usually reward yourself after work or hard days.",
  commonImpulsivePurchases: "Tell me what you often buy without much planning.",
  biggestSpendingWeakness: "Tell me the spending pattern that feels hardest to control.",
  copingMechanisms: "Tell me what you usually do when life feels heavy.",
  motivationStyle: "Tell me what kind of guidance helps you most.",
  financialFear: "Tell me what money fear you carry most often.",
  guiltPatterns: "Tell me what kind of spending usually leaves guilt afterward.",
  socialPressureTriggers: "Tell me who or what tends to pressure you to spend.",
  scheduleRoutine: "Tell me what your usual schedule looks like.",
  sleepPattern: "Tell me how your sleep has been lately.",
  workExhaustion: "Tell me how tired work or daily life usually makes you feel.",
  socialEnvironment: "Tell me how the people around you affect your spending.",
  relationshipConflicts: "Tell me if conflict or relationship stress affects your spending.",
  hobbyPatterns: "Tell me what gives you fulfillment without overspending.",
  energyLevelTrends: "Tell me when your energy usually drops.",
  burnoutIndicators: "Tell me what signs show up when burnout is near.",
  wallets: "Tell me what wallets or money sources you usually use.",
  budgets: "Tell me how you currently budget your money.",
  emergencyFund: "Tell me where your emergency fund stands right now.",
  savingsGoals: "Tell me what savings goal you are trying to protect.",
  recurringExpenses: "Tell me what recurring expense hits your money most.",
  debt: "Tell me if debt or utang is creating pressure right now.",
  subscriptions: "Tell me if subscriptions are quietly reducing your money.",
  transfers: "Tell me if you often transfer money between wallets, banks, or people.",
  paydayCycle: "Tell me your usual payday cycle.",
};

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function readMemory() {
  if (typeof window === "undefined") return { version: 2, updatedAt: "", items: {} };
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
    return {
      version: data.version || 2,
      updatedAt: data.updatedAt || "",
      items: data.items || {},
    };
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

  localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: next }));
  return next;
}

function dateLabel(value) {
  if (!value) return "Not saved yet";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function buildDrawers(memory) {
  const items = memory.items || {};
  return DRAWERS.map((drawer) => {
    const fields = drawer.fields.map(([label, key]) => ({
      label,
      key,
      memory: items[key] || null,
    }));
    const saved = fields.filter((field) => clean(field.memory?.value)).length;
    return { ...drawer, fields, saved, total: fields.length };
  });
}

function buildClaraMemoryReflection({ drawer, field, value }) {
  const current = clean(value);
  if (!current) {
    return `${FIELD_EMPTY_PROMPTS[field.key] || "Tell me what CLARA should remember about this part of your life."} ${DRAWER_TONE[drawer.id]?.empty || "This helps me guide you better."}`;
  }

  const reflection = FIELD_REFLECTIONS[field.key]?.(current) || `I understand ${field.label.toLowerCase()} as “${current}.”`;
  return `${reflection} ${DRAWER_TONE[drawer.id]?.saved || "I’ll remember this when guiding you."}`;
}

function buildSavedReply({ drawer, field, value }) {
  const current = clean(value);
  const fieldName = field.label.toLowerCase();
  const tone = DRAWER_TONE[drawer.id]?.saved || "I’ll use this when helping you make better money decisions.";
  return `Got it — I’ll remember your ${fieldName} as “${current}.” ${tone}`;
}

function MemoryChat({ drawer, field, onClose, onSaved }) {
  const [draft, setDraft] = useState("");
  const [savedText, setSavedText] = useState("");
  const current = clean(field.memory?.value);
  const reflection = buildClaraMemoryReflection({ drawer, field, value: current });
  const savedReply = savedText ? buildSavedReply({ drawer, field, value: savedText }) : "";

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
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95"
            aria-label="Close memory editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[38svh] space-y-3 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-[90%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/78">
            {reflection}
          </div>
          {savedText ? (
            <>
              <div className="ml-auto max-w-[88%] rounded-[22px] bg-emerald-300 px-4 py-3 text-sm font-semibold leading-6 text-slate-950">
                {savedText}
              </div>
              <div className="max-w-[90%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/78">
                {savedReply}
              </div>
            </>
          ) : null}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-white/32"
              placeholder="Tell CLARA what changed..."
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 disabled:opacity-40 active:scale-95"
              aria-label="Save memory"
            >
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
    <div className="h-[calc(100svh-126px)] min-h-[520px] overflow-hidden pb-0">
      <section className="relative flex h-full min-h-0 overflow-hidden rounded-[30px] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,55,69,.94),rgba(15,23,48,.97)_48%,rgba(47,23,83,.95))] p-[clamp(12px,3.4vw,18px)] shadow-[0_14px_46px_rgba(0,0,0,.20)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/9 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative flex min-h-0 w-full flex-col">
          {!activeDrawer ? (
            <>
              <div className="shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/40">Personal Cabinet</p>
                    <h2 className="mt-1 text-[clamp(22px,7vw,30px)] font-black leading-none text-white">Me</h2>
                    <p className="mt-2 max-w-[22rem] text-[clamp(11px,3.2vw,13px)] font-semibold leading-[1.55] text-white/48">
                      Private memory drawers for your financial behavior and life context.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-black text-white/40">{saved}/{total} learned</span>
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/32">{dateLabel(memory.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refresh}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[16px] border border-white/8 bg-white/[0.04] text-white/52 active:scale-95"
                    aria-label="Refresh CLARA memory"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-[clamp(10px,2.8vw,16px)] grid min-h-0 flex-1 grid-rows-4 gap-[clamp(8px,2.4vw,12px)]">
                {drawers.map((drawer) => (
                  <button
                    key={drawer.id}
                    type="button"
                    onClick={() => setActiveDrawerId(drawer.id)}
                    className="group min-h-0 rounded-[clamp(18px,5.8vw,25px)] border border-white/8 bg-white/[0.026] px-[clamp(12px,3.4vw,16px)] py-[clamp(9px,2.8vw,14px)] text-left transition active:scale-[0.985]"
                  >
                    <div className="flex h-full min-h-0 items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[clamp(17px,5.5vw,22px)] font-black leading-[1.05] text-white">{drawer.title}</h3>
                        <p className="mt-1 line-clamp-2 text-[clamp(10px,3vw,12px)] font-semibold leading-[1.35] text-white/34">{drawer.subtitle}</p>
                        <div className="mt-2 inline-flex rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-white/34">{drawer.saved}/{drawer.total} saved</div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/26" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="shrink-0">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawerId(null);
                      setActiveField(null);
                    }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.045] text-white/62 active:scale-95"
                    aria-label="Back to drawers"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[clamp(21px,6vw,26px)] font-black leading-tight text-white">{activeDrawer.title}</h2>
                    <p className="mt-1.5 line-clamp-2 text-[clamp(11px,3.2vw,14px)] font-semibold leading-5 text-white/38">{activeDrawer.subtitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-black text-white/40">{activeDrawer.saved}/{activeDrawer.total}</span>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-white/8 bg-white/[0.026] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeDrawer.fields.map((field) => {
                  const hasValue = clean(field.memory?.value);
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => setActiveField(field)}
                      className="w-full border-b border-white/8 py-3 text-left last:border-b-0 active:scale-[0.995]"
                    >
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

      {activeDrawer && activeField ? (
        <MemoryChat drawer={activeDrawer} field={activeField} onClose={() => setActiveField(null)} onSaved={setMemory} />
      ) : null}
    </div>
  );
}
