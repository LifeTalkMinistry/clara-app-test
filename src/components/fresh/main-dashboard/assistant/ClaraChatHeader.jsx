import { X } from "lucide-react";

export default function ClaraChatHeader({
  title,
  tagline,
  onClose,
  closeDisabled = false,
}) {
  return (
    <header
      className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_56%,rgba(7,31,38,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]"
      data-clara-chat-header="true"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff,#2be1d8)]" />
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#8ffff8]/78">CLARA CHAT</p>
      <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">{title}</h1>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">{tagline}</p>
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className="absolute inset-y-0 right-4 z-30 my-auto grid h-9 w-9 touch-manipulation place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
        aria-label={`Close ${title}`}
        data-clara-chat-close="true"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}
