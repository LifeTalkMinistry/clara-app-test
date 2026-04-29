import logo from "../../assets/icon.png";

export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-[#182028]";
  const shellClass = isDark
    ? "bg-[#071018]/80 ring-white/10 shadow-[0_0_32px_rgba(45,212,191,0.22)]"
    : "bg-white/80 ring-slate-900/10 shadow-[0_0_28px_rgba(20,184,166,0.18)]";
  const glowClass = isDark
    ? "from-emerald-400/30 via-cyan-300/20 to-transparent"
    : "from-emerald-400/24 via-cyan-400/16 to-transparent";
  const wordGlow = isDark
    ? "drop-shadow-[0_0_14px_rgba(45,212,191,0.28)]"
    : "drop-shadow-[0_0_12px_rgba(20,184,166,0.22)]";

  return (
    <div
      className={`group flex items-center gap-3 ${className}`}
      style={{
        animation: "claraLogoFadeIn 1200ms ease-out both",
      }}
    >
      <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
        <div
          aria-hidden="true"
          className={`absolute inset-[-6px] rounded-[1.3rem] bg-gradient-to-br ${glowClass} blur-2xl opacity-80 transition duration-700 group-hover:opacity-100`}
        />

        <div
          className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl ring-1 backdrop-blur-md transition duration-500 group-hover:scale-[1.04] ${shellClass}`}
          style={{ animation: "claraFloat 3.2s ease-in-out infinite" }}
        >
          <img
            src={logo}
            alt="CLARA Logo"
            className="h-full w-full object-contain p-[3px] drop-shadow-[0_0_16px_rgba(45,212,191,0.28)]"
          />
        </div>
      </div>

      {variant === "full" && (
        <p
          className={`font-heading text-xl font-bold leading-tight tracking-wide transition duration-500 ${textColor} ${wordGlow}`}
        >
          CLARA
        </p>
      )}

      <style>{`
        @keyframes claraLogoFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.94);
            filter: blur(6px);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
            filter: blur(0);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes claraFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
