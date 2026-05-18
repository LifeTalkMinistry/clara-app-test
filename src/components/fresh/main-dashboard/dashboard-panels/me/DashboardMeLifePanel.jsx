import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
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
    friendlyTitle: "Your life situation",
    friendlySubtitle: "Income, responsibilities, pressure, goals, and current life context.",
    title: "Level 1 — Core Identity",
    subtitle: "Life situation and pressure points that directly affect spending.",
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
    friendlyTitle: "Your spending behavior",
    friendlySubtitle: "Emotional triggers, impulse patterns, coping habits, fear, and motivation style.",
    title: "Level 2 — Behavioral Spending Profile",
    subtitle: "Emotions, impulses, coping behavior, fears, and social pressure.",
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
    friendlyTitle: "Your life patterns",
    friendlySubtitle: "Routine, sleep, energy, burnout signs, hobbies, and social environment.",
    title: "Level 3 — Life Pattern Intelligence",
    subtitle: "Routine, energy, burnout, sleep, hobbies, and environment.",
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
    friendlyTitle: "Your money setup",
    friendlySubtitle: "Wallets, budget style, emergency fund, goals, debt, subscriptions, and payday rhythm.",
    title: "Level 4 — Financial Infrastructure",
    subtitle: "Wallets, budgets, goals, debt, subscriptions, transfers, and payday rhythm.",
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

function StatCard({ label, value, icon: Icon, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-100",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
    amber: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
    violet: "border-violet-300/15 bg-violet-300/[0.08] text-violet-100",
  };

  return (
    <div className={`rounded-[22px] border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] opacity-70">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function FriendlyMemoryHero({ completion, totalStored, totalRequired, rawCount, updatedAt, loading, debugMode, setDebugMode, refresh }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(9,62,76,.96),rgba(16,24,55,.97)_46%,rgba(55,24,100,.96))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.24),0_0_38px_rgba(34,211,238,.08)]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Personal Cabinet</p>
          <h3 className="mt-3 text-3xl font-black leading-none text-white">Me</h3>
          <p className="mt-3 max-w-[26rem] text-sm leading-6 text-white/72">
            This is where CLARA keeps the important things she understands about your life, spending behavior, and money setup.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/42">
            <Clock3 className="h-3.5 w-3.5" /> {loading ? "Checking what CLARA knows..." : `Last updated: ${formatDate(updatedAt)}`}
          </p>
        </div>
        <button type="button" onClick={refresh} className="grid h-12 w-12 shrink-0 place-items-center rounded-[22px] border border-cyan-200/16 bg-cyan-300/[0.08] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,.12)] active:scale-95" aria-label="Refresh CLARA memory">
          <RefreshCcw className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2.5">
        <StatCard label="Understood" value={`${completion}%`} icon={Brain} tone="cyan" />
        <StatCard label="Saved" value={`${totalStored}/${totalRequired}`} icon={CheckCircle2} tone="emerald" />
      </div>

      <button
        type="button"
        onClick={() => setDebugMode((value) => !value)}
        className="relative mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-black text-white/78 transition active:scale-[0.99]"
      >
        {debugMode ? "Back to friendly view" : `View memory details (${rawCount} raw)`}
      </button>
    </section>
  );
}

function FriendlyLayerCard({ layer }) {
  const savedRows = layer.rows.filter((row) => row.stored);
  const missingRows = layer.rows.filter((row) => !row.stored);

  return (
    <details className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_18px_52px_rgba(0,0,0,.16)]" open={layer.saved > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/48">{layer.title}</p>
          <h3 className="mt-1 text-lg font-black text-white">{layer.friendlyTitle}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/48">{layer.friendlySubtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${layer.percent >= 70 ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100/78" : layer.percent >= 35 ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-100/78" : "border-white/10 bg-white/[0.04] text-white/42"}`}>
            {layer.saved}/{layer.total}
          </span>
          <ChevronDown className="h-4 w-4 text-white/42" />
        </div>
      </summary>

      <div className="border-t border-white/10 p-3">
        {savedRows.length ? (
          <div className="space-y-2.5">
            {savedRows.map((row) => (
              <div key={row.label} className="rounded-[20px] border border-emerald-300/14 bg-emerald-300/[0.055] p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                  <p className="text-sm font-black text-white">{row.label}</p>
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-5 text-white/78">{row.stored.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/12 bg-white/[0.025] p-3 text-sm font-semibold leading-6 text-white/46">
            CLARA has not learned this area yet.
          </div>
        )}

        {missingRows.length ? (
          <div className="mt-3 rounded-[20px] border border-white/10 bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/32">Still missing</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/46">
              {missingRows.slice(0, 4).map((row) => row.label).join(" • ")}{missingRows.length > 4 ? ` • +${missingRows.length - 4} more` : ""}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function FriendlyView({ layers, rawItems }) {
  const allSaved = layers.flatMap((layer) => layer.rows.filter((row) => row.stored).map((row) => ({ ...row, layerTitle: layer.friendlyTitle })));
  const strongest = allSaved.slice(0, 3);

  return (
    <>
      <section className="rounded-[28px] border border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_40%),rgba(255,255,255,.028)] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-200/14 bg-emerald-300/[0.07] text-emerald-50/74">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">What CLARA knows so far</p>
            <h3 className="mt-1 text-lg font-black text-white">Personal understanding</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
              These are the pieces CLARA can use to make future money advice feel personal.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {strongest.length ? strongest.map((row) => (
            <div key={`${row.layerTitle}-${row.label}`} className="rounded-[20px] border border-white/10 bg-white/[0.035] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100/44">{row.layerTitle}</p>
              <p className="mt-1 text-sm font-black text-white">{row.label}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-white/70">{row.stored.value}</p>
            </div>
          )) : (
            <div className="rounded-[22px] border border-dashed border-cyan-200/16 bg-cyan-300/[0.035] p-4 text-sm font-semibold leading-6 text-white/50">
              No Talk to CLARA memory has been saved yet. Start a Talk to CLARA flow and review what CLARA understood.
            </div>
          )}
        </div>
      </section>

      <div className="space-y-3">
        {layers.map((layer) => <FriendlyLayerCard key={layer.id} layer={layer} />)}
      </div>

      <section className="rounded-[28px] border border-cyan-200/12 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.08),transparent_38%),rgba(255,255,255,.025)] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.07] text-cyan-50/74">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Storage status</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
              {rawItems.length ? `${rawItems.length} Talk to CLARA memories are saved on this device.` : "No Talk to CLARA memory is saved yet."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function MemoryRow({ row }) {
  const saved = Boolean(row.stored);
  return (
    <div className={`rounded-[18px] border p-3 ${saved ? "border-emerald-300/14 bg-emerald-300/[0.055]" : "border-white/10 bg-white/[0.035]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {saved ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" /> : <AlertCircle className="h-4 w-4 shrink-0 text-white/32" />}
            <p className="text-sm font-black text-white">{row.label}</p>
          </div>
          <p className={`mt-1.5 text-sm font-semibold leading-5 ${saved ? "text-white/78" : "text-white/36"}`}>
            {saved ? row.stored.value : "Missing"}
          </p>
          {saved ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/48">{row.stored.source}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/48">{row.stored.key}</span>
              {row.stored.weight ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/48">weight {row.stored.weight}</span> : null}
              {row.stored.pinned ? <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2 py-1 text-[10px] font-bold text-amber-100/70">pinned</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FrameworkLayer({ layer, defaultOpen = false }) {
  return (
    <details className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.028] shadow-[0_18px_52px_rgba(0,0,0,.16)]" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/48">{layer.title}</p>
          <h3 className="mt-1 text-lg font-black text-white">{layer.saved}/{layer.total} stored</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">{layer.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${layer.percent >= 70 ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100/78" : layer.percent >= 35 ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-100/78" : "border-white/10 bg-white/[0.04] text-white/42"}`}>
            {layer.percent}%
          </span>
          <ChevronDown className="h-4 w-4 text-white/42" />
        </div>
      </summary>
      <div className="border-t border-white/10 p-3">
        <div className="space-y-2.5">
          {layer.rows.map((row) => <MemoryRow key={row.label} row={row} />)}
        </div>
      </div>
    </details>
  );
}

function RawMemoryPanel({ items }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.07] text-cyan-50/74">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">Advanced details</p>
          <h3 className="mt-1 text-lg font-black text-white">Raw Talk to CLARA storage</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">Use this to confirm exact keys, weights, and timestamps.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {items.length ? items.map((item) => (
          <div key={item.key} className="rounded-[18px] border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-white">{item.label || item.key}</p>
                <p className="mt-1 text-xs font-bold text-cyan-100/45">{item.key}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black text-white/42">L{item.layer || "?"}</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-white/76">{item.value}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/42">weight {item.weight || 1}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/42">{formatDate(item.updatedAt)}</span>
              {item.pinned ? <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2 py-1 text-[10px] font-bold text-amber-100/70">pinned</span> : null}
            </div>
          </div>
        )) : (
          <div className="rounded-[22px] border border-dashed border-cyan-200/16 bg-cyan-300/[0.035] p-4 text-sm font-semibold leading-6 text-white/50">
            No Talk to CLARA memory has been saved yet. Finish a guided flow, then tap “Review what CLARA understood.”
          </div>
        )}
      </div>
    </section>
  );
}

function ManualProfilePanel({ items }) {
  if (!items.length) return null;

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-200/14 bg-violet-300/[0.07] text-violet-50/74">
          <Archive className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">Manual fallback</p>
          <h3 className="mt-1 text-lg font-black text-white">Older Me profile fields</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">These still help CLARA when Talk to CLARA has not captured a category yet.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5">
        {items.map((item) => (
          <div key={item.key} className="rounded-[18px] border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/34">{item.key}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/74">{String(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdvancedMonitorView({ layers, rawItems, manualItems }) {
  return (
    <>
      <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-200/14 bg-emerald-300/[0.07] text-emerald-50/74">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">Advanced checklist</p>
            <h3 className="mt-1 text-lg font-black text-white">CLARA Behavioral Intelligence Framework</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/44">
              Green means CLARA has a stored answer. Missing means we still need to collect it through Talk to CLARA.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {layers.map((layer, index) => <FrameworkLayer key={layer.id} layer={layer} defaultOpen={index === 0} />)}
      </div>

      <RawMemoryPanel items={rawItems} />
      <ManualProfilePanel items={manualItems} />
    </>
  );
}

export default function DashboardMeLifePanel() {
  const { user } = useUserRole() || {};
  const [memory, setMemory] = useState(() => readBehavioralMemory());
  const [lifeProfile, setLifeProfile] = useState(() => normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
  const [loading, setLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

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
  const totalRequired = layers.reduce((sum, layer) => sum + layer.total, 0);
  const totalStored = layers.reduce((sum, layer) => sum + layer.saved, 0);
  const completion = totalRequired ? Math.round((totalStored / totalRequired) * 100) : 0;

  return (
    <div className="space-y-5 pb-28">
      <FriendlyMemoryHero
        completion={completion}
        totalStored={totalStored}
        totalRequired={totalRequired}
        rawCount={rawItems.length}
        updatedAt={memory?.updatedAt}
        loading={loading}
        debugMode={debugMode}
        setDebugMode={setDebugMode}
        refresh={refresh}
      />

      {debugMode ? (
        <AdvancedMonitorView layers={layers} rawItems={rawItems} manualItems={manualItems} />
      ) : (
        <FriendlyView layers={layers} rawItems={rawItems} />
      )}
    </div>
  );
}
