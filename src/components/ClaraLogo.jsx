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
  const textColor = theme === "dark" ? "text-white" : "text-[#182028]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logo}
        alt="CLARA Logo"
        className="w-10 h-10 rounded-xl object-contain bg-[#071018] flex-shrink-0"
        style={{ padding: "2px" }}
      />

      {variant === "full" && (
        <p
          className={`font-heading font-bold text-lg leading-tight tracking-wide ${textColor}`}
        >
          CLARA
        </p>
      )}
    </div>
  );
}
