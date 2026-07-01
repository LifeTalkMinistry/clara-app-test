from pathlib import Path

path = Path("src/pages/monthly-budget-plan/MonthlyBudgetPlanGuided.jsx")
source = path.read_text(encoding="utf-8")

protected_marker = '''  const protectedAmount = firstAmount(
    plan.totalProtectedCommitments,
    plan.protected_commitments_total,
  );'''
protected_replacement = protected_marker + '''
  const reviewDisplayItems = Array.isArray(plan.budgetDisplayCategories)
    ? plan.budgetDisplayCategories
    : [];
  const protectedReviewItems = reviewDisplayItems.filter(
    (item) => item?.isProtectedCommitment || item?.is_protected_commitment,
  );
  const reviewItemCount = budgetOptions.length + protectedReviewItems.length;'''

if protected_marker not in source:
    raise SystemExit("Protected amount marker not found")
source = source.replace(protected_marker, protected_replacement, 1)

start = source.find('        {step === 5 ? (')
end = source.find('        {notice ? (', start)
if start < 0 or end < 0:
    raise SystemExit("Final review block markers not found")

new_block = '''        {step === 5 ? (
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-white/8 bg-gradient-to-br from-cyan-400/[0.09] via-transparent to-violet-400/[0.08] p-4">
              <QuestionHeader
                icon={CheckCircle2}
                eyebrow="Final review"
                title={isActiveBudget ? "Review your active budget" : "Review your budget"}
                body={
                  isActiveBudget
                    ? "Check every item before saving your changes."
                    : canFinish
                      ? "Everything is assigned. Check each item before activating."
                      : "Review the exact items below, then finish assigning the remaining amount."
                }
              />
            </div>

            <div className="p-4">
              <div className="grid grid-cols-3 divide-x divide-white/8 rounded-2xl border border-white/8 bg-black/12 px-2 py-3">
                <div className="px-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/32">Available</p>
                  <p className="mt-1 text-sm font-black">{fmt(declared)}</p>
                </div>
                <div className="px-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-emerald-100/40">Allocated</p>
                  <p className="mt-1 text-sm font-black text-emerald-100">{fmt(allocated)}</p>
                </div>
                <div className="px-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/40">Left</p>
                  <p className="mt-1 text-sm font-black text-cyan-100">{fmt(left)}</p>
                </div>
              </div>

              {left > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-3">
                  <p className="text-sm font-black text-amber-50">{fmt(left)} still needs a purpose.</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-amber-50/55">
                    Add another item or increase an existing allocation before activation.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 border-t border-white/8 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Budget items</p>
                    <p className="mt-1 text-xs font-semibold text-white/38">
                      {reviewItemCount} {reviewItemCount === 1 ? "item" : "items"} · {fmt(allocated)} total
                    </p>
                  </div>
                  <button type="button" onClick={() => setStep(4)} className="text-xs font-black text-cyan-100/65">
                    Edit items
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {protectedReviewItems.map((item) => (
                    <div key={item.id || item.key || item.title} className="flex items-center gap-3 rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] px-3 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-100/75">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{item.title}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/42">Protected</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-emerald-100">{fmt(item.allocated)}</p>
                      <button type="button" onClick={() => setStep(3)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/45" aria-label={`Edit ${item.title}`}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {budgetOptions.map((item) => (
                    <div key={item.id || item.key} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{item.title}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-white/82">{fmt(item.allocated)}</p>
                      <button
                        type="button"
                        onClick={() => navigate("/budget-plan", { replace: true, state: { editCategoryId: item.id || item.key } })}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/45"
                        aria-label={`Edit ${item.title}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-white/8 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Budget details</p>
                    <p className="mt-1 text-sm font-black">{cycle.label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/38">
                      {cycle.end ? `${String(cycle.start).slice(0, 10)} to ${cycle.end}` : String(cycle.start).slice(0, 10)}
                    </p>
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/50" aria-label="Edit budget details">
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-white/46">
                  <span className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5">
                    {budgetOptions.length} {budgetOptions.length === 1 ? "category" : "categories"}
                  </span>
                  <span className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5">
                    {protectedReviewItems.length} protected {protectedReviewItems.length === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {isActiveBudget ? (
                  <>
                    {left > 0 ? (
                      <button type="button" onClick={() => setStep(4)} className={secondaryButton}>
                        Assign the remaining {fmt(left)}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button type="button" onClick={saveActiveChanges} disabled={busy} className={primaryButton}>
                      {saving ? "Saving..." : "Save changes"}
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </>
                ) : !canFinish ? (
                  <button type="button" onClick={() => setStep(4)} className={primaryButton}>
                    Assign the remaining {fmt(left)}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={activate} disabled={busy || !canActivate} className={primaryButton}>
                    {saving ? "Activating..." : "Activate budget"}
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}

                <button type="button" onClick={() => navigate("/dashboard")} className={secondaryButton}>
                  Return to dashboard
                </button>
              </div>
            </div>
          </section>
        ) : null}

'''

source = source[:start] + new_block + source[end:]
path.write_text(source, encoding="utf-8")
