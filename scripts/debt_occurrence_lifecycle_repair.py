from pathlib import Path
import re

# debtObligationStore: persist payment against a specific occurrence.
store = Path('src/lib/debtObligationStore.js')
text = store.read_text()
if 'appendPaidDebtOccurrence' not in text:
    text = text.replace(
        'import {\n  DEBT_OBLIGATION_RECORD_KIND,',
        'import { appendPaidDebtOccurrence, getDebtOccurrenceState } from "@/lib/debtOccurrenceState";\nimport {\n  DEBT_OBLIGATION_RECORD_KIND,',
        1,
    )

if 'export async function markDebtOccurrencePaid' not in text:
    marker = '\nexport async function deleteDebtObligation(localUserId, id) {'
    block = r'''
export async function markDebtOccurrencePaid(localUserId, id, options = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeId = normalizeString(id);
  if (!safeId) throw new Error("Debt obligation id is required.");

  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);
  const current = (records || []).find((record) => normalizeString(record?.id) === safeId);
  if (!current) throw new Error("Debt / Obligation could not be found.");

  const occurrence = getDebtOccurrenceState(current, options.referenceDate || new Date());
  const dueDate = normalizeString(options.dueDate || occurrence?.dueDate).slice(0, 10);
  if (!dueDate) throw new Error("There is no due occurrence to mark as paid.");

  const mode = getDebtObligationMode(current);
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
    paidAt: completed ? now : current.paidAt || current.paid_at || null,
    paid_at: completed ? now : current.paid_at || current.paidAt || null,
    totalDebt: nextBalance,
    balance: nextBalance,
    amount: nextBalance,
    status: completed ? "completed" : "active",
    updatedAt: now,
    updated_at: now,
  };

  const result = await upsertLocalRecord(DEBT_OBLIGATION_STORE, record, safeLocalUserId);
  emitDebtObligationsUpdated(safeLocalUserId, "occurrence_paid");
  return result;
}
'''
    if marker not in text:
        raise SystemExit('deleteDebtObligation marker not found')
    text = text.replace(marker, '\n' + block + marker, 1)
store.write_text(text)

# Means: use occurrence payment state instead of guessing only from timestamps.
means = Path('src/runtime/installClaraOrbGreeting.js')
text = means.read_text()
if 'isDebtOccurrencePaid' not in text:
    anchor = 'import { buildCanonicalWalletState } from "@/lib/clara-wallet-money-semantics";'
    text = text.replace(anchor, anchor + '\nimport { isDebtOccurrencePaid } from "@/lib/debtOccurrenceState";', 1)

old = '''    const record = recordMap.get(debtId) || {};
    const lastPaid = debtLastPaidDate(record);
    if (lastPaid && lastPaid >= event.date) return;

    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));'''
new = '''    const record = recordMap.get(debtId) || {};
    if (isDebtOccurrencePaid(record, event.date)) return;

    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\\s]/g, ""));'''
if old not in text:
    raise SystemExit('Means overdue payment check not found')
text = text.replace(old, new, 1)
means.write_text(text)

# Manual expense sync: when an expense actually pays a debt, attach it to the current occurrence.
manual = Path('src/lib/manualExpenseLinkedTargetSync.js')
text = manual.read_text()
if 'appendPaidDebtOccurrence' not in text:
    text = text.replace(
        'import {\n  DEBT_OBLIGATION_RECORD_KIND,',
        'import { appendPaidDebtOccurrence, getDebtOccurrenceState } from "./debtOccurrenceState.js";\nimport {\n  DEBT_OBLIGATION_RECORD_KIND,',
        1,
    )

needle = '''  const now = new Date().toISOString();
  const completed = mode === "balance" && next <= 0;
  const record = {
    ...debt,'''
replace = '''  const now = new Date().toISOString();
  const completed = mode === "balance" && next <= 0;
  const occurrence = delta > 0 ? getDebtOccurrenceState(debt, new Date()) : null;
  const paidOccurrenceDate = occurrence?.dueDate || "";
  const paidOccurrences = paidOccurrenceDate ? appendPaidDebtOccurrence(debt, paidOccurrenceDate) : (debt.paidOccurrences || debt.paid_occurrences || []);
  const record = {
    ...debt,'''
if needle not in text:
    raise SystemExit('manual debt record marker not found')
text = text.replace(needle, replace, 1)
needle2 = '''    lastPaidAt: delta > 0 ? now : debt.lastPaidAt || null,
    last_paid_at: delta > 0 ? now : debt.last_paid_at || null,
    updatedAt: now,'''
replace2 = '''    lastPaidAt: delta > 0 ? now : debt.lastPaidAt || null,
    last_paid_at: delta > 0 ? now : debt.last_paid_at || null,
    paidOccurrences,
    paid_occurrences: paidOccurrences,
    lastPaidOccurrenceDate: paidOccurrenceDate || debt.lastPaidOccurrenceDate || debt.last_paid_occurrence_date || null,
    last_paid_occurrence_date: paidOccurrenceDate || debt.last_paid_occurrence_date || debt.lastPaidOccurrenceDate || null,
    updatedAt: now,'''
if needle2 not in text:
    raise SystemExit('manual lastPaid marker not found')
text = text.replace(needle2, replace2, 1)
manual.write_text(text)

# Debt item UI: show actual unresolved occurrence instead of blindly advancing the calendar.
item = Path('src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx')
text = item.read_text()
if 'getDebtOccurrenceState' not in text:
    text = text.replace(
        'import { getDebtTitle } from "@/lib/debtObligationStore";',
        'import { getDebtTitle } from "@/lib/debtObligationStore";\nimport { getDebtOccurrenceState } from "@/lib/debtOccurrenceState";',
        1,
    )

start = text.find('function getSafeDueMeta(record) {')
end = text.find('\nfunction getDebtAmountMeta', start)
if start < 0 or end < 0:
    raise SystemExit('getSafeDueMeta block not found')
replacement = r'''function getSafeDueMeta(record) {
  const dueDay = getDebtDueDay(record);
  if (!dueDay) return { label: "", state: "none", dueDate: "" };

  const occurrence = getDebtOccurrenceState(record, new Date());
  if (!occurrence?.dueDate) return { label: `Every ${ordinal(dueDay)}`, state: "invalid", dueDate: "" };
  const due = new Date(`${occurrence.dueDate}T00:00:00`);
  const dueLabel = due.toLocaleDateString("en-PH", { month: "short", day: "numeric" });

  if (occurrence.state === "overdue") {
    return { label: `Every ${ordinal(dueDay)} · Overdue ${dueLabel}`, state: "overdue", dueDate: occurrence.dueDate };
  }
  if (occurrence.state === "due_today") {
    return { label: `Every ${ordinal(dueDay)} · Due today`, state: "due_today", dueDate: occurrence.dueDate };
  }
  return { label: `Every ${ordinal(dueDay)} · Next ${dueLabel}`, state: "scheduled", dueDate: occurrence.dueDate };
}
'''
text = text[:start] + replacement + text[end:]
text = text.replace(
    'valueClassName={dueMeta.state === "due_soon" ? "text-amber-200" : "text-white/78"}',
    'valueClassName={["overdue", "due_today"].includes(dueMeta.state) ? "text-rose-200" : "text-white/78"}',
    1,
)
# Extend component props and add mark-paid button below info rows.
text = text.replace(
    'export default function DebtObligationItem({ record, totalPositiveDebt, onEdit }) {',
    'export default function DebtObligationItem({ record, totalPositiveDebt, onEdit, onMarkPaid, markingPaid = false }) {',
    1,
)
insert_marker = '      </div>\n    </PremiumFinanceItemSurface>'
button = '''      {dueMeta.dueDate && ["overdue", "due_today"].includes(dueMeta.state) ? (
        <button
          type="button"
          disabled={markingPaid}
          onClick={() => onMarkPaid?.(record, dueMeta.dueDate)}
          className="mt-3 flex min-h-[42px] w-full items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"
        >
          {markingPaid ? "Saving payment..." : `Mark ${dueMeta.dueDate} paid`}
        </button>
      ) : null}
'''
idx = text.rfind(insert_marker)
if idx < 0:
    raise SystemExit('Debt item insert marker not found')
text = text[:idx] + button + text[idx:]
item.write_text(text)

# Parent UI wires Mark Paid to repository and refreshes card.
parent = Path('src/components/ObligationDebt.jsx')
text = parent.read_text()
text = text.replace(
    '  getDebtTitle,\n  toDebtNumber,\n  upsertDebtObligation,',
    '  getDebtTitle,\n  markDebtOccurrencePaid,\n  toDebtNumber,\n  upsertDebtObligation,',
    1,
)
if 'const [markingPaidId' not in text:
    text = text.replace(
        '  const [confirmDelete, setConfirmDelete] = useState(false);',
        '  const [confirmDelete, setConfirmDelete] = useState(false);\n  const [markingPaidId, setMarkingPaidId] = useState("");',
        1,
    )

marker = '  const removeObligation = async () => {'
handler = r'''  const markOccurrencePaid = async (record, dueDate) => {
    const id = String(record?.id || "").trim();
    if (!id || !dueDate) return;
    setMarkingPaidId(id);
    setNotice("");
    try {
      await markDebtOccurrencePaid(localUserId, id, {
        dueDate,
        amount: getObligationMonthly(record),
      });
      const records = await reloadDebtObligations();
      notifyChanged(records || []);
    } catch (error) {
      setNotice(error?.message || "Unable to record this payment.");
    } finally {
      setMarkingPaidId("");
    }
  };

'''
if 'const markOccurrencePaid = async' not in text:
    if marker not in text:
        raise SystemExit('removeObligation marker not found')
    text = text.replace(marker, handler + marker, 1)

# Patch each DebtObligationItem invocation.
text = text.replace(
    'onEdit={(record) => { setForm(formFromRecord(record)); setFormOpen(true); setNotice(""); }}',
    'onEdit={(record) => { setForm(formFromRecord(record)); setFormOpen(true); setNotice(""); }} onMarkPaid={markOccurrencePaid} markingPaid={markingPaidId === record.id}',
)
parent.write_text(text)

# Verify expected contracts are present.
checks = {
    store: ['markDebtOccurrencePaid', 'paidOccurrences', 'lastPaidOccurrenceDate'],
    means: ['isDebtOccurrencePaid(record, event.date)'],
    manual: ['paidOccurrenceDate', 'appendPaidDebtOccurrence'],
    item: ['Overdue ${dueLabel}', 'onMarkPaid', 'Mark ${dueMeta.dueDate} paid'],
    parent: ['markOccurrencePaid', 'markDebtOccurrencePaid'],
}
for path, needles in checks.items():
    body = path.read_text()
    for needle in needles:
        if needle not in body:
            raise SystemExit(f'missing {needle} in {path}')
