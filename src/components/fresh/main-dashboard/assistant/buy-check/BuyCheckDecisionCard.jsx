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
  if (normalized === "BUY") return "border-blue-300/28 bg-blue-500/[0.10]";
  if (normalized === "BUY WITH CAP") return "border-blue-300/28 bg-blue-500/[0.10]";
  if (normalized === "REDUCE") return "border-yellow-300/30 bg-yellow-400/[0.08]";
  if (normalized === "WAIT") return "border-yellow-300/30 bg-yellow-400/[0.08]";
  if (normalized === "DO NOT BUY") return "border-red-300/28 bg-red-500/[0.09]";
  return "border-blue-300/24 bg-blue-500/[0.08]";
}

export default function BuyCheckDecisionCard({ diagnosis, onAction }) {
  if (!diagnosis) return null;
  const summary = diagnosis.summaryCard || {};
  const actions = actionConfig(diagnosis.decision, diagnosis.reasonCode);

  return (
    <section
      data-clara-buy-check-decision-card="true"
      className={`relative mt-3 overflow-hidden rounded-[32px] border px-5 py-6 text-left shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl ${themeFor(diagnosis.decision)}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#2563eb_0%,#2563eb_40%,#facc15_50%,#ef4444_60%,#ef4444_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_94%_18%,rgba(239,68,68,0.11),transparent_34%),linear-gradient(155deg,rgba(2,6,23,0.72),rgba(7,17,31,0.9))]" />
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200/70">ASK BEFORE YOU SPEND</p>
      <h2 data-clara-buy-check-summary-verdict="true" className="mt-4 text-[28px] font-black leading-[1.04] tracking-[-0.04em] text-white">
        {summary.verdict || diagnosis.userFacingDecision || diagnosis.decision}
      </h2>
      <p className="mt-4 max-w-[30ch] text-[13.5px] font-semibold leading-6 text-slate-100/88">
        {summary.explanation || diagnosis.explanation}
      </p>
      <div className="mt-6 rounded-[24px] border border-blue-200/14 bg-slate-950/42 px-4 py-4 shadow-inner">
        <p className="text-[25px] font-black tracking-[-0.035em] text-white">{summary.impactValue || diagnosis.impact?.formattedValue || "Checked"}</p>
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-200/66">{summary.impactLabel || diagnosis.impact?.label || "Purchase impact"}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => onAction?.(actions.primaryAction)} className="min-h-12 rounded-full bg-blue-600 px-3 text-[11px] font-black text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-500 active:scale-[0.98]">
          {actions.primary}
        </button>
        <button type="button" onClick={() => onAction?.(actions.secondaryAction)} className="min-h-12 rounded-full border border-white/15 bg-slate-950/55 px-3 text-[11px] font-black text-white/92 transition hover:border-red-300/30 hover:bg-red-500/[0.08] active:scale-[0.98]">
          {actions.secondary}
        </button>
      </div>
    </section>
  );
}

export { actionConfig };
