import { memo, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Target,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { compareDashboardSectionProps } from "./dashboardMemoUtils";

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const clampOpacity = (value) => Math.max(0, Math.min(Number(value) || 0.3, 0.5));

const firstNumber = (...values) => {
  for (const value of values) {
    const number = Number(String(value ?? "").replace(/[₱,\s,]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return 0;
};

const formatPeso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const getBudgetTotal = (budget) =>
  firstNumber(
    budget?.allocated_amount,
    budget?.budget_amount,
    budget?.total_budget,
    budget?.budget,
    budget?.amount,
    budget?.target_amount,
    budget?.declared_budget,
    budget?.declared_amount,
    budget?.monthly_budget_amount,
    budget?.allocated_total
  );

const getBudgetSpent = (budget) =>
  firstNumber(
    budget?.spent,
    budget?.spent_amount,
    budget?.total_spent,
    budget?.used_amount
  );

const getSavingsSaved = (goal) =>
  firstNumber(
    goal?.saved_amount,
    goal?.current_amount,
    goal?.saved,
    goal?.progress_amount,
    goal?.amount_saved
  );

const getSavingsTarget = (goal) =>
  firstNumber(
    goal?.target_amount,
    goal?.goal_amount,
    goal?.target,
    goal?.amount,
    goal?.desired_amount
  );

const getEmergencySaved = (item) =>
  firstNumber(
    item?.saved_amount,
    item?.current_amount,
    item?.saved,
    item?.balance,
    item?.amount_saved,
    item?.fund_balance,
    item?.emergency_fund_saved
  );

const getEmergencyTarget = (item) =>
  firstNumber(
    item?.target_amount,
    item?.goal_amount,
    item?.target,
    item?.amount,
    item?.desired_amount,
    item?.fund_target,
    item?.emergency_fund_target,
    item?.monthly_survival_expense
  );

const getObligationAmount = (item) =>
  firstNumber(
    item?.remaining_amount,
    item?.balance,
    item?.amount,
    item?.total_amount,
    item?.debt_amount,
    item?.obligation_amount,
    item?.payable_amount,
    item?.principal
  );

const getInvestmentAmount = (item) =>
  firstNumber(
    item?.current_value,
    item?.market_value,
    item?.value,
    item?.amount,
    item?.invested_amount,
    item?.principal,
    item?.balance
  );

function getStatus(progress, empty = false) {
  if (empty) {
    return {
      label: "Start",
      badge: "bg-cyan-500/15 text-cyan-200 border border-cyan-300/25",
      bar: "from-cyan-400 to-emerald-300",
      ring: "shadow-[0_0_24px_rgba(34,211,238,0.14)]",
      text: "text-white/95",
    };
  }

  if (progress >= 85) {
    return {
      label: "Strong",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 to-green-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
      text: "text-emerald-200",
    };
  }

  if (progress >= 45) {
    return {
      label: "Building",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "from-amber-400 to-yellow-300",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.16)]",
      text: "text-amber-200",
    };
  }

  return {
    label: "At Risk",
    badge: "bg-rose-500/15 text-rose-300 border border-rose-400/25",
    bar: "from-rose-400 to-pink-300",
    ring: "shadow-[0_0_24px_rgba(244,63,94,0.16)]",
    text: "text-rose-200",
  };
}

function CardWallpaperModal({ card, draft, setDraft, onClose, onSave }) {
  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, image: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className="text-base font-semibold text-white">{card.title} Background</p>
            <p className="mt-0.5 text-xs text-white/55">Upload photo and adjust opacity</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close background editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="relative h-48">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
              {draft.image ? (
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${draft.image}")`, opacity: clampOpacity(draft.opacity) }}
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
              <div className="relative z-10 flex h-full items-end p-4">
                <div>
                  <p className="text-lg font-bold text-white">{card.title}</p>
                  <p className="text-xs text-white/75">Preview of your card background</p>
                </div>
              </div>
            </div>
          </div>

          <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10">
            <Upload className="h-4 w-4" />
            <span>{draft.image ? "Change photo" : "Upload photo"}</span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium text-white/65">Background Opacity</p>
              <p className="text-[11px] font-semibold text-white/85">{Math.round(clampOpacity(draft.opacity) * 100)}%</p>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={clampOpacity(draft.opacity)}
              onChange={(event) => setDraft((current) => ({ ...current, opacity: Number(event.target.value) }))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraft({ image: "", opacity: 0.3 })}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardLayerCard({ card, wallpaper, onEditWallpaper }) {
  const Icon = card.Icon;
  const status = getStatus(card.progress, card.empty);
  const safeProgress = Math.max(0, Math.min(Number(card.progress) || 0, 100));

  return (
    <div className={`relative mb-3 overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-200 ${status.ring}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
      {wallpaper?.image ? (
        <div
          className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${wallpaper.image}")`, opacity: clampOpacity(wallpaper.opacity) }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

      <div className="relative z-10 p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)] backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-tight text-white">{card.title}</p>
                <p className="mt-0.5 text-[11px] font-medium text-white/82">{card.subtitle}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={onEditWallpaper}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
                  aria-label={`Change ${card.title} photo`}
                  title="Change photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}>
                  {card.badge || status.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className={`text-[32px] font-bold leading-none ${card.empty ? "text-white/95" : status.text}`}>{card.value}</p>
          <p className="mt-2.5 max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">{card.message}</p>
          <p className="mt-1 text-[11px] text-white/60">{card.subtext}</p>
        </div>

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
            <span>{card.progressLabel}</span>
            <span>{Math.round(safeProgress)}%</span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
            <div className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`} style={{ width: `${safeProgress}%` }}>
              <div className="absolute inset-0 bg-white/20 opacity-40" />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
            <span>{card.minLabel}</span>
            <span>{card.maxLabel}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={card.onDetails}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
        >
          <span className="font-medium">{card.detailsLabel || "Show details"}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DashboardFinancialCarousel({
  activeBudget,
  declaredBudget,
  budgetCategories,
  totalSpent,
  spentAmount,
  savingsGoals,
  goals,
  emergencyFund,
  emergencyFunds,
  emergencyGoal,
  investments,
  investmentFunds,
  obligations,
  debts,
  dashboardScale,
  className = "",
}) {
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [wallpapers, setWallpapers] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState({ image: "", opacity: 0.3 });

  const cards = useMemo(() => {
    const safeBudgetCategories = toArray(budgetCategories);
    const budgetAllocated = Math.max(
      firstNumber(
        declaredBudget,
        activeBudget?.declared_budget,
        activeBudget?.declared_amount,
        activeBudget?.monthly_budget_amount,
        activeBudget?.total_budget,
        activeBudget?.allocated_amount,
        activeBudget?.allocated_total
      ) || safeBudgetCategories.reduce((sum, item) => sum + getBudgetTotal(item), 0),
      0
    );
    const budgetSpent = Math.max(
      firstNumber(spentAmount, totalSpent, activeBudget?.spent, activeBudget?.spent_amount, activeBudget?.total_spent) ||
        safeBudgetCategories.reduce((sum, item) => sum + getBudgetSpent(item), 0),
      0
    );
    const budgetLeft = Math.max(budgetAllocated - budgetSpent, 0);
    const budgetProgress = budgetAllocated > 0 ? Math.min((budgetSpent / budgetAllocated) * 100, 100) : 0;

    const emergencyItems = toArray(emergencyFunds).length
      ? toArray(emergencyFunds)
      : toArray([emergencyFund, emergencyGoal]);
    const emergencySaved = emergencyItems.reduce((sum, item) => sum + getEmergencySaved(item), 0);
    const emergencyTarget = emergencyItems.reduce((sum, item) => sum + getEmergencyTarget(item), 0);
    const emergencyProgress = emergencyTarget > 0 ? Math.min((emergencySaved / emergencyTarget) * 100, 100) : 0;

    const savingsItems = toArray(savingsGoals).length ? toArray(savingsGoals) : toArray(goals);
    const savingsSaved = savingsItems.reduce((sum, item) => sum + getSavingsSaved(item), 0);
    const savingsTarget = savingsItems.reduce((sum, item) => sum + getSavingsTarget(item), 0);
    const savingsProgress = savingsTarget > 0 ? Math.min((savingsSaved / savingsTarget) * 100, 100) : savingsItems.length ? 35 : 0;

    const investmentItems = toArray(investments).length ? toArray(investments) : toArray(investmentFunds);
    const investmentTotal = investmentItems.reduce((sum, item) => sum + getInvestmentAmount(item), 0);
    const investmentProgress = investmentTotal > 0 ? 40 : 0;

    const obligationItems = toArray(obligations).length ? toArray(obligations) : toArray(debts);
    const obligationTotal = obligationItems.reduce((sum, item) => sum + getObligationAmount(item), 0);
    const obligationProgress = obligationTotal > 0 ? 45 : 0;

    return [
      {
        key: "budget",
        title: "Budget",
        subtitle: "Monthly spending control",
        Icon: Landmark,
        value: budgetAllocated > 0 ? formatPeso(budgetLeft) : "Set your budget",
        message: budgetAllocated > 0 ? `${formatPeso(budgetSpent)} spent from ${formatPeso(budgetAllocated)}.` : "Create your monthly spending plan.",
        subtext: budgetAllocated > 0 ? "Your next decision should follow this limit." : "Budget comes first before spending.",
        progress: budgetProgress,
        progressLabel: "Budget progress",
        minLabel: formatPeso(budgetSpent),
        maxLabel: formatPeso(budgetAllocated),
        badge: budgetAllocated > 0 ? "Active" : "No Plan",
        empty: budgetAllocated <= 0,
        gradient: "from-[#181006] via-[#2a1a0a] to-[#120b08]",
      },
      {
        key: "emergency",
        title: "Emergency Fund",
        subtitle: "Protection based on survival expense",
        Icon: ShieldCheck,
        value: emergencySaved > 0 ? formatPeso(emergencySaved) : "Start your fund",
        message: emergencyTarget > 0 ? `${Math.round(emergencyProgress)}% protected.` : "Start building your protection today.",
        subtext: emergencyTarget > 0 ? "Your emergency layer reduces panic decisions." : "Your future stability depends on this.",
        progress: emergencyProgress,
        progressLabel: "Protection progress",
        minLabel: formatPeso(emergencySaved),
        maxLabel: emergencyTarget > 0 ? formatPeso(emergencyTarget) : formatPeso(0),
        empty: emergencySaved <= 0 && emergencyTarget <= 0,
        gradient: "from-[#061916] via-[#10241f] to-[#141008]",
      },
      {
        key: "savings",
        title: "Savings Goals",
        subtitle: "Specific goals you are building",
        Icon: Target,
        value: savingsSaved > 0 ? formatPeso(savingsSaved) : "Start saving",
        message: savingsItems.length ? `You’re building ${savingsItems.length} ${savingsItems.length === 1 ? "goal" : "goals"}.` : "Turn your plans into visible progress.",
        subtext: savingsTarget > 0 ? `${formatPeso(savingsTarget)} total target.` : "Clear goals make discipline easier.",
        progress: savingsProgress,
        progressLabel: "Savings progress",
        minLabel: formatPeso(savingsSaved),
        maxLabel: savingsTarget > 0 ? formatPeso(savingsTarget) : formatPeso(0),
        badge: savingsItems.length ? "Building" : "Start",
        empty: savingsItems.length <= 0,
        gradient: "from-[#07182a] via-[#0a2735] to-[#08151f]",
      },
      {
        key: "investments",
        title: "Investments",
        subtitle: "Growth layer for future money",
        Icon: TrendingUp,
        value: investmentTotal > 0 ? formatPeso(investmentTotal) : "Not started yet",
        message: investmentTotal > 0 ? "Your money is starting to grow." : "Start growing your money.",
        subtext: "This layer comes after control and protection.",
        progress: investmentProgress,
        progressLabel: "Growth progress",
        minLabel: investmentTotal > 0 ? formatPeso(investmentTotal) : formatPeso(0),
        maxLabel: "Growth",
        badge: investmentTotal > 0 ? "Growing" : "Start",
        empty: investmentTotal <= 0,
        gradient: "from-[#071924] via-[#072731] to-[#08151f]",
      },
      {
        key: "obligations",
        title: "Obligations",
        subtitle: "Debts, dues, and commitments",
        Icon: PiggyBank,
        value: obligationTotal > 0 ? formatPeso(obligationTotal) : "No data yet",
        message: obligationTotal > 0 ? "Keep every payment visible." : "Track what’s holding you back.",
        subtext: "Pressure becomes manageable when it is visible.",
        progress: obligationProgress,
        progressLabel: "Obligation visibility",
        minLabel: obligationTotal > 0 ? formatPeso(obligationTotal) : formatPeso(0),
        maxLabel: "Tracked",
        badge: obligationTotal > 0 ? "Visible" : "Start",
        empty: obligationTotal <= 0,
        gradient: "from-[#1d1208] via-[#2b1c0d] to-[#120b08]",
      },
    ];
  }, [
    activeBudget,
    budgetCategories,
    declaredBudget,
    debts,
    emergencyFund,
    emergencyFunds,
    emergencyGoal,
    goals,
    investmentFunds,
    investments,
    obligations,
    savingsGoals,
    spentAmount,
    totalSpent,
  ]);

  const activeCard = cards.find((card) => card.key === editingKey) || null;

  const handleScroll = () => {
    const node = carouselRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.getBoundingClientRect?.().width || node.clientWidth || 1;
    const nextIndex = Math.round(node.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(cards.length - 1, nextIndex)));
  };

  const openWallpaperEditor = (key) => {
    setEditingKey(key);
    setDraft(wallpapers[key] || { image: "", opacity: 0.3 });
  };

  const saveWallpaper = () => {
    if (!editingKey) return;
    setWallpapers((current) => ({ ...current, [editingKey]: { image: draft.image || "", opacity: clampOpacity(draft.opacity) } }));
    setEditingKey(null);
  };

  return (
    <section className={`relative ${className}`} data-clara-dashboard-section="financial-decision-carousel">
      <style>{`
        [data-clara-dashboard-section="financial-decision-carousel"] ~ .overflow-hidden { display: none !important; }
        [data-clara-dashboard-section="financial-decision-carousel"] ~ .overflow-hidden + .flex.items-center.justify-center { display: none !important; }
      `}</style>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex touch-pan-x items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card) => (
          <div key={card.key} className="flex w-full min-w-full shrink-0 snap-center">
            <div className={dashboardScale?.financeSlide || "min-h-[286px] rounded-[28px] [&>*]:min-h-[284px] [&>*]:rounded-[27px]"}>
              <DashboardLayerCard
                card={card}
                wallpaper={wallpapers[card.key]}
                onEditWallpaper={() => openWallpaperEditor(card.key)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={`flex items-center justify-center ${dashboardScale?.dots || "gap-1.5 pt-1.5 pb-3"}`}>
        {cards.map((card, index) => (
          <button
            key={card.key}
            type="button"
            onClick={() => {
              const node = carouselRef.current;
              if (!node) return;
              node.scrollTo({ left: node.clientWidth * index, behavior: "smooth" });
              setActiveIndex(index);
            }}
            aria-label={`Go to ${card.title} card`}
            className={`h-2 rounded-full transition-all duration-200 ${activeIndex === index ? "w-5 bg-emerald-400" : "w-2 bg-white/25"}`}
          />
        ))}
      </div>

      {activeCard ? (
        <CardWallpaperModal
          card={activeCard}
          draft={draft}
          setDraft={setDraft}
          onClose={() => setEditingKey(null)}
          onSave={saveWallpaper}
        />
      ) : null}
    </section>
  );
}

export default memo(DashboardFinancialCarousel, compareDashboardSectionProps);
