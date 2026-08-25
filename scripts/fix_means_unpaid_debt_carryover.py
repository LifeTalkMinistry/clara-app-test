from pathlib import Path

path = Path("src/runtime/installClaraOrbGreeting.js")
text = path.read_text()

anchor = '''function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));
    if (!date || date <= today || date >= horizonEnd) return sum;
    if (direction !== "out") return sum;
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}
'''

replacement = anchor + '''
function debtLastPaidDate(record = {}) {
  return String(
    record?.lastPaidAt ||
      record?.last_paid_at ||
      record?.paidAt ||
      record?.paid_at ||
      ""
  ).slice(0, 10);
}

function overdueUnpaidDebtAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();
  const recordMap = new Map(
    (Array.isArray(records) ? records : []).map((record) => [
      String(record?.id || record?.debt_id || record?.debtId || "").trim(),
      record,
    ])
  );
  const latestDueByDebt = new Map();

  buildDebtObligationScheduleProjection(records).forEach((event) => {
    const debtId = String(event?.debtObligationId || event?.debt_obligation_id || "").trim();
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    if (!debtId || !date || direction !== "out") return;
    if (date > today || date >= horizonEnd) return;

    const current = latestDueByDebt.get(debtId);
    if (!current || date > current.date) latestDueByDebt.set(debtId, { ...event, date });
  });

  let total = 0;
  latestDueByDebt.forEach((event, debtId) => {
    const record = recordMap.get(debtId) || {};
    const lastPaid = debtLastPaidDate(record);
    if (lastPaid && lastPaid >= event.date) return;

    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));
    total += Number.isFinite(amount) ? Math.max(0, amount) : 0;
  });

  return total;
}
'''

if 'function overdueUnpaidDebtAmount' not in text:
    if anchor not in text:
        raise SystemExit('futureDebtObligationAmount anchor not found')
    text = text.replace(anchor, replacement, 1)

old = '  const debtUpcoming = futureDebtObligationAmount(debtObligations, cycleEndDate);\n'
new = '''  const debtUpcoming =
    futureDebtObligationAmount(debtObligations, cycleEndDate) +
    overdueUnpaidDebtAmount(debtObligations, cycleEndDate);
'''
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('debtUpcoming snapshot line not found')

for check in [
    'function overdueUnpaidDebtAmount',
    'if (lastPaid && lastPaid >= event.date) return;',
    'futureDebtObligationAmount(debtObligations, cycleEndDate) +',
    'overdueUnpaidDebtAmount(debtObligations, cycleEndDate)',
]:
    if check not in text:
        raise SystemExit(f'missing invariant: {check}')

path.write_text(text)
