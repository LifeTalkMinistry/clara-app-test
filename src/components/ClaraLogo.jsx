import logo from "../../assets/icon.png";

export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-[#182028]";
  const wordGlow = isDark
    ? "drop-shadow-[0_0_14px_rgba(45,212,191,0.28)]"
    : "drop-shadow-[0_0_12px_rgba(20,184,166,0.22)]";

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      style={{
        animation: "claraLogoFadeIn 1200ms ease-out both",
      }}
    >
      <img
        src={logo}
        alt="CLARA Logo"
        className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(45,212,191,0.28)]"
      />

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
      `}</style>
    </div>
  );
}
