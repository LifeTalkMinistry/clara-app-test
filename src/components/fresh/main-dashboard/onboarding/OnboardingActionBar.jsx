export default function OnboardingActionBar({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled = false,
  nextClassName = "",
}) {
  return (
    <div className="sticky bottom-0 z-30 mt-6 border-t border-white/15 bg-[#071120]/96 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06] sm:w-auto sm:min-w-[120px]"
          >
            {backLabel}
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={`w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[180px] ${nextClassName}`}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
