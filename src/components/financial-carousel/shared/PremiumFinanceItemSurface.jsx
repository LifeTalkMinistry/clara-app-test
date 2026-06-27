export function PremiumFinanceItemSurface({
  as: Component = "article",
  tone,
  className = "",
  children,
  rail = true,
  glow = true,
  ...props
}) {
  const rgb = tone?.rgb || "148 163 184";
  const isNeutral = tone?.key === "neutral" || !tone;

  return (
    <Component
      className={`relative overflow-hidden rounded-[20px] border px-3.5 py-3.5 ${className}`}
      style={{
        borderColor: `rgb(${rgb} / 0.22)`,
        background: `radial-gradient(circle at 10% 0%, rgb(${rgb} / ${isNeutral ? 0.055 : 0.105}), transparent 38%), linear-gradient(145deg, rgba(8,20,38,0.97), rgba(8,13,31,0.985))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 26px rgba(0,0,0,0.22), 0 0 22px rgb(${rgb} / ${isNeutral || !glow ? 0.02 : 0.05})`,
      }}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-x-5 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, rgb(${rgb} / 0.40), transparent)` }}
        />
        {glow && !isNeutral ? (
          <div
            className="absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl"
            style={{ backgroundColor: `rgb(${rgb} / 0.08)` }}
          />
        ) : null}
      </div>

      {rail ? (
        <div
          className="pointer-events-none absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full"
          style={{
            backgroundColor: `rgb(${rgb})`,
            boxShadow: `0 0 14px rgb(${rgb} / ${isNeutral ? 0.16 : 0.30})`,
          }}
        />
      ) : null}

      <div className="relative">{children}</div>
    </Component>
  );
}

export function PremiumFinanceIconTile({ tone, children, className = "" }) {
  const rgb = tone?.rgb || "148 163 184";
  const isNeutral = tone?.key === "neutral" || !tone;

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${className}`}
      style={{
        color: `rgb(${rgb})`,
        borderColor: `rgb(${rgb} / 0.22)`,
        background: `rgb(${rgb} / ${isNeutral ? 0.055 : 0.10})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 18px rgba(0,0,0,0.16), 0 0 16px rgb(${rgb} / ${isNeutral ? 0.02 : 0.06})`,
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export function PremiumFinanceInfoRow({ label, value, valueClassName = "text-white/88", className = "" }) {
  return (
    <div className={`flex min-w-0 items-center justify-between gap-3 py-2 ${className}`}>
      <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.15em] text-white/34">
        {label}
      </span>
      <span className={`shrink-0 text-[11px] font-black ${valueClassName}`}>{value}</span>
    </div>
  );
}
