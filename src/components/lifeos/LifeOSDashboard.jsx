import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useFinancialData from "../../hooks/useFinancialData";
import { Kicker } from "./LifeOSShared";

const peso = (value = 0) => `₱${Math.round(Math.abs(Number(value) || 0)).toLocaleString("en-PH")}`;

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getExpenseDate = (expense) => {
  const value =
    expense?.date ||
    expense?.transaction_date ||
    expense?.transactionDate ||
    expense?.createdAt ||
    expense?.created_at ||
    expense?.loggedAt ||
    expense?.logged_at ||
    expense?.updatedAt ||
    expense?.updated_at;

  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeCategory = (expense) =>
  titleCase(
    expense?.category ||
      expense?.budget_category ||
      expense?.budgetCategory ||
      expense?.tag ||
      expense?.type ||
      expense?.title ||
      "General spending"
  );

function readScheduleEvents() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem("clara_lifeos_schedule_events_v1");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSignalVisitIndex(totalSignals) {
  if (typeof window === "undefined" || totalSignals <= 1) return 0;

  try {
    const key = "clara_lifeos_signal_visit_index_v1";
    const current = Number(window.localStorage.getItem(key) || "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    window.localStorage.setItem(key, String(next));
    return next % totalSignals;
  } catch {
    return Math.floor(Math.random() * totalSignals);
  }
}

function summarizeMonthlyTrend(expenses = []) {
  const now = new Date();
  const currentMonth = monthKey(now);
  const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const current = new Map();
  const previous = new Map();

  expenses.forEach((expense) => {
    const amount = Math.abs(toNumber(expense?.amount || expense?.value || expense?.total));
    if (!amount) return;

    const key = monthKey(getExpenseDate(expense));
    if (key !== currentMonth && key !== previousMonth) return;

    const category = normalizeCategory(expense);
    const target = key === currentMonth ? current : previous;
    const existing = target.get(category) || { category, total: 0, count: 0, unplanned: 0 };
    const isUnplanned =
      String(expense?.planning_status || expense?.budgetStatus || "").toLowerCase() === "unplanned" ||
      Boolean(expense?.unplanned_reason || expense?.unplannedReason);

    existing.total += amount;
    existing.count += 1;
    existing.unplanned += isUnplanned ? 1 : 0;
    target.set(category, existing);
  });

  const ranked = [...current.values()]
    .map((item) => {
      const lastMonth = previous.get(item.category)?.total || 0;
      const growth = lastMonth > 0 ? ((item.total - lastMonth) / lastMonth) * 100 : item.total > 0 ? 100 : 0;
      const score = item.total + item.count * 180 + Math.max(growth, 0) * 12 + item.unplanned * 250;
      return {
        ...item,
        lastMonth,
        growth,
        repeated: item.count >= 3,
        unplannedHeavy: item.unplanned >= 2,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    top: ranked[0] || null,
    all: ranked,
    totalThisMonth: [...current.values()].reduce((sum, item) => sum + item.total, 0),
  };
}

function buildLifeOsSignals({ expenses = [], loading = false, totalWalletBalance = 0 }) {
  const scheduleEvents = readScheduleEvents();
  const trend = summarizeMonthlyTrend(expenses);
  const top = trend.top;
  const balance = Math.max(0, toNumber(totalWalletBalance));
  const hasFlexibleRoom = balance >= 500;
  const signals = [];

  if (loading) {
    return [
      {
        key: "loading",
        type: "AI reading",
        icon: Sparkles,
        severity: "Scanning",
        title: "CLARA is reading your monthly pattern.",
        body: "LifeOS will show one useful signal once your local finance trend is ready.",
        focus: "Read the pattern",
        protect: "Decision quality",
        timing: "This visit",
        action: "Let CLARA finish reading before making a bigger money decision.",
        points: [
          "The main dashboard still owns the numbers.",
          "LifeOS only chooses the most useful behavior signal.",
          "The signal can change every visit depending on what CLARA detects.",
        ],
      },
    ];
  }

  if (top) {
    const categoryLower = top.category.toLowerCase();
    const isFood = ["food", "dining", "coffee", "snack", "restaurant", "meal"].some((word) => categoryLower.includes(word));
    const isShopping = ["shop", "clothes", "online", "shopee", "lazada", "mall"].some((word) => categoryLower.includes(word));
    const isTransport = ["transport", "ride", "fare", "grab", "gas"].some((word) => categoryLower.includes(word));

    const riskName = isFood
      ? "comfort food spending"
      : isShopping
        ? "optional shopping momentum"
        : isTransport
          ? "transport convenience spending"
          : `${top.category} spending`;

    const reason = top.unplannedHeavy
      ? "unplanned repeats are building momentum"
      : top.repeated
        ? "the pattern is repeating this month"
        : top.growth > 25
          ? "this category is rising compared with last month"
          : "this is currently the strongest spending pressure";

    signals.push({
      key: "damage-warning",
      type: "Damage watchout",
      icon: AlertTriangle,
      severity: top.unplannedHeavy || top.growth > 40 ? "High attention" : "Watch closely",
      title: `Watch out for ${riskName}.`,
      body: `CLARA noticed ${reason}. If it continues quietly, it may shrink your flexibility this month.`,
      focus: `Reduce ${top.category}`,
      protect: "Budget flexibility",
      timing: "This month",
      action: `Pause before your next ${top.category.toLowerCase()} expense and ask if it protects your priority.`,
      points: [
        `${top.category} is the strongest monthly watchout right now.`,
        `${top.count} transaction${top.count === 1 ? "" : "s"} detected this month, totaling about ${peso(top.total)}.`,
        top.lastMonth > 0
          ? `Last month was around ${peso(top.lastMonth)}, so CLARA is watching the change.`
          : "There is little or no same-category activity from last month, so CLARA is watching it carefully.",
      ],
    });

    if (isFood) {
      signals.push({
        key: "health-alignment",
        type: "Value alignment",
        icon: ShieldCheck,
        severity: "Identity check",
        title: "Your food choices may affect how you want to feel today.",
        body: `CLARA can see ${top.category.toLowerCase()} spending showing up. If your goal today is to feel healthy, choose the option that supports that version of you.`,
        focus: "Feel healthier today",
        protect: "Energy and budget",
        timing: "Next meal",
        action: "Before buying food, ask: will this help me feel better after I eat it?",
        points: [
          "This is not about guilt. It is about alignment.",
          "Food spending can affect both money and energy.",
          "A planned healthy choice can still fit the budget without feeling restrictive.",
        ],
      });
    }
  }

  const relationshipKeywords = ["date", "girlfriend", "boyfriend", "partner", "wife", "husband", "anniversary", "family", "relationship"];
  const recentRelationshipSpend = expenses.some((expense) => {
    const date = getExpenseDate(expense);
    const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    const text = `${expense?.title || ""} ${expense?.category || ""} ${expense?.note || ""} ${expense?.description || ""}`.toLowerCase();
    return daysAgo <= 21 && relationshipKeywords.some((word) => text.includes(word));
  });

  const relationshipSchedule = scheduleEvents.some((event) => {
    const text = `${event?.title || ""} ${event?.detail || ""} ${event?.type || ""}`.toLowerCase();
    return relationshipKeywords.some((word) => text.includes(word));
  });

  if (hasFlexibleRoom && (!recentRelationshipSpend || relationshipSchedule)) {
    signals.push({
      key: "relationship-permission",
      type: "Healthy permission",
      icon: HeartHandshake,
      severity: "Allowed if planned",
      title: "You may have room for a meaningful relationship moment.",
      body: relationshipSchedule
        ? "CLARA noticed a relationship or family schedule. A simple planned treat may be okay if it stays intentional."
        : "CLARA does not see much recent relationship/treat spending. If someone matters to you, a simple planned moment may be worth considering.",
      focus: "Spend with intention",
      protect: "Relationship and budget",
      timing: "This week",
      action: `Keep it simple. Set a limit first, then enjoy it without turning it into impulse spending.`,
      points: [
        "CLARA should not always say no.",
        `Your visible wallet flexibility is around ${peso(balance)} right now.`,
        "A meaningful planned expense can be healthier than random comfort spending.",
      ],
    });
  }

  if (!top) {
    signals.push({
      key: "no-trend-yet",
      type: "Spending memory",
      icon: Sparkles,
      severity: "No leak yet",
      title: "No major leak detected yet.",
      body: "Keep logging your spending so CLARA can spot what may quietly hurt your month.",
      focus: "Keep building CLARA's memory",
      protect: "Awareness",
      timing: "This month",
      action: "Keep logging honestly so CLARA can learn the pattern before it becomes a leak.",
      points: [
        "There is not enough monthly spending data yet for a strong warning.",
        "LifeOS needs repeated behavior before it can warn responsibly.",
        "Once patterns appear, CLARA will surface only the strongest signal here.",
      ],
    });
  }

  signals.push({
    key: "momentum-check",
    type: "Momentum check",
    icon: Target,
    severity: "Steady move",
    title: "Choose one move that protects future you.",
    body: "For this visit, CLARA is keeping the dashboard light: one action, one direction, no clutter.",
    focus: "One smart decision",
    protect: "Future flexibility",
    timing: "Today",
    action: "Before your next spend, pause once and choose the option your future self would respect.",
    points: [
      "Not every visit needs a warning.",
      "Sometimes the best guidance is one clean decision.",
      "LifeOS should feel alive without becoming crowded.",
    ],
  });

  return signals;
}

function getDetailContent(signal) {
  return {
    climate: {
      kicker: signal.type,
      title: signal.title,
      body: signal.body,
      points: signal.points,
      action: signal.action,
    },
    action: {
      kicker: "Next best action",
      title: "Ask CLARA before acting",
      body: "The best use of LifeOS is catching the next decision before it becomes automatic.",
      points: [
        "Pause before repeating the pattern.",
        "Ask whether the decision supports your priority or only gives short comfort.",
        "Spend in a way that matches your life, not just your balance.",
      ],
      action: signal.action,
    },
  };
}

function PressableShell({ children, className = "", onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-[#061026]/68 p-4 text-left shadow-[0_14px_42px_rgba(0,0,0,.22),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/28 hover:bg-[#0a1430]/78 hover:shadow-[0_18px_48px_rgba(0,0,0,.26),0_0_24px_rgba(34,211,238,.08),inset_0_1px_0_rgba(255,255,255,.06)] active:translate-y-0 active:scale-[.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-pink-400/10 blur-2xl" />
      </div>
      <div className="relative">{children}</div>
    </button>
  );
}

function DynamicSignalCard({ signal, onOpen }) {
  const Icon = signal.icon || Sparkles;

  return (
    <PressableShell
      onClick={() => onOpen("climate")}
      ariaLabel="Open CLARA signal details"
      className="border-cyan-300/24 bg-[linear-gradient(135deg,rgba(8,83,93,.42),rgba(25,22,78,.58)_50%,rgba(72,12,105,.46))] p-5 shadow-[0_16px_52px_rgba(0,0,0,.30),0_0_32px_rgba(34,211,238,.09),0_0_30px_rgba(236,72,153,.06),inset_0_1px_0_rgba(255,255,255,.065)]"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-pink-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />

      <div className="flex items-center justify-between gap-3">
        <Kicker>CLARA noticed</Kicker>
        <span className="rounded-full border border-pink-400/18 bg-pink-400/[.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-pink-100/70">
          {signal.severity}
        </span>
      </div>

      <div className="mt-5 flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-pink-400/22 bg-pink-400/[.08] text-pink-200 shadow-[0_0_26px_rgba(236,72,153,.16)] transition duration-200 group-hover:scale-105 group-hover:shadow-[0_0_32px_rgba(236,72,153,.22)]">
          <Icon className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-black leading-tight text-white md:text-2xl">
            {signal.title}
          </h2>
          <p className="mt-2 max-w-[520px] text-sm leading-6 text-white/68">
            {signal.body}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan-100/68">
            Understand this signal
            <CheckCircle2 className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>
    </PressableShell>
  );
}

function NextBestAction({ signal, onOpen }) {
  return (
    <PressableShell
      onClick={() => onOpen("action")}
      ariaLabel="Open next best action"
      className="border-pink-400/20 bg-[linear-gradient(135deg,rgba(8,83,93,.22),rgba(36,17,78,.52),rgba(72,12,105,.34))] p-5"
    >
      <div className="pointer-events-none absolute -right-10 -bottom-12 h-36 w-36 rounded-full bg-pink-400/12 blur-3xl" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <Kicker>Next best action</Kicker>
          <h2 className="mt-3 text-xl font-black leading-tight text-white">
            Ask before you act.
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/62">
            {signal.action}
          </p>
        </div>

        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/[.055] text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,.14)]">
          <MessageCircle className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 inline-flex rounded-2xl border border-cyan-300/24 bg-cyan-300/[.075] px-4 py-2.5 text-sm font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,.10)]">
        Ask CLARA
      </div>
    </PressableShell>
  );
}

function DetailSheet({ detail, onClose }) {
  useEffect(() => {
    if (!detail) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/56 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm md:items-center md:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifeos-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[30px] border border-cyan-300/22 bg-[#071026]/95 p-5 shadow-[0_22px_80px_rgba(0,0,0,.55),0_0_40px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.07)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Kicker>{detail.kicker}</Kicker>
            <h2 id="lifeos-detail-title" className="mt-3 text-2xl font-black leading-tight text-white">
              {detail.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/62">{detail.body}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close LifeOS detail"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/60 transition hover:bg-white/[.08] hover:text-white active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {detail.points.map((point) => (
            <div
              key={point}
              className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.035] px-4 py-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100/78" />
              <p className="text-sm leading-5 text-white/70">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-pink-400/18 bg-pink-400/[.06] px-4 py-4">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-pink-100/70">
            Suggested next action
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/86">{detail.action}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-cyan-300/24 bg-cyan-300/[.08] px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/[.12] active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function LifeOSDashboard() {
  const { user } = useAuth();
  const financial = useFinancialData(user);
  const [activeDetailKey, setActiveDetailKey] = useState(null);
  const [visitIndex, setVisitIndex] = useState(0);

  const signals = useMemo(
    () =>
      buildLifeOsSignals({
        expenses: financial.expenses,
        loading: financial.loading,
        totalWalletBalance: financial.totalWalletBalance,
      }),
    [financial.expenses, financial.loading, financial.totalWalletBalance]
  );

  useEffect(() => {
    setVisitIndex(getSignalVisitIndex(signals.length));
  }, [signals.length]);

  const signal = signals[visitIndex % Math.max(signals.length, 1)] || signals[0];
  const detailContent = useMemo(() => getDetailContent(signal), [signal]);

  const activeDetail = useMemo(() => {
    if (!activeDetailKey) return null;
    return detailContent[activeDetailKey] || null;
  }, [activeDetailKey, detailContent]);

  return (
    <div className="space-y-5">
      <DynamicSignalCard signal={signal} onOpen={setActiveDetailKey} />
      <NextBestAction signal={signal} onOpen={setActiveDetailKey} />
      <DetailSheet detail={activeDetail} onClose={() => setActiveDetailKey(null)} />
    </div>
  );
}
