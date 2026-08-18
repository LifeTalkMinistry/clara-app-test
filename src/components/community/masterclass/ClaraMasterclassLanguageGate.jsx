import { ArrowLeft, ChevronRight, Globe2, X } from "lucide-react";

export default function LanguageGate({ definition, onSelect, onBack, onClose }) {
  return (
    <div className="fixed inset-0 z-[2147483500] flex min-h-[100dvh] flex-col overflow-hidden bg-[#010217] text-white">
      {definition.id !== "budget" && definition.useLegacyBudgetStyleHooks ? (
        <span hidden aria-hidden="true" aria-label="Close Budgeting Masterclass" data-masterclass-style-compat="true" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(36,107,253,0.26),transparent_35%),radial-gradient(circle_at_90%_12%,rgba(206,17,38,0.16),transparent_34%),radial-gradient(circle_at_50%_88%,rgba(252,209,22,0.07),transparent_30%)]" />
      <div className="relative z-10 flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))] sm:px-7">
        <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full border border-cyan-100/16 bg-[#071a34]/88 text-cyan-50/80 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition active:scale-95" aria-label="Back to CLARA Home">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-rose-300/15 bg-[#2a0b1a]/76 text-rose-50/76 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition active:scale-95" aria-label={definition.closeAriaLabel}>
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-7">
        <section className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] border border-cyan-100/14 bg-[linear-gradient(150deg,rgba(7,30,61,0.97),rgba(4,13,36,0.98)_52%,rgba(34,9,31,0.96))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7" data-clara-masterclass-language-gate={definition.id} data-budget-masterclass-language-gate={definition.preserveBudgetLanguageGateMarker ? "true" : undefined}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#246bfd_0_56%,#fcd116_56%_70%,#ce1126_70%_100%)]" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full border border-violet-200/10 bg-violet-400/[0.05]" />
          <div className="pointer-events-none absolute -bottom-20 -left-14 h-44 w-44 rounded-full border border-cyan-200/10 bg-cyan-300/[0.04]" />
          <div className="relative z-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-100/18 bg-[linear-gradient(145deg,rgba(36,107,253,0.20),rgba(15,35,73,0.82)_52%,rgba(252,209,22,0.09))] text-cyan-50 shadow-[0_12px_32px_rgba(0,0,0,0.22)]"><Globe2 className="h-6 w-6" /></div>
            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.24em] text-yellow-200/68">{definition.subjectLabel}</p>
            <h1 className="mt-2 text-[27px] font-black tracking-[-0.04em] text-white sm:text-[32px]">Choose your learning language</h1>
          </div>
          <div className="relative z-10 mt-6 grid gap-2.5 sm:grid-cols-3">
            {definition.languageOptions.map((option) => (
              <button key={option.code} type="button" onClick={() => onSelect(option.code)} className="group flex min-h-[104px] items-center gap-3 rounded-[22px] border border-white/[0.09] bg-white/[0.045] px-4 py-4 text-left transition hover:border-cyan-100/22 hover:bg-cyan-100/[0.07] active:scale-[0.99] sm:flex-col sm:items-start sm:justify-between" aria-label={`Use ${option.label} for the ${definition.subjectLabel.toLowerCase()}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-100/15 bg-[#081d3c] text-[10px] font-black tracking-[0.14em] text-cyan-100/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{option.shortLabel}</span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-black tracking-[-0.02em] text-white/94">{option.nativeLabel}</span><span className="mt-1 block text-[10.5px] font-semibold leading-[1.45] text-white/42">{option.description}</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/24 transition group-hover:translate-x-0.5 group-hover:text-cyan-100/65 sm:self-end" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
