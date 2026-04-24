import { useNavigate } from "react-router-dom";

const MONEY_TRANSACTION_LABELS = new Set([
  "money left",
  "total money",
]);

export default function StatCard({
  label = "",
  value = "-",
  sub = "",
  icon: Icon = null,
  variant = "default",
  className = "",
  highlight = false,
  to = "",
  onClick = null,
}) {
  const navigate = useNavigate();
  const normalizedLabel = String(label || "").trim().toLowerCase();
  const autoTransactionTarget = MONEY_TRANSACTION_LABELS.has(normalizedLabel) ? "/expenses" : "";
  const targetPath = to || autoTransactionTarget;
  const isClickable = Boolean(targetPath || onClick);

  const handleClick = () => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }

    if (targetPath) {
      navigate(targetPath);
    }
  };

  const variants = {
    default: {
      wrapper:
        "theme-panel-card backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/75",
      sub: "text-white/60",
    },
    yellow: {
      wrapper:
        "border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(56,44,10,0.98)_0%,rgba(92,72,18,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-[#FFF4B0]",
      value: "text-white",
      label: "text-[#FDE68A]",
      sub: "text-[#FFF7CC]",
    },
    green: {
      wrapper:
        "border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/80",
      sub: "text-white/65",
    },
    blue: {
      wrapper:
        "border border-sky-500/20 bg-[linear-gradient(135deg,rgba(10,18,36,0.98)_0%,rgba(18,52,120,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/80",
      sub: "text-white/65",
    },
    danger: {
      wrapper:
        "border border-red-500/30 bg-[linear-gradient(135deg,rgba(40,10,10,0.98)_0%,rgba(90,20,20,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-red-200",
      value: "text-white",
      label: "text-red-200",
      sub: "text-red-100",
    },
  };

  const v = variants[variant] || variants.default;
  const cardClassName = `flex h-full flex-col rounded-2xl p-4 text-left transition-all duration-300 active:scale-[0.97] hover:scale-[1.01] ${
    isClickable ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/40" : ""
  } ${
    highlight
      ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
      : ""
  } ${v.wrapper} ${className}`;

  const content = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${v.label}`}
        >
          {label}
        </span>

        {Icon ? (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.icon}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <p className={`break-words text-2xl font-bold leading-tight ${v.value}`}>
        {value}
      </p>

      {sub ? (
        <p className={`mt-2 text-sm leading-snug ${v.sub}`}>
          {sub}
        </p>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-[60%] rounded-full bg-white/20" />
        </div>
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cardClassName}
        aria-label={`Open transactions for ${label}`}
      >
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
