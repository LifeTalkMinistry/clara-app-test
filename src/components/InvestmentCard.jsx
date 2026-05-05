import { TrendingUp } from "lucide-react";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const clampProgress = (value) => Math.max(0, Math.min(Number(value) || 0, 100));

const getInvestmentToneClasses = (tone = "gold") => {
  const toneMap = {
    emerald: {
      border: "border-emerald-300/20",
      iconShell:
        "border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.14)]",
      icon: "text-emerald-200",
      status:
        "border-emerald-300/25 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.12)]",
      value: "text-emerald-200",
      bar: "from-emerald-300 via-emerald-400 to-green-300",
      accent: "bg-emerald-300/20",
      background:
        "radial-gradient(circle at top left, rgba(52,211,153,0.30), transparent 28%), radial-gradient(circle at top right, rgba(45,212,191,0.14), transparent 26%), radial-gradient(circle at bottom right, rgba(250,204,21,0.10), transparent 24%), linear-gradient(135deg, rgba(4,25,24,0.96), rgba(3,14,24,0.99))",
    },
    teal: {
      border: "border-teal-300/20",
      iconShell:
        "border-teal-300/25 bg-teal-400/10 shadow-[0_0_18px_rgba(45,212,191,0.14)]",
      icon: "text-teal-200",
      status:
        "border-teal-300/25 bg-teal-500/15 text-teal-200 shadow-[0_0_18px_rgba(45,212,191,0.12)]",
      value: "text-teal-200",
      bar: "from-teal-300 via-cyan-300 to-emerald-300",
      accent: "bg-teal-300/20",
      background:
        "radial-gradient(circle at top left, rgba(45,212,191,0.30), transparent 28%), radial-gradient(circle at top right, rgba(56,189,248,0.14), transparent 26%), radial-gradient(circle at bottom right, rgba(52,211,153,0.10), transparent 24%), linear-gradient(135deg, rgba(4,23,30,0.96), rgba(3,14,24,0.99))",
    },
    blue: {
      border: "border-blue-300/20",
      iconShell:
        "border-blue-300/25 bg-blue-400/10 shadow-[0_0_18px_rgba(96,165,250,0.14)]",
      icon: "text-blue-200",
      status:
        "border-blue-300/25 bg-blue-500/15 text-blue-200 shadow-[0_0_18px_rgba(96,165,250,0.12)]",
      value: "text-blue-200",
      bar: "from-blue-300 via-sky-300 to-cyan-300",
      accent: "bg-blue-300/20",
      background:
        "radial-gradient(circle at top left, rgba(96,165,250,0.30), transparent 28%), radial-gradient(circle at top right, rgba(34,211,238,0.13), transparent 26%), radial-gradient(circle at bottom right, rgba(168,85,247,0.10), transparent 24%), linear-gradient(135deg, rgba(8,18,52,0.96), rgba(3,14,24,0.99))",
    },
    gold: {
      border: "border-amber-300/20",
      iconShell:
        "border-amber-300/25 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,0.14)]",
      icon: "text-amber-200",
      status:
        "border-amber-300/25 bg-amber-500/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.12)]",
      value: "text-amber-200",
      bar: "from-amber-200 via-yellow-300 to-orange-300",
      accent: "bg-amber-300/20",
      background:
        "radial-gradient(circle at top left, rgba(250,204,21,0.30), transparent 28%), radial-gradient(circle at top right, rgba(251,146,60,0.14), transparent 26%), radial-gradient(circle at bottom right, rgba(52,211,153,0.10), transparent 24%), linear-gradient(135deg, rgba(29,18,8,0.96), rgba(3,14,24,0.99))",
    },
    rose: {
      border: "border-rose-300/20",
      iconShell:
        "border-rose-300/25 bg-rose-400/10 shadow-[0_0_18px_rgba(251,113,133,0.14)]",
      icon: "text-rose-200",
      status:
        "border-rose-300/25 bg-rose-500/15 text-rose-200 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
      value: "text-rose-200",
      bar: "from-rose-300 via-pink-300 to-orange-300",
      accent: "bg-rose-300/20",
      background:
        "radial-gradient(circle at top left, rgba(251,113,133,0.28), transparent 28%), radial-gradient(circle at top right, rgba(244,114,182,0.13), transparent 26%), radial-gradient(circle at bottom right, rgba(250,204,21,0.09), transparent 24%), linear-gradient(135deg, rgba(40,12,18,0.96), rgba(3,14,24,0.99))",
    },
  };

  return toneMap[tone] || toneMap.gold;
};

const getDataValue = (data, keys, fallback = null) => {
  for (const key of keys) {
    const value = data?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

export default function InvestmentCard({ item = null }) {
  const data = item?.data || {};
  const tone = getInvestmentToneClasses(item?.tone || data.tone || "gold");

  const title = data.title || item?.label || "Investment Fund";
  const subtitle =
    data.subtitle || "Grow your money with a calm, long-term investment plan.";
  const description =
    data.description ||
    "This card is reserved for future investment fund data without breaking Dashboard.jsx.";

  const currentAmount = Number(
    getDataValue(data, ["currentAmount", "savedAmount", "balance", "amount", "value"], 0)
  );
  const targetAmount = Number(
    getDataValue(data, ["targetAmount", "target", "goalAmount", "goal"], 0)
  );
  const manualProgress = getDataValue(data, ["progress", "progressPct", "pct"], null);
  const progress = clampProgress(
    manualProgress !== null && manualProgress !== undefined
      ? manualProgress
      : targetAmount > 0
        ? (currentAmount / targetAmount) * 100
        : 0
  );

  const hasAmount = currentAmount > 0;
  const statusLabel = data.statusLabel || data.ctaLabel || "Coming soon";
  const mainLabel = hasAmount ? fmt(currentAmount) : "Portfolio setup";
  const progressLabel =
    data.progressLabel ||
    (targetAmount > 0 ? `${progress.toFixed(0)}% funded` : "Ready for future tracking");

  const statOneLabel = data.statOneLabel || "Current";
  const statOneValue = data.statOneValue || (hasAmount ? fmt(currentAmount) : "Not set");
  const statTwoLabel = data.statTwoLabel || "Target";
  const statTwoValue = data.statTwoValue || (targetAmount > 0 ? fmt(targetAmount) : "Pending");
  const statThreeLabel = data.statThreeLabel || "Mode";
  const statThreeValue = data.statThreeValue || data.mode || "Long-term";

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-2xl transition-all duration-200 ${tone.border}`}
    >
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/24 via-black/16 to-black/38" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/10 blur-3xl" />
      <div
        className={`pointer-events-none absolute right-5 top-24 h-24 w-24 rounded-full blur-3xl ${tone.accent}`}
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col justify-between">
          <div className="mb-3 flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${tone.iconShell}`}
            >
              <TrendingUp className={`h-4 w-4 ${tone.icon}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold tracking-tight text-white">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/82">
                    {subtitle}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${tone.status}`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3 pr-12">
            <p className={`text-[32px] font-bold leading-none ${tone.value}`}>
              {mainLabel}
            </p>

            <p className="mt-2 max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">
              {description}
            </p>

            <p className="mt-1 text-[11px] text-white/60">
              CLARA will keep this space ready for investment insights.
            </p>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
              <span>Growth progress</span>
              <span>{progressLabel}</span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
              <div
                className={`relative h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-40" />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
              <span>{hasAmount ? fmt(currentAmount) : "₱0"}</span>
              <span>{targetAmount > 0 ? fmt(targetAmount) : "Future goal"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  {statOneLabel}
                </p>
                <p className="truncate text-sm font-bold text-white">{statOneValue}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  {statTwoLabel}
                </p>
                <p className="truncate text-sm font-bold text-white">{statTwoValue}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  {statThreeLabel}
                </p>
                <p className="truncate text-sm font-bold text-white">{statThreeValue}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/82">
              <span className="font-medium">Investment details</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
