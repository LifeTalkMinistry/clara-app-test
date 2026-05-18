import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Layers3,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";
import {
  DEFAULT_CLARA_LIFE_PROFILE,
  normalizeClaraLifeProfile,
  readClaraLifeProfile,
} from "@/lib/clara-life-profile";

const BEHAVIORAL_MEMORY_KEY = "clara_behavioral_memory_v1";

const FRAMEWORK = [
  {
    id: 1,
    friendlyTitle: "Life situation",
    friendlySubtitle: "Income, responsibilities, pressure, goals, and current context.",
    title: "Level 1 — Core Identity",
    items: [
      { label: "Income pattern", aliases: ["incomePattern", "incomePattern.cutoffDates", "incomePattern.monthlyDate", "incomeRhythm"] },
      { label: "Living situation", aliases: ["livingSituation"] },
      { label: "Responsibilities", aliases: ["responsibilities", "responsibilities.frequency", "responsibility"] },
      { label: "Work type", aliases: ["workType", "workType.bpoRhythm", "workType.spendingImpact", "status"] },
      { label: "Relationship status", aliases: ["relationshipStatus", "relationshipStatus.spendingEffect"] },
      { label: "Dependents", aliases: ["dependents", "dependents.supportPattern"] },
      { label: "Current financial pressure", aliases: ["currentFinancialPressure", "currentFinancialPressure.specificPressure"] },
      { label: "Survival pressure level", aliases: ["survivalPressureLevel", "survivalPressureLevel.mainCause"] },
      { label: "Main financial goal", aliases: ["mainFinancialGoal", "mainFinancialGoal.emergencyTarget", "mainFinancialGoal.blocker", "meaningfulGoal", "currentFocus"] },
      { label: "Current emotional state trend", aliases: ["emotionalStateTrend", "emotionalStateTrend.timing", "emotionalState"] },
    ],
  },
  {
    id: 2,
    friendlyTitle: "Spending behavior",
    friendlySubtitle: "Triggers, impulses, coping habits, fear, guilt, and motivation.",
    title: "Level 2 — Behavioral Spending Profile",
    items: [
      { label: "Emotional triggers", aliases: ["emotionalTriggers", "emotionalTriggers.spendingAction", "spendingTrigger"] },
      { label: "Stress spending habits", aliases: ["stressSpendingHabits", "stressSpendingHabits.foodType", "stressSpendingHabits.costPattern"] },
      { label: "Reward system", aliases: ["rewardSystem", "rewardSystem.frequency"] },
      { label: "Common impulsive purchases", aliases: ["commonImpulsivePurchases", "commonImpulsivePurchases.triggerPoint"] },
      { label: "Biggest spending weakness", aliases: ["biggestSpendingWeakness", "biggestSpendingWeakness.pattern"] },
      { label: "Coping mechanisms", aliases: ["copingMechanisms", "copingMechanisms.spendingRisk"] },
      { label: "Motivation style", aliases: ["motivationStyle", "motivationStyle.boundary", "coachingStyle"] },
      { label: "Financial fear", aliases: ["financialFear"] },
      { label: "Guilt patterns", aliases: ["guiltPatterns", "guiltPatterns.afterEffect"] },
      { label: "Social pressure triggers", aliases: ["socialPressureTriggers", "socialPressureTriggers.boundary"] },
    ],
  },
  {
    id: 3,
    friendlyTitle: "Life patterns",
    friendlySubtitle: "Routine, sleep, energy, burnout signs, hobbies, and environment.",
    title: "Level 3 — Life Pattern Intelligence",
    items: [
      { label: "Schedule and routine", aliases: ["scheduleRoutine", "scheduleRoutine.spendWindow"] },
      { label: "Sleep pattern", aliases: ["sleepPattern", "sleepPattern.cause"] },
      { label: "Work exhaustion", aliases: ["workExhaustion", "workExhaustion.spendEffect"] },
      { label: "Social environment", aliases: ["socialEnvironment", "socialEnvironment.who"] },
      { label: "Relationship conflicts", aliases: ["relationshipConflicts", "relationshipConflicts.response"] },
      { label: "Hobby patterns", aliases: ["hobbyPatterns", "hobbyPatterns.frequency", "replacementActivity"] },
      { label: "Energy level trends", aliases: ["energyLevelTrends", "energyLevelTrends.risk"] },
      { label: "Burnout indicators", aliases: ["burnoutIndicators", "burnoutIndicators.prevention", "currentLifeSeason"] },
    ],
  },
  {
    id: 4,
    friendlyTitle: "Money setup",
    friendlySubtitle: "Wallets, budget style, emergency fund, goals, debt, and payday rhythm.",
    title: "Level 4 — Financial Infrastructure",
    items: [
      { label: "Wallets", aliases: ["wallets", "wallets.primary"] },
      { label: "Budgets", aliases: ["budgets", "budgets.styleDetail"] },
      { label: "Emergency fund", aliases: ["emergencyFund", "emergencyFund.nextTarget"] },
      { label: "Savings goals", aliases: ["savingsGoals", "savingsGoals.risk"] },
      { label: "Recurring expenses", aliases: ["recurringExpenses", "recurringExpenses.dueTiming", "nonNegotiable"] },
      { label: "Debt", aliases: ["debt", "debt.type"] },
      { label: "Subscriptions", aliases: ["subscriptions", "subscriptions.auditNeed"] },
      { label: "Transfers", aliases: ["transfers", "transfers.purpose"] },
      { label: "Payday cycle", aliases: ["paydayCycle", "paydayCycle.spendingShift"] },
    ],
  },
];

function safeText(value) {
  return String(value ?? "").trim();
}

function readBehavioralMemory() {
  if (typeof window === "undefined") return { items: {}, updatedAt: "" };
  try {
    return JSON.parse(localStorage.getItem(BEHAVIORAL_MEMORY_KEY) || "{}");
  } catch {
    return { items: {}, updatedAt: "" };
  }
}

function formatDate(value) {
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

function findStoredValue(definition, memoryItems, lifeProfile) {
  for (const key of definition.aliases) {
    const memory = memoryItems[key];
    const memoryValue = safeText(memory?.value);
    if (memoryValue) {
      return {
        value: memoryValue,
        source: "Talk to CLARA",
        key,
        updatedAt: memory.updatedAt,
        weight: memory.weight,
        pinned: memory.pinned,
      };
    }
  }

  for (const key of definition.aliases) {
    const value = safeText(lifeProfile?.[key]);
    if (value) {
      return {
        value,
        source: "Manual Me profile",
        key,
        updatedAt: "",
        weight: "",
        pinned: false,
      };
    }
  }

  return null;
}

function buildFrameworkStatus(memory, lifeProfile) {
  const memoryItems = memory?.items || {};
  return FRAMEWORK.map((layer) => {
    const rows = layer.items.map((item) => ({ ...item, stored: findStoredValue(item, memoryItems, lifeProfile) }));
    const saved = rows.filter((row) => row.stored).length;
    return {
      ...layer,
      rows,
      saved,
      total: rows.length,
      percent: Math.round((saved / rows.length) * 100),
    };
  });
}

function getRawMemoryItems(memory) {
  return Object.values(memory?.items || {})
    .filter((item) => safeText(item?.value))
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(b.pinned) - Number(a.pinned);
      return Number(b.weight || 0) - Number(a.weight || 0);
    });
}

function getManualProfileItems(profile) {
  const blocked = new Set(["personalityQuizAnswers", "memoryNotes"]);
  return Object.entries(profile || {})
    .filter(([key, value]) => !blocked.has(key) && safeText(value))
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function getHighlights(layers) {
  const priorityLabels = [
    "Main financial goal",
    "Current financial pressure",
    "Emotional triggers",
    "Stress spending habits",
    "Income pattern",
    "Payday cycle",
    "Work exhaustion",
    "Wallets",
  ];

  const saved = layers.flatMap((layer) =>
    layer.rows
      .filter((row) => row.stored)
      .map((row) => ({ ...row, layerTitle: layer.friendlyTitle }))
  );

  const prioritized = priorityLabels
    .map((label) => saved.find((row) => row.label === label))
    .filter(Boolean);

  return [...prioritized, ...saved.filter((row) => !prioritized.includes(row))].slice(0, 4);
}

function QuietPill({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/50">
      {children}
    </span>
  );
}

function MeHero({ totalStored, totalRequired, updatedAt, loading, refresh }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(9,60,72,.92),rgba(18,24,54,.94)_50%,rgba(45,22,82,.92))] p-5 shadow-[0_18px_56px_rgba(0,0,0,.22)]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/55">Personal Cabinet</p>
          <h3 className="mt-3 text-3xl font-black leading-none text-white">Me</h3>
          <p className="mt-3 max-w-[25rem] text-sm leading-6 text-white/66">
            The private place where CLARA keeps what she understands about your life and money behavior.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuietPill>{totalStored}/{totalRequired} understood</QuietPill>
            <QuietPill>{loading ? "Checking..." : formatDate(updatedAt)}</QuietPill>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[20px] border border-white/10 bg-white/[0.055] text-white/70 active:scale-95"
          aria-label="Refresh CLARA memory"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function UnderstandingSummary({ highlights, rawItems }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.032] p-4 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.06] text-emerald-50/70">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/32">What CLARA knows</p>
          <h3 className="mt-1 text-lg font-black text-white">Personal understanding</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">
            A short view of the details CLARA can use when giving advice.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {highlights.length ? highlights.map((row) => (
          <div key={`${row.layerTitle}-${row.label}`} className="rounded-[20px] border border-white/8 bg-white/[0.026] p-3">
            <p className="text-sm font-black text-white">{row.label}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/68">{row.stored.value}</p>
          </div>
        )) : (
          <div className="rounded-[22px] border border-dashed border-cyan-200/14 bg-cyan-300/[0.025] p-4 text-sm font-semibold leading-6 text-white/48">
            CLARA has not saved Talk to CLARA memory yet. Start a guided conversation, then review what CLARA understood.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.022] p-3">
        <p className="text-sm font-black text-white">Storage status</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-white/44">
          {rawItems.length ? `${rawItems.length} Talk to CLARA memories are saved on this device.` : "No Talk to CLARA memory is saved yet."}
        </p>
      </div>
    </section>
  );
}

function CompactLayerRow({ layer }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.026] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{layer.friendlyTitle}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/43">{layer.friendlySubtitle}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-white/52">
          {layer.saved}/{layer.total}
        </span>
      </div>
    </div>
  );
}

function SavedMemoryList({ layer }) {
  const savedRows = layer.rows.filter((row) => row.stored);
  const missingRows = layer.rows.filter((row) => !row.stored);

  return (
    <details className="rounded-[22px] border border-white/8 bg-white/[0.022]" open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-black text-white">{layer.friendlyTitle}</p>
          <p className="mt-1 text-xs font-semibold text-white/42">{layer.saved}/{layer.total} saved</p>
        </div>
        <ChevronDown className="h-4 w-4 text-white/34" />
      </summary>
      <div className="space-y-2 border-t border-white/8 p-3">
        {savedRows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-emerald-300/12 bg-emerald-300/[0.04] p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200/80" />
              <p className="text-sm font-black text-white">{row.label}</p>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-5 text-white/68">{row.stored.value}</p>
          </div>
        ))}
        {missingRows.length ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/28">Still missing</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/42">
              {missingRows.map((row) => row.label).join(" • ")}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function RawMemoryPanel({ items }) {
  return (
    <section className="space-y-2.5">
      {items.length ? items.map((item) => (
        <div key={item.key} className="rounded-[18px] border border-white/8 bg-white/[0.024] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-white">{item.label || item.key}</p>
              <p className="mt-1 text-xs font-bold text-cyan-100/36">{item.key}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black text-white/36">L{item.layer || "?"}</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-5 text-white/66">{item.value}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <QuietPill>weight {item.weight || 1}</QuietPill>
            <QuietPill>{formatDate(item.updatedAt)}</QuietPill>
            {item.pinned ? <QuietPill>pinned</QuietPill> : null}
          </div>
        </div>
      )) : (
        <div className="rounded-[22px] border border-dashed border-cyan-200/14 bg-cyan-300/[0.025] p-4 text-sm font-semibold leading-6 text-white/44">
          No Talk to CLARA raw memory yet.
        </div>
      )}
    </section>
  );
}

function ManualProfilePanel({ items }) {
  if (!items.length) return null;

  return (
    <details className="rounded-[24px] border border-white/8 bg-white/[0.022]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-violet-200/12 bg-violet-300/[0.055] text-violet-50/64">
            <Archive className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Older Me fields</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/42">Manual fallback data CLARA can still read.</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-white/34" />
      </summary>
      <div className="grid grid-cols-1 gap-2.5 border-t border-white/8 p-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-[18px] border border-white/8 bg-white/[0.024] p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/28">{item.key}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/64">{String(item.value)}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function MemorySystemDetails({ layers, rawItems, manualItems }) {
  return (
    <details className="rounded-[28px] border border-white/10 bg-white/[0.026] shadow-[0_14px_40px_rgba(0,0,0,.14)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.055] text-cyan-50/64">
            <Layers3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">See everything CLARA knows</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/42">Open only when you want the full memory checklist.</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-white/34" />
      </summary>

      <div className="space-y-3 border-t border-white/8 p-3">
        <div className="grid grid-cols-1 gap-2.5">
          {layers.map((layer) => <SavedMemoryList key={layer.id} layer={layer} />)}
        </div>

        <details className="rounded-[24px] border border-white/8 bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.055] text-cyan-50/64">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Advanced raw storage</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/42">Exact keys, layers, weights, and timestamps.</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-white/34" />
          </summary>
          <div className="border-t border-white/8 p-3">
            <RawMemoryPanel items={rawItems} />
          </div>
        </details>

        <ManualProfilePanel items={manualItems} />
      </div>
    </details>
  );
}

export default function DashboardMeLifePanel() {
  const { user } = useUserRole() || {};
  const [memory, setMemory] = useState(() => readBehavioralMemory());
  const [lifeProfile, setLifeProfile] = useState(() => normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setMemory(readBehavioralMemory());
    try {
      const stored = await readClaraLifeProfile(user);
      setLifeProfile(stored);
    } catch (error) {
      console.warn("CLARA Me profile load failed:", error);
      setLifeProfile(normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("clara-behavioral-memory-updated", handler);
    window.addEventListener("clara:life-profile-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("clara-behavioral-memory-updated", handler);
      window.removeEventListener("clara:life-profile-updated", handler);
    };
  }, [user?.id, user?.email]);

  const layers = useMemo(() => buildFrameworkStatus(memory, lifeProfile), [memory, lifeProfile]);
  const rawItems = useMemo(() => getRawMemoryItems(memory), [memory]);
  const manualItems = useMemo(() => getManualProfileItems(lifeProfile), [lifeProfile]);
  const highlights = useMemo(() => getHighlights(layers), [layers]);
  const totalRequired = layers.reduce((sum, layer) => sum + layer.total, 0);
  const totalStored = layers.reduce((sum, layer) => sum + layer.saved, 0);

  return (
    <div className="space-y-4 pb-28">
      <MeHero
        totalStored={totalStored}
        totalRequired={totalRequired}
        updatedAt={memory?.updatedAt}
        loading={loading}
        refresh={refresh}
      />

      <UnderstandingSummary highlights={highlights} rawItems={rawItems} />

      <section className="rounded-[28px] border border-cyan-200/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.06),transparent_38%),rgba(255,255,255,.022)] p-4 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.055] text-cyan-50/64">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">CLARA’s understanding areas</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/42">A quiet overview. Details stay hidden until you open them.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {layers.map((layer) => <CompactLayerRow key={layer.id} layer={layer} />)}
        </div>
      </section>

      <MemorySystemDetails layers={layers} rawItems={rawItems} manualItems={manualItems} />
    </div>
  );
}
