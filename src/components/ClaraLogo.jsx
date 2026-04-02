import logo from "@/assets/clara-logo.png";

export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const textColor = theme === "dark" ? "text-white" : "text-[#182028]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-[#071018] p-[2px] shadow-inner">
        <img
          src={logo}
          alt="CLARA Logo"
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      {variant === "full" && (
        <p className={`font-bold text-lg tracking-wide ${textColor}`}>
          CLARA
        </p>
      )}
    </div>
  );
}