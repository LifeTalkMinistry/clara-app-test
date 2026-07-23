import { CalendarDays, CircleAlert, Clock3, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";

export function SummaryChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2 text-cyan-100/65"><Icon className="h-3.5 w-3.5" /><span className="text-[8px] font-black uppercase tracking-[0.16em]">{label}</span></div>
      <p className="mt-1.5 text-[15px] font-black text-white">{value}</p>
    </div>
  );
}

export function SessionIntro({ isCommitmentSession, onIconTap }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
      <div className="flex items-center gap-3.5">
        <button type="button" onClick={onIconTap} aria-label="Open coaching calendar" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.22),rgba(124,58,237,0.48))] shadow-[0_14px_34px_rgba(76,29,149,0.30)]"><CalendarDays className="h-6 w-6 text-cyan-50" /></button>
        <div><h1 className="text-[28px] font-black tracking-tight text-white sm:text-[34px]">{isCommitmentSession ? "One-on-One Budgeting Session" : "Monthly Coaching"}</h1><p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-300/75 sm:text-[13px]">Choose a real available schedule for your personal session with Max.</p></div>
      </div>
      <div><div className="grid grid-cols-3 gap-2.5"><SummaryChip icon={Clock3} label="Duration" value="30 min" /><SummaryChip icon={Sparkles} label="Access" value={isCommitmentSession ? "First Step" : "Monthly"} /><SummaryChip icon={CalendarDays} label="Timezone" value="Manila" /></div><p className="mt-2.5 text-center text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/50">Backend-controlled availability</p></div>
    </div>
  );
}

export function LoadingPanel({ label = "Loading real availability…" }) {
  return <div className="flex min-h-52 flex-col items-center justify-center text-center"><LoaderCircle className="h-7 w-7 animate-spin text-cyan-200" /><p className="mt-3 text-[11px] font-black uppercase tracking-[0.13em] text-cyan-100/70">{label}</p></div>;
}

export function NoticePanel({ title, message, actionLabel, onAction, danger = false }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center">
      <span className={`flex h-14 w-14 items-center justify-center rounded-[20px] border ${danger ? "border-rose-200/20 bg-rose-300/[0.08]" : "border-cyan-200/20 bg-cyan-300/[0.08]"}`}><CircleAlert className={`h-6 w-6 ${danger ? "text-rose-200" : "text-cyan-200"}`} /></span>
      <h2 className="mt-4 text-[22px] font-black text-white">{title}</h2><p className="mt-2 max-w-lg text-[11px] font-semibold leading-relaxed text-slate-300/68">{message}</p>
      {actionLabel ? <button type="button" onClick={onAction} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.84),rgba(99,102,241,0.92))] px-5 text-[9px] font-black uppercase tracking-[0.10em] text-white"><RefreshCw className="h-3.5 w-3.5" />{actionLabel}</button> : null}
    </div>
  );
}
