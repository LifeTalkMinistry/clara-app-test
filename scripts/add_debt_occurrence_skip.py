from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"{label} anchor not found")
    return text.replace(old, new, 1)

# 1) Debt occurrence state: skip is its own occurrence state, never a payment.
path = Path("src/lib/debtOccurrenceState.js")
text = path.read_text()
anchor = '''export function isDebtOccurrencePaid(record = {}, dueDate = "", expectedAmount = 0) {'''
helpers = '''export function getSkippedDebtOccurrenceDates(record = {}) {
  const raw = record?.skippedOccurrences || record?.skipped_occurrences || [];
  const values = Array.isArray(raw) ? raw : [];
  return [...new Set(values.map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry)).filter(Boolean))];
}

export function isDebtOccurrenceSkipped(record = {}, dueDate = "") {
  const target = dateKey(dueDate);
  return Boolean(target && getSkippedDebtOccurrenceDates(record).includes(target));
}

'''
text = replace_once(text, anchor, helpers + anchor, "skip occurrence helpers")
text = replace_once(
    text,
    '''  if (\n    currentDue &&\n    !isDebtOccurrencePaid(record, currentDue?.date, currentDue?.amount)\n  ) {''',
    '''  if (\n    currentDue &&\n    !isDebtOccurrencePaid(record, currentDue?.date, currentDue?.amount) &&\n    !isDebtOccurrenceSkipped(record, currentDue?.date)\n  ) {''',
    "current occurrence skip guard",
)
text = replace_once(
    text,
    '''        dateKey(event?.date) > today &&\n        !isDebtOccurrencePaid(record, event?.date, event?.amount)''',
    '''        dateKey(event?.date) > today &&\n        !isDebtOccurrencePaid(record, event?.date, event?.amount) &&\n        !isDebtOccurrenceSkipped(record, event?.date)''',
    "future occurrence skip guard",
)
path.write_text(text)

# 2) Store: skipping changes only this occurrence. No wallet movement, no fake payment.
path = Path("src/lib/debtObligationStore.js")
text = path.read_text()
anchor = '''export async function deleteDebtObligation(localUserId, id) {'''
block = '''export async function skipDebtOccurrence(localUserId, id, options = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeId = normalizeString(id);
  if (!safeId) throw new Error("Debt obligation id is required.");

  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);
  const current = (records || []).find((record) => normalizeString(record?.id) === safeId);
  if (!current) throw new Error("Debt / Obligation could not be found.");

  const occurrence = getDebtOccurrenceState(current, options.referenceDate || new Date());
  const dueDate = normalizeString(options.dueDate || occurrence?.dueDate).slice(0, 10);
  if (!dueDate) throw new Error("There is no current obligation occurrence to skip.");

  const existing = Array.isArray(current.skippedOccurrences)
    ? current.skippedOccurrences
    : Array.isArray(current.skipped_occurrences)
      ? current.skipped_occurrences
      : [];
  const skippedOccurrences = [...new Set([
    ...existing.map((entry) => normalizeString(entry?.dueDate || entry?.due_date || entry).slice(0, 10)).filter(Boolean),
    dueDate,
  ])].sort();
  const now = new Date().toISOString();
  const record = {
    ...current,
    id: safeId,
    localUserId: safeLocalUserId,
    skippedOccurrences,
    skipped_occurrences: skippedOccurrences,
    lastSkippedOccurrenceDate: dueDate,
    last_skipped_occurrence_date: dueDate,
    updatedAt: now,
    updated_at: now,
  };

  const result = await upsertLocalRecord(DEBT_OBLIGATION_STORE, record, safeLocalUserId);
  emitDebtObligationsUpdated(safeLocalUserId, "occurrence_skipped");
  return result;
}

'''
text = replace_once(text, anchor, block + anchor, "skip store function")
path.write_text(text)

# 3) Means baseline: allow a requirement to be fulfilled for Means without pretending cash was paid.
path = Path("src/lib/clara-means-cycle-baseline.js")
text = path.read_text()
old = '''  const plannedAmount = money(value.plannedAmount ?? value.planned_amount ?? value.amount);\n  const fulfilledAmount = money(\n    value.fulfilledAmount ??\n      value.fulfilled_amount ??\n      value.actualPaid ??\n      value.actual_paid\n  );'''
new = '''  const plannedAmount = money(value.plannedAmount ?? value.planned_amount ?? value.amount);\n  const actualPaid = money(value.actualPaid ?? value.actual_paid);\n  const fulfilledAmount = money(\n    value.fulfilledAmount ??\n      value.fulfilled_amount ??\n      value.meansFulfilledAmount ??\n      value.means_fulfilled_amount ??\n      actualPaid\n  );'''
text = replace_once(text, old, new, "Means non-cash fulfillment input")
text = replace_once(
    text,
    '''    fulfilledBeforeCycle,\n    actualPaid: fulfilledAmount,\n    amount: plannedAmount,''',
    '''    fulfilledBeforeCycle,\n    actualPaid,\n    amount: plannedAmount,''',
    "preserve actual cash amount",
)
path.write_text(text)

# 4) Means debt authority: skipped occurrence releases Remaining Plan, leaves Cycle 100 Anchor and wallet untouched.
path = Path("src/lib/clara-means-authority.js")
text = path.read_text()
import_anchor = '''import { getLocalRecords } from "@/lib/localFinanceStore";'''
import_new = '''import { getLocalRecords } from "@/lib/localFinanceStore";\nimport { isDebtOccurrenceSkipped } from "@/lib/debtOccurrenceState";'''
text = replace_once(text, import_anchor, import_new, "Means skip import")
old = '''          amount: planned,\n          actualPaid: cumulativeActualForOccurrence(record, dueDate),\n          fulfilledBeforeCycle: amountPaidBeforeCycle(record, dueDate, cycleStart),'''
new = '''          amount: planned,\n          actualPaid: cumulativeActualForOccurrence(record, dueDate),\n          meansFulfilledAmount: isDebtOccurrenceSkipped(record, dueDate)\n            ? planned\n            : cumulativeActualForOccurrence(record, dueDate),\n          skippedForCycle: isDebtOccurrenceSkipped(record, dueDate),\n          fulfilledBeforeCycle: amountPaidBeforeCycle(record, dueDate, cycleStart),'''
text = replace_once(text, old, new, "Means skipped debt fulfillment")
old = '''      const planned = nonNegative(entry?.amount);\n      const actualPaid = nonNegative(entry?.actualPaid ?? entry?.actual_paid);\n      return sum + Math.max(planned - actualPaid, 0);'''
new = '''      const planned = nonNegative(entry?.amount);\n      const fulfilled = nonNegative(\n        entry?.meansFulfilledAmount ??\n          entry?.means_fulfilled_amount ??\n          entry?.fulfilledAmount ??\n          entry?.fulfilled_amount ??\n          entry?.actualPaid ??\n          entry?.actual_paid\n      );\n      return sum + Math.max(planned - fulfilled, 0);'''
text = replace_once(text, old, new, "upcoming skipped debt fulfillment")
path.write_text(text)

# 5) Card UI: exact compact action pair, with short confirmation for Skip.
path = Path("src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx")
text = path.read_text()
text = replace_once(
    text,
    '''import { getDebtTitle } from "@/lib/debtObligationStore";''',
    '''import { getDebtTitle, skipDebtOccurrence } from "@/lib/debtObligationStore";''',
    "skip UI import",
)
text = replace_once(
    text,
    '''  const [paying, setPaying] = useState(false);''',
    '''  const [paying, setPaying] = useState(false);\n  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);\n  const [skipping, setSkipping] = useState(false);''',
    "skip UI state",
)
submit_anchor = '''  const submitPayment = async () => {'''
skip_handler = '''  const confirmSkipOccurrence = async () => {
    if (!localUserId) return setPaymentNotice("Unable to resolve the owner of this obligation.");
    if (!dueMeta.dueDate) return setPaymentNotice("There is no current payment occurrence to skip.");

    setSkipping(true);
    setPaymentNotice("");
    try {
      const updated = await skipDebtOccurrence(localUserId, effectiveRecord.id, {
        dueDate: dueMeta.dueDate,
        referenceDate: new Date(),
      });
      if (updated) setLocalRecord(updated);
      setSkipConfirmOpen(false);
      setPaymentOpen(false);
    } catch (error) {
      setPaymentNotice(error?.message || "Unable to skip this payment.");
    } finally {
      setSkipping(false);
    }
  };

'''
text = replace_once(text, submit_anchor, skip_handler + submit_anchor, "skip UI handler")
old_button = '''        {canPay ? (\n          <button\n            type="button"\n            disabled={loadingWallets || paying}\n            onClick={openPayment}\n            className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"\n          >\n            {loadingWallets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}\n            {loadingWallets ? "Loading wallets..." : "Pay Obligation"}\n          </button>\n        ) : null}'''
new_button = '''        {canPay ? (\n          <div className="mt-3 grid grid-cols-2 gap-2">\n            <button\n              type="button"\n              disabled={loadingWallets || paying || skipping}\n              onClick={openPayment}\n              className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"\n            >\n              {loadingWallets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}\n              {loadingWallets ? "Loading..." : "Pay"}\n            </button>\n            <button\n              type="button"\n              disabled={paying || skipping || !dueMeta.dueDate}\n              onClick={() => { setPaymentOpen(false); setSkipConfirmOpen(true); setPaymentNotice(""); }}\n              className="flex min-h-[42px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 text-[11px] font-black text-white/72 disabled:opacity-45"\n            >\n              Skip\n            </button>\n          </div>\n        ) : null}\n\n        {skipConfirmOpen ? (\n          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/[0.16] p-3">\n            <p className="text-xs font-black text-white/90">Skip this payment for this cycle?</p>\n            <p className="mt-1 text-[10px] font-semibold leading-4 text-white/45">\n              No money will leave your wallet. This obligation stays active for future cycles.\n            </p>\n            <div className="mt-3 grid grid-cols-2 gap-2">\n              <button\n                type="button"\n                disabled={skipping}\n                onClick={() => setSkipConfirmOpen(false)}\n                className="min-h-[38px] rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[10px] font-black text-white/68 disabled:opacity-45"\n              >\n                Cancel\n              </button>\n              <button\n                type="button"\n                disabled={skipping}\n                onClick={confirmSkipOccurrence}\n                className="flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-cyan-300/18 bg-cyan-400/[0.07] px-3 text-[10px] font-black text-cyan-100 disabled:opacity-45"\n              >\n                {skipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}\n                {skipping ? "Skipping..." : "Skip this cycle"}\n              </button>\n            </div>\n          </div>\n        ) : null}'''
text = replace_once(text, old_button, new_button, "Pay / Skip buttons")
path.write_text(text)

# 6) Focused regression coverage.
Path("tests/debt-occurrence-skip-regression.test.mjs").write_text('''import assert from "node:assert/strict";\nimport test from "node:test";\nimport { readFile } from "node:fs/promises";\n\nimport {\n  resolveAdaptiveMeansBaselineState,\n} from "../src/lib/clara-means-cycle-baseline.js";\nimport {\n  getSkippedDebtOccurrenceDates,\n  isDebtOccurrenceSkipped,\n} from "../src/lib/debtOccurrenceState.js";\n\ntest("skipped debt occurrence remains distinct from payment history", () => {\n  const record = { skippedOccurrences: ["2026-09-10"], paymentHistory: [] };\n  assert.deepEqual(getSkippedDebtOccurrenceDates(record), ["2026-09-10"]);\n  assert.equal(isDebtOccurrenceSkipped(record, "2026-09-10"), true);\n});\n\ntest("skip releases Remaining Plan without resizing Cycle 100 Anchor", () => {\n  const before = resolveAdaptiveMeansBaselineState({\n    cycleStart: "2026-09-01",\n    cycleEnd: "2026-09-25",\n    today: "2026-09-12",\n    occurrences: [{\n      id: "debt:chatgpt:2026-09-10",\n      requirementKey: "debt:chatgpt:2026-09-10",\n      date: "2026-09-10",\n      kind: "debt",\n      amount: 1100,\n      actualPaid: 0,\n    }],\n  });\n  const after = resolveAdaptiveMeansBaselineState({\n    stored: before.baseline,\n    cycleStart: "2026-09-01",\n    cycleEnd: "2026-09-25",\n    today: "2026-09-12",\n    occurrences: [{\n      id: "debt:chatgpt:2026-09-10",\n      requirementKey: "debt:chatgpt:2026-09-10",\n      date: "2026-09-10",\n      kind: "debt",\n      amount: 1100,\n      actualPaid: 0,\n      meansFulfilledAmount: 1100,\n      skippedForCycle: true,\n    }],\n  });\n  assert.equal(before.cycle100Anchor, 1100);\n  assert.equal(after.cycle100Anchor, 1100);\n  assert.equal(after.remainingPlannedSpending, 0);\n  assert.equal(after.requirements[0].actualPaid, 0);\n});\n\ntest("card exposes compact Pay and Skip actions", async () => {\n  const source = await readFile(new URL("../src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx", import.meta.url), "utf8");\n  assert.match(source, />Pay</);\n  assert.match(source, />\\s*Skip\\s*</);\n  assert.match(source, /skipDebtOccurrence/);\n});\n''')

print("Debt occurrence Pay / Skip patch applied.")
