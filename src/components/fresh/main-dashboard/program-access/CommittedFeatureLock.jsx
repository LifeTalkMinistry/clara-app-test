import { Lock } from "lucide-react";

export default function CommittedFeatureLock({
  message,
  onClick,
  className = "h-[150px]",
  ariaLabel,
}) {
  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel || message}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-[26px] border border-cyan-100/12 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.15),transparent_46%),rgba(7,16,34,0.88)] text-center text-white shadow-[0_18px_46px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition active:scale-[0.99] ${className}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className="pointer-events-none absolute -left-12 -top-14 h-28 w-28 rounded-full bg-cyan-300/[0.07]" />
      <span className="pointer-events-none absolute -bottom-16 -right-10 h-32 w-32 rounded-full bg-violet-400/[0.08]" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.035] via-transparent to-black/12" />

      <span className="relative flex h-full flex-col items-center justify-center px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-cyan-50/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Lock className="h-4 w-4" />
        </span>
        <span className="mt-3 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/48">
          COMMITTED VERSION
        </span>
        <span className="mt-1.5 text-[12px] font-bold leading-5 text-white/72 transition group-hover:text-white/84">
          {message}
        </span>
      </span>
    </button>
  );
}
