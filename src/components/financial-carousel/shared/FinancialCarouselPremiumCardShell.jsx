import FinanceCardExpandButton from "./FinanceCardExpandButton";

export default function FinancialCarouselPremiumCardShell({
  icon,
  title,
  subtitle,
  statusLabel,
  mainValue,
  mainValueClassName = "text-white",
  supportText,
  metrics = [],
  actionLabel = "View details",
  expandedActionLabel,
  detailKey,
  expanded = false,
  onToggleDetails,
  children,
  className = "",
  innerClassName = "",
}) {
  const metricColumnClass = metrics.length >= 3 ? "grid-cols-3" : "grid-cols-2";
  const hasAction = Boolean(detailKey && typeof onToggleDetails === "function");

  return (
    <div
      className={`relative z-10 flex h-full min-h-[286px] flex-col overflow-hidden px-4 pb-4 pt-5 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.58]">
        <div className="absolute -left-20 top-[-58px] h-44 w-44 rounded-full bg-cyan-300/[0.085] blur-3xl" />
        <div className="absolute right-[-72px] top-[-38px] h-44 w-44 rounded-full bg-violet-500/[0.08] blur-3xl" />
        <div className="absolute bottom-[-116px] right-[-70px] h-56 w-56 rounded-full bg-indigo-500/[0.13] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.022),transparent_32%,rgba(0,0,0,0.15)_100%)]" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className={`relative min-h-0 flex-1 overflow-hidden rounded-[30px] border border-cyan-100/[0.12] bg-[linear-gradient(135deg,rgba(10,70,82,0.30),rgba(16,33,78,0.34)_48%,rgba(72,38,130,0.28))] px-6 pb-5 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.085),0_18px_36px_rgba(0,0,0,0.18),0_0_30px_rgba(103,232,249,0.045)] backdrop-blur-xl ${innerClassName}`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_16%_0%,rgba(103,232,249,0.14),transparent_36%),radial-gradient(circle_at_88%_100%,rgba(168,85,247,0.15),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.006)_44%,rgba(0,0,0,0.12))]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/30 to-transparent" />

          <div className="relative flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-cyan-100/[0.16] bg-white/[0.075] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_18px_rgba(34,211,238,0.08),0_8px_18px_rgba(0,0,0,0.15)] backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/32 to-transparent" />
              <div className="pointer-events-none absolute -left-3 -top-3 h-8 w-8 rounded-full bg-cyan-200/[0.10] blur-xl" />
              <div className="relative flex h-4 w-4 items-center justify-center">
                {icon}
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black leading-tight tracking-[-0.02em] text-white/96">
                    {title}
                  </p>
                  {subtitle ? (
                    <p className="mt-1 truncate text-[11px] font-bold leading-none text-white/78">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                {statusLabel ? (
                  <span className="relative shrink-0 overflow-hidden rounded-full border border-cyan-100/[0.14] bg-white/[0.075] px-2.5 py-1 text-[10px] font-black leading-none text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.115),0_8px_18px_rgba(0,0,0,0.13)] backdrop-blur-sm">
                    <span className="pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/24 to-transparent" />
                    <span className="relative truncate">{statusLabel}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative mt-7">
            <p
              className={`min-w-0 break-words text-[32px] font-black leading-none tracking-[-0.055em] drop-shadow-[0_10px_26px_rgba(0,0,0,0.22)] ${mainValueClassName}`}
            >
              {mainValue}
            </p>
            {supportText ? (
              <p className="mt-3 text-[13px] font-bold leading-snug text-white/76">
                {supportText}
              </p>
            ) : null}
          </div>

          {metrics.length ? (
            <div className="relative mt-4 overflow-hidden rounded-[24px] border border-cyan-100/[0.10] bg-black/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_26px_rgba(0,0,0,0.13)] backdrop-blur-xl">
              <div className={`grid ${metricColumnClass} divide-x divide-white/[0.07]`}>
                {metrics.map((metric) => (
                  <div key={metric.label} className="relative min-w-0 px-2.5 py-3 text-center">
                    <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                    <p className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${metric.valueClassName || "text-white/90"}`}>
                      {metric.value}
                    </p>
                    <p className="mt-1.5 truncate text-[8px] font-black uppercase tracking-[0.16em] text-white/40">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {children}
        </div>

        {hasAction ? (
          <div className="mt-4 shrink-0 border-t border-white/[0.055] pt-3">
            <FinanceCardExpandButton
              detailKey={detailKey}
              expanded={expanded}
              onToggleDetails={onToggleDetails}
              collapsedLabel={actionLabel}
              expandedLabel={expandedActionLabel || actionLabel}
              className="border-white/[0.055] bg-white/[0.07] py-3 font-black text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl hover:border-cyan-100/[0.18] hover:bg-white/[0.09]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
