import { Eye, EyeOff } from "lucide-react";

export default function StatCardUI({
  label = "",
  value = "-",
  sub = "",
  icon: Icon = null,
  logic,
}) {
  const {
    cardClassName,
    displayOnlyProps,
    displayValue,
    handleClick,
    isClickable,
    moneyVisible,
    showPrivacyToggle,
    themeGlow,
    togglePrivacy,
    v,
  } = logic;

  const DisplayIcon = moneyVisible ? Eye : EyeOff;

  const content = (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(circle at 50% 0%, ${themeGlow} 0%, transparent 58%)` }}
      />

      {showPrivacyToggle ? (
        <button
          type="button"
          data-money-privacy-toggle="true"
          onClick={togglePrivacy}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          className="absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/55 shadow-[0_0_14px_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.12] hover:text-white/80 active:scale-95"
          aria-label={moneyVisible ? "Hide money summary" : "Show money summary"}
          title={moneyVisible ? "Hide amounts" : "Show amounts"}
        >
          <DisplayIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <div className="relative mb-3 flex items-center justify-between gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${showPrivacyToggle ? "pr-8" : ""} ${v.label}`}>
          {label}
        </span>
        {Icon ? (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <p className={`relative break-words text-2xl font-bold leading-tight ${v.value}`}>
        {displayValue}
      </p>

      {sub ? <p className={`relative mt-2 text-sm leading-snug ${v.sub}`}>{sub}</p> : null}
    </>
  );

  if (isClickable) {
    return (
      <button type="button" onClick={handleClick} className={cardClassName} aria-label={`Open ${label}`}>
        {content}
      </button>
    );
  }

  return (
    <div className={cardClassName} {...displayOnlyProps}>
      {content}
    </div>
  );
}
