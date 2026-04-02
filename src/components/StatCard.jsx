export default function StatCard({ label, value, sub, icon: Icon, variant = "default" }) {
  const variants = {
    default: {
      wrapper: "border border-white/10 bg-[#0B1220]/95",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/70",
      sub: "text-white/50",
    },
    yellow: {
      wrapper: "border border-yellow-400/30 bg-gradient-to-br from-[#3A2F0A] to-[#5C4812]",
      icon: "bg-white/10 text-yellow-200",
      value: "text-white",
      label: "text-yellow-200",
      sub: "text-yellow-100/80",
    },
    blue: {
      wrapper: "border border-sky-500/20 bg-gradient-to-br from-[#0A1224] to-[#123478]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/80",
      sub: "text-white/65",
    },
  };

  const v = variants[variant] || variants.default;

  return (
    <div className={`rounded-2xl p-4 ${v.wrapper}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-semibold uppercase ${v.label}`}>
          {label}
        </span>

        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.icon}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <p className={`text-xl md:text-2xl font-bold ${v.value}`}>
        {value}
      </p>

      {sub && (
        <p className={`text-xs mt-2 ${v.sub}`}>
          {sub}
        </p>
      )}
    </div>
  );
}