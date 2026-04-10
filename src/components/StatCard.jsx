export default function StatCard({
  label = "",
  value = "—",
  sub = "",
  icon: Icon = null,
  variant = "default",
  className = "",
  highlight = false, // 🔥 NEW (for important cards)
}) {
  const variants = {
    default: {
      wrapper:
        "border border-white/10 bg-[#0B1220]/95 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
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

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 
      active:scale-[0.97] hover:scale-[1.01]
      ${highlight ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : ""}
      ${v.wrapper} ${className}`}
    >
      {/* TOP */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${v.label}`}
        >
          {label}
        </span>

        {Icon ? (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${v.icon}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>

      {/* VALUE */}
      <p
        className={`text-2xl font-bold leading-tight break-words ${v.value}`}
      >
        {value}
      </p>

      {/* SUBTEXT */}
      {sub ? (
        <p className={`text-sm mt-2 leading-snug ${v.sub}`}>
          {sub}
        </p>
      ) : null}

      {/* 🔥 OPTIONAL MINI PROGRESS LINE (AUTO PREMIUM FEEL) */}
      <div className="mt-3 h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full w-[60%] bg-white/20 rounded-full" />
      </div>
    </div>
  );
}