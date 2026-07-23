import { ArrowRight, CalendarDays, ChevronLeft, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import { SummaryChip } from "./SessionShared";
import { APPROACH_OPTIONS, CHECK_IN_STEPS, DATA_CONSENT_OPTIONS, DESIRED_OUTCOME_OPTIONS, EMOTION_OPTIONS, SESSION_FOCUS_OPTIONS } from "./sessionOptions";

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || "Not answered";
}

export default function SessionCheckIn({ selectedSlot, questionIndex, answers, onAnswer, onBack, onNext, onSubmit, isSubmitting, submitError, recoveredDraft }) {
  const isReview = questionIndex >= CHECK_IN_STEPS.length;
  const step = CHECK_IN_STEPS[Math.min(questionIndex, CHECK_IN_STEPS.length - 1)];
  const currentAnswer = answers[step.key];
  const canContinue = step.type === "textarea" ? String(currentAnswer || "").trim().length >= 5 : Boolean(currentAnswer);
  return (
    <div>
      <button type="button" onClick={onBack} disabled={isSubmitting} className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/65"><ChevronLeft className="h-4 w-4" />Back</button>
      {recoveredDraft ? <div className="mt-3 rounded-[16px] border border-amber-200/20 bg-amber-100/[0.06] px-3.5 py-3 text-[10px] font-semibold text-amber-100/80">Recovered unsent draft — this request has not been submitted yet.</div> : null}
      {!isReview ? (
        <div className="mt-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">{step.eyebrow} · {questionIndex + 1}/{CHECK_IN_STEPS.length}</p><h1 className="mt-2 text-[25px] font-black leading-tight text-white sm:text-[31px]">{step.title}</h1><p className="mt-2 text-[11px] font-semibold text-slate-300/65">{step.helper}</p>
          {step.type === "choice" ? <div className="mt-5 grid gap-2.5 sm:grid-cols-2">{step.options.map((option) => <button key={option.value} type="button" onClick={() => onAnswer(step.key, option.value)} className={`rounded-[18px] border px-4 py-3.5 text-left ${currentAnswer === option.value ? "border-cyan-200/45 bg-cyan-200/[0.10]" : "border-white/[0.08] bg-white/[0.035]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-black text-white">{option.label}</span>{option.recommended ? <span className="rounded-full bg-violet-300/[0.10] px-2 py-1 text-[7px] font-black uppercase text-violet-200">Recommended</span> : null}</div>{option.description ? <p className="mt-1.5 text-[9px] font-semibold text-slate-300/55">{option.description}</p> : null}</button>)}</div> : <div className="mt-5"><textarea value={currentAnswer} onChange={(event) => onAnswer(step.key, event.target.value)} maxLength={1200} rows={6} placeholder="Briefly describe what is happening." className="w-full resize-none rounded-[20px] border border-white/[0.09] bg-black/[0.14] px-4 py-4 text-[12px] font-semibold text-white outline-none focus:border-cyan-200/35" /><p className="mt-1.5 text-right text-[8px] text-slate-400/45">{String(currentAnswer || "").length}/1200</p></div>}
          <button type="button" disabled={!canContinue} onClick={onNext} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white disabled:opacity-40">{questionIndex === CHECK_IN_STEPS.length - 1 ? "Review check-in" : "Continue"}<ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Final review</p><h1 className="mt-2 text-[27px] font-black text-white">Submit your session request</h1>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2"><SummaryChip icon={CalendarDays} label="Date" value={selectedSlot.fullDateLabel} /><SummaryChip icon={Clock3} label="Time" value={selectedSlot.timeLabel} /></div>
          <div className="mt-4 space-y-2 rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4 text-[10px] font-semibold text-slate-300/70"><p><strong className="text-white">Focus:</strong> {optionLabel(SESSION_FOCUS_OPTIONS, answers.focus)}</p><p><strong className="text-white">Desired outcome:</strong> {optionLabel(DESIRED_OUTCOME_OPTIONS, answers.outcome)}</p><p><strong className="text-white">Current feeling:</strong> {optionLabel(EMOTION_OPTIONS, answers.emotion)}</p><p><strong className="text-white">Approach:</strong> {optionLabel(APPROACH_OPTIONS, answers.approach)}</p><p><strong className="text-white">Permission:</strong> {optionLabel(DATA_CONSENT_OPTIONS, answers.dataConsent)}</p></div>
          {submitError ? <div className="mt-4 rounded-[16px] border border-rose-200/20 bg-rose-300/[0.07] px-3.5 py-3 text-[10px] font-semibold text-rose-100/85">{submitError}</div> : null}
          <button type="button" disabled={isSubmitting} onClick={onSubmit} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white disabled:opacity-55">{isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{isSubmitting ? "Submitting request…" : "Submit session request"}</button>
        </div>
      )}
    </div>
  );
}
