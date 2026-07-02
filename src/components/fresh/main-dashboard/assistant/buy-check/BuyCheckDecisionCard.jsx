import { Info } from "lucide-react";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

function actionConfig(decision = "", reasonCode = "") {
  const normalized = clean(decision).toUpperCase();
  const normalizedReason = clean(reasonCode).toUpperCase();

  if (["NO_PAYABLE_WALLET", "SCAN_FAILED"].includes(normalizedReason)) {
    return {
      primary: "Will not buy yet",
      primaryAction: "not_buy",
      secondary: "Buy anyway",
      secondaryAction: "buy",
    };
  }

  if (normalized === "BUY") {
    return {
      primary: "Will buy",
      primaryAction: "buy",
      secondary: "Will not buy",
      secondaryAction: "not_buy",
    };
  }

  if (normalized === "BUY WITH CAP") {
    return {
      primary: "Will buy within limit",
      primaryAction: "buy",
      secondary: "Will not buy",
      secondaryAction: "not_buy",
    };
  }

  if (normalized === "REDUCE") {
    return {
      primary: "Will reduce amount",
      primaryAction: "edit_amount",
      secondary: "Buy anyway",
      secondaryAction: "buy",
    };
  }

  if (normalized === "WAIT") {
    return {
      primary: "Will wait for now",
      primaryAction: "not_buy",
      secondary: "Buy anyway",
      secondaryAction: "buy",
    };
  }

  if (normalized === "DO NOT BUY") {
    return {
      primary: "Will not buy",
      primaryAction: "not_buy",
      secondary: "Buy anyway",
      secondaryAction: "buy",
    };
  }

  return {
    primary: "Will wait for now",
    primaryAction: "not_buy",
    secondary: "Buy anyway",
    secondaryAction: "buy",
  };
}

function themeFor(decision = "") {
  const normalized = clean(decision).toUpperCase();
  if (normalized === "BUY") return "border-emerald-200/25 bg-emerald-300/10";
  if (normalized === "BUY WITH CAP") return "border-cyan-200/25 bg-cyan-300/10";
  if (normalized === "REDUCE") return "border-amber-200/25 bg-amber-300/10";
  if (normalized === "WAIT") return "border-orange-200/25 bg-orange-300/10";
  if (normalized === "DO NOT BUY") return "border-rose-200/25 bg-rose-300/10";
  return "border-violet-200/25 bg-violet-300/10";
}

export default function BuyCheckDecisionCard({ diagnosis, onAction, onOpenDetails }) {
  if (!diagnosis) return null;
  const summary = diagnosis.summaryCard || {};
  const actions = actionConfig(diagnosis.decision, diagnosis.reasonCode);
  const run = (action) => action === "open_details" ? onOpenDetails?.() : onAction?.(action);
  return (
    <section
      data-clara-buy-check-decision-card="true"
      className={`mt-2 rounded-[30px] border px-5 py-6 text-left shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-2xl ${themeFor(diagnosis.decision)}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">{summary.eyebrow || "BUY CHECK"}</p>
      <h2 data-clara-buy-check-summary-verdict="true" className="mt-3 text-[26px] font-black leading-[1.05] tracking-[-0.035em] text-white">
        {summary.verdict || diagnosis.userFacingDecision || diagnosis.decision}
      </h2>
      <p className="mt-4 text-[13.5px] font-semibold leading-6 text-slate-100/90">
        {summary.explanation || diagnosis.explanation}
      </p>
      <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/25 px-4 py-4">
        <p className="text-[24px] font-black tracking-[-0.03em] text-white">{summary.impactValue || diagnosis.impact?.formattedValue || "Checked"}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300/62">{summary.impactLabel || diagnosis.impact?.label || "Purchase impact"}</p>
      </div>
      <button
        type="button"
        data-clara-buy-check-details-trigger="true"
        onClick={onOpenDetails}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-[11px] font-black text-cyan-100/88 transition hover:bg-white/[0.1]"
      >
        <Info className="h-4 w-4" />
        {summary.informationLabel || "Why this result?"}
      </button>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => run(actions.primaryAction)} className="min-h-11 rounded-full bg-cyan-300 px-3 text-[11px] font-black text-slate-950">
          {actions.primary}
        </button>
        <button type="button" onClick={() => run(actions.secondaryAction)} className="min-h-11 rounded-full border border-white/15 bg-slate-900/80 px-3 text-[11px] font-black text-white/92">
          {actions.secondary}
        </button>
      </div>
    </section>
  );
}

export { actionConfig };
