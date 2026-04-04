import logo from "@/assets/clara-logo.png";

export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const textColor = theme === "dark" ? "text-white" : "text-[#182028]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071018] p-[3px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.35)]">
        <img
          src={logo}
          alt="CLARA Logo"
          className="h-full w-full rounded-[14px] object-cover"
        />
      </div>

      {variant === "full" && (
        <div className="leading-none">
          <p className={`text-[29px] font-bold tracking-tight ${textColor}`}>
            CLARA
          </p>
        </div>
      )}
    </div>
  );
}