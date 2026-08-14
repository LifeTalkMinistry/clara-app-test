import { ClaraOrbMark } from "@/components/community/ClaraOrbPage";

export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-[#182028]";

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      style={{
        animation: "claraLogoFadeIn 1200ms ease-out both",
      }}
    >
      <ClaraOrbMark
        className="h-20 w-20 shrink-0"
        title="CLARA official orb"
      />

      {variant === "full" && (
        <p
          className={`font-heading text-xl font-bold leading-tight tracking-[0.12em] transition duration-500 ${textColor}`}
          aria-label="CLARA"
        >
          <span className="text-[#4d8cff]">CL</span>
          <span className="text-[#ffd42f]">A</span>
          <span className="text-[#ff4d55]">RA</span>
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
