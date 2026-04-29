import logo from "../../assets/icon.png";

/**
 * ClaraLogo – reusable brand logo component
 * variant="full"    → logo icon + "CLARA" wordmark
 * variant="icon"    → logo icon only
 * theme="dark"      → white text
 * theme="light"     → dark text
 */
export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-[#182028]";
  const shellClass = isDark
    ? "bg-[#071018]/80 ring-white/10 shadow-[0_0_26px_rgba(45,212,191,0.18)]"
    : "bg-white/80 ring-slate-900/10 shadow-[0_0_24px_rgba(20,184,166,0.16)]";
  const glowClass = isDark
    ? "from-emerald-400/30 via-cyan-300/20 to-transparent"
    : "from-emerald-400/24 via-cyan-400/16 to-transparent";
  const wordGlow = isDark
    ? "drop-shadow-[0_0_12px_rgba(45,212,191,0.24)]"
    : "drop-shadow-[0_0_10px_rgba(20,184,166,0.18)]";

  return (
    <div
      className={`group flex items-center gap-2.5 ${className}`}
      style={{
        animation: "claraLogoFadeIn 520ms ease-out both",
      }}
    >
      <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center">
        <div
          aria-hidden="true"
          className={`absolute inset-[-5px] rounded-[1.15rem] bg-gradient-to-br ${glowClass} blur-xl opacity-80 transition duration-500 group-hover:opacity-100`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/18 via-white/5 to-transparent opacity-70"
        />
        <div
          className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-1 backdrop-blur-md transition duration-500 group-hover:scale-[1.03] ${shellClass}`}
        >
          <img
            src={logo}
            alt="CLARA Logo"
            className="h-full w-full object-contain p-[2px] drop-shadow-[0_0_12px_rgba(45,212,191,0.22)]"
          />
        </div>
      </div>

      {variant === "full" && (
        <p
          className={`font-heading text-lg font-bold leading-tight tracking-wide transition duration-500 ${textColor} ${wordGlow}`}
        >
          CLARA
        </p>
      )}

      <style>{`
        @keyframes claraLogoFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.98);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}
