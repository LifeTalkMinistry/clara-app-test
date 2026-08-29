from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_authority() -> None:
    path = Path("src/lib/clara-means-authority.js")
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "  return Boolean(sourceRecurrence(source));",
        "  return Boolean(sourceRecurrence(source) || readExplicitCustomCycle(source));",
        "custom-cycle timing candidate",
    )

    master_block = '''function isExplicitMaster(source = {}) {
  return Boolean(
    source?.isMasterPayCycle === true ||
      source?.is_master_pay_cycle === true ||
      source?.masterPayCycle === true ||
      source?.master_pay_cycle === true ||
      source?.isMaster === true ||
      source?.is_master === true
  );
}

'''
    custom_block = master_block + '''function readExplicitCustomCycle(source = {}) {
  const config =
    source?.customMasterPayCycle ||
    source?.custom_master_pay_cycle ||
    source?.masterPayCycleConfig ||
    source?.master_pay_cycle_config ||
    source?.customCycle ||
    source?.custom_cycle ||
    {};
  const start = normalizeFinancialDateKey(
    source?.customCycleStart ||
      source?.custom_cycle_start ||
      source?.masterCycleStart ||
      source?.master_cycle_start ||
      config?.start ||
      config?.cycleStart ||
      config?.cycle_start
  );
  const end = normalizeFinancialDateKey(
    source?.customCycleEnd ||
      source?.custom_cycle_end ||
      source?.masterCycleEnd ||
      source?.master_cycle_end ||
      config?.end ||
      config?.cycleEnd ||
      config?.cycle_end
  );
  if (!start || !end || start >= end) return null;
  return { start, end };
}

'''
    text = replace_once(text, master_block, custom_block, "custom-cycle reader")

    loop_old = '''  ordered.forEach((source, index) => {
    const occurrences = getRecurrenceOccurrences(
      sourceRecurrence(source),
      searchStart,
      searchEnd,
      { kind: "income" }
    ).sort();
'''
    loop_new = '''  ordered.forEach((source, index) => {
    const customCycle = readExplicitCustomCycle(source);
    if (customCycle && customCycle.start <= today && today < customCycle.end) {
      cycles.push({
        start: customCycle.start,
        end: customCycle.end,
        sourceId: clean(source?.id),
        explicitMaster: isExplicitMaster(source),
        customCycle: true,
        sourceOrder: index,
      });
      return;
    }

    const recurrence = sourceRecurrence(source);
    if (!recurrence) return;
    const occurrences = getRecurrenceOccurrences(
      recurrence,
      searchStart,
      searchEnd,
      { kind: "income" }
    ).sort();
'''
    text = replace_once(text, loop_old, loop_new, "custom-cycle resolution")

    path.write_text(text, encoding="utf-8")


def patch_legacy_debt_mark_paid() -> None:
    path = Path("src/lib/debtObligationStore.js")
    text = path.read_text(encoding="utf-8")

    old = '''  const mode = getDebtObligationMode(current);
  const paymentAmount = Math.max(
    0,
    Number(options.amount || getMonthlyDebtPayment(current) || occurrence?.amount || 0)
  );
  const currentBalance = getDebtBalance(current);
  const nextBalance = mode === "balance" ? Math.max(currentBalance - paymentAmount, 0) : currentBalance;
  const completed = mode === "balance" && nextBalance <= 0;
  const now = new Date().toISOString();
  const paidOccurrences = appendPaidDebtOccurrence(current, dueDate);

  const record = {
    ...current,
    id: safeId,
    localUserId: safeLocalUserId,
    paidOccurrences,
    paid_occurrences: paidOccurrences,
    lastPaidOccurrenceDate: dueDate,
    last_paid_occurrence_date: dueDate,
    lastPaymentAmount: paymentAmount,
    last_payment_amount: paymentAmount,
    lastPaidAt: now,
    last_paid_at: now,
'''
    new = '''  const mode = getDebtObligationMode(current);
  const plannedOccurrenceAmount = Math.max(
    0,
    Number(getMonthlyDebtPayment(current) || occurrence?.amount || 0)
  );
  const paymentAmount = Math.max(
    0,
    Number(options.amount || plannedOccurrenceAmount || 0)
  );
  const currentBalance = getDebtBalance(current);
  const nextBalance = mode === "balance" ? Math.max(currentBalance - paymentAmount, 0) : currentBalance;
  const completed = mode === "balance" && nextBalance <= 0;
  const now = new Date().toISOString();
  const priorHistory = Array.isArray(current.paymentHistory)
    ? current.paymentHistory
    : Array.isArray(current.payment_history)
      ? current.payment_history
      : [];
  const paymentEntry = {
    id: `legacy_debt_payment_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    amount: paymentAmount,
    dueDate,
    due_date: dueDate,
    paidAt: now,
    paid_at: now,
    source: "legacy_mark_paid",
  };
  const paymentHistory = [...priorHistory, paymentEntry];
  const occurrencePaidAmount = paymentHistory.reduce((sum, entry) => {
    const entryDueDate = normalizeString(entry?.dueDate || entry?.due_date).slice(0, 10);
    const amount = Math.max(0, Number(entry?.amount || 0));
    return entryDueDate === dueDate ? sum + amount : sum;
  }, 0);
  const expectedOccurrenceAmount =
    mode === "balance"
      ? Math.min(plannedOccurrenceAmount || currentBalance, currentBalance)
      : plannedOccurrenceAmount;
  const occurrenceSatisfied =
    completed ||
    (expectedOccurrenceAmount > 0 && occurrencePaidAmount >= expectedOccurrenceAmount);
  const existingPaidOccurrences = Array.isArray(current.paidOccurrences)
    ? current.paidOccurrences
    : Array.isArray(current.paid_occurrences)
      ? current.paid_occurrences
      : [];
  const paidOccurrences = occurrenceSatisfied
    ? appendPaidDebtOccurrence(current, dueDate)
    : existingPaidOccurrences;

  const record = {
    ...current,
    id: safeId,
    localUserId: safeLocalUserId,
    paymentHistory,
    payment_history: paymentHistory,
    paidOccurrences,
    paid_occurrences: paidOccurrences,
    lastPaidOccurrenceDate: occurrenceSatisfied
      ? dueDate
      : current.lastPaidOccurrenceDate || current.last_paid_occurrence_date || null,
    last_paid_occurrence_date: occurrenceSatisfied
      ? dueDate
      : current.last_paid_occurrence_date || current.lastPaidOccurrenceDate || null,
    lastPaymentAmount: paymentAmount,
    last_payment_amount: paymentAmount,
    lastPaidAt: now,
    last_paid_at: now,
'''
    text = replace_once(text, old, new, "legacy debt partial-payment safety")
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    patch_authority()
    patch_legacy_debt_mark_paid()
