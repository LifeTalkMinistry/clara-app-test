export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
}) {
  const variants = {
    default: {
      wrapper:
        "border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_14px_36px_rgba(0,0,0,0.22)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/65",
      sub: "text-white/45",
    },
    yellow: {
      wrapper:
        "border border-yellow-400/20 bg-[linear-gradient(135deg,#4a3607,#6a520c)] shadow-[0_14px_36px_rgba(0,0,0,0.22)]",
      icon: "bg-white/10 text-yellow-200",
      value: "text-white",
      label: "text-yellow-100/90",
      sub: "text-yellow-100/75",
    },
    blue: {
      wrapper:
        "border border-sky-400/20 bg-[linear-gradient(135deg,#0b214d,#173b8f)] shadow-[0_14px_36px_rgba(0,0,0,0.22)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/78",
      sub: "text-white/58",
    },
  };

  const v = variants[variant] || variants.default;

  return (
    <div className={`rounded-[24px] p-5 ${v.wrapper}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${v.label}`}>
          {label}
        </span>

        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${v.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <p className={`text-3xl font-bold ${v.value}`}>{value}</p>

      {sub && <p className={`mt-3 text-sm ${v.sub}`}>{sub}</p>}
    </div>
  );
}