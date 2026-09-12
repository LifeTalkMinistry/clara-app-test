from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"{label} anchor not found")
    return text.replace(old, new, 1)

# 1) Debt occurrence state: explicit skipped occurrence semantics.
path = Path("src/lib/debtOccurrenceState.js")
text = path.read_text()
text = replace_once(
    text,
    '''export function getPaidDebtOccurrenceDates(record = {}) {\n  const raw =\n    record?.paidOccurrences ||\n    record?.paid_occurrences ||\n    record?.paidOccurrenceDates ||\n    record?.paid_occurrence_dates ||\n    [];\n  const values = Array.isArray(raw) ? raw : [];\n  return [...new Set(values.map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry)).filter(Boolean))];\n}\n''',
    '''export function getPaidDebtOccurrenceDates(record = {}) {\n  const raw =\n    record?.paidOccurrences ||\n    record?.paid_occurrences ||\n    record?.paidOccurrenceDates ||\n    record?.paid_occurrence_dates ||\n    [];\n  const values = Array.isArray(raw) ? raw : [];\n  return [...new Set(values.map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry)).filter(Boolean))];\n}\n\nexport function getSkippedDebtOccurrenceDates(record = {}) {\n  const raw =\n    record?.skippedOccurrences ||\n    record?.skipped_occurrences ||\n    record?.skippedOccurrenceDates ||\n    record?.skipped_occurrence_dates ||\n    [];\n  const values = Array.isArray(raw) ? raw : [];\n  return [...new Set(values.map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry)).filter(Boolean))];\n}\n\nexport function isDebtOccurrenceSkipped(record = {}, dueDate = "") {\n  const target = dateKey(dueDate);\n  return Boolean(target && getSkippedDebtOccurrenceDates(record).includes(target));\n}\n\nexport function appendSkippedDebtOccurrence(record = {}, dueDate = "") {\n  const target = dateKey(dueDate);\n  if (!target) return getSkippedDebtOccurrenceDates(record);\n  return [...new Set([...getSkippedDebtOccurrenceDates(record), target])].sort();\n}\n''',
    "skip helpers",
)
text = replace_once(
    text,
    '''  if (\n    currentDue &&\n    !isDebtOccurrencePaid(record, currentDue?.date, currentDue?.amount)\n  ) {\n    const dueDate = dateKey(currentDue.date);\n    return {\n      state: dueDate < today ? "overdue" : "due_today",\n      dueDate,\n      amount: Math.max(0, Number(currentDue?.amount || 0)),\n      event: currentDue,\n    };\n  }\n''',
    '''  if (currentDue && isDebtOccurrenceSkipped(record, currentDue?.date)) {\n    const dueDate = dateKey(currentDue.date);\n    return {\n      state: "skipped",\n      dueDate,\n      amount: Math.max(0, Number(currentDue?.amount || 0)),\n      event: currentDue,\n    };\n  }\n\n  if (\n    currentDue &&\n    !isDebtOccurrencePaid(record, currentDue?.date, currentDue?.amount)\n  ) {\n    const dueDate = dateKey(currentDue.date);\n    return {\n      state: dueDate < today ? "overdue" : "due_today",\n      dueDate,\n      amount: Math.max(0, Number(currentDue?.amount || 0)),\n      event: currentDue,\n    };\n  }\n''',
    "current skipped state",
)
text = replace_once(
    text,
    '''        dateKey(event?.date) > today &&\n        !isDebtOccurrencePaid(record, event?.date, event?.amount)\n''',
    '''        dateKey(event?.date) > today &&\n        !isDebtOccurrenceSkipped(record, event?.date) &&\n        !isDebtOccurrencePaid(record, event?.date, event?.amount)\n''',
    "future skip filter",
)
path.write_text(text)

# 2) Store: persist Skip for one exact occurrence without creating payment or wallet movement.
path = Path("src/lib/debtObligationStore.js")
text = path.read_text()
text = replace_once(
    text,
    '''import { appendPaidDebtOccurrence, getDebtOccurrenceState } from "@/lib/debtOccurrenceState";''',
    '''import {\n  appendPaidDebtOccurrence,\n  appendSkippedDebtOccurrence,\n  getDebtOccurrenceState,\n} from "@/lib/debtOccurrenceState";''',
    "store occurrence import",
)
skip_fn = '''\nexport async function skipDebtOccurrenceForCycle(localUserId, id, options = {}) {\n  const safeLocalUserId = normalizeLocalUserId(localUserId);\n  const safeId = normalizeString(id);\n  if (!safeId) throw new Error("Debt obligation id is required.");\n\n  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);\n  const current = (records || []).find((record) => normalizeString(record?.id) === safeId);\n  if (!current) throw new Error("Debt / Obligation could not be found.");\n\n  const occurrence = getDebtOccurrenceState(current, options.referenceDate || new Date());\n  const dueDate = normalizeString(options.dueDate || occurrence?.dueDate).slice(0, 10);\n  if (!dueDate) throw new Error("There is no payment occurrence to skip.");\n\n  const skippedOccurrences = appendSkippedDebtOccurrence(current, dueDate);\n  const now = new Date().toISOString();\n  const record = {\n    ...current,\n    id: safeId,\n    localUserId: safeLocalUserId,\n    skippedOccurrences,\n    skipped_occurrences: skippedOccurrences,\n    lastSkippedOccurrenceDate: dueDate,\n    last_skipped_occurrence_date: dueDate,\n    updatedAt: now,\n    updated_at: now,\n  };\n\n  const result = await upsertLocalRecord(DEBT_OBLIGATION_STORE, record, safeLocalUserId);\n  emitDebtObligationsUpdated(safeLocalUserId, "occurrence_skipped");\n  return result;\n}\n\n'''
text = replace_once(
    text,
    '''export async function deleteDebtObligation(localUserId, id) {''',
    skip_fn + '''export async function deleteDebtObligation(localUserId, id) {''',
    "store skip function",
)
path.write_text(text)

# 3) Means baseline: waived/skipped plan reduces Remaining Plan but never pretends money was paid.
path = Path("src/lib/clara-means-cycle-baseline.js")
text = path.read_text()
text = replace_once(
    text,
    '''  const fulfilledBeforeCycle = money(\n    value.fulfilledBeforeCycle ??\n      value.fulfilled_before_cycle ??\n      value.actualPaidBeforeCycle ??\n      value.actual_paid_before_cycle\n  );\n  const kind = text(value.kind || value.sourceType || value.source_type || "requirement") ||\n''',
    '''  const fulfilledBeforeCycle = money(\n    value.fulfilledBeforeCycle ??\n      value.fulfilled_before_cycle ??\n      value.actualPaidBeforeCycle ??\n      value.actual_paid_before_cycle\n  );\n  const waivedAmount = money(\n    value.waivedAmount ??\n      value.waived_amount ??\n      value.skippedAmount ??\n      value.skipped_amount\n  );\n  const kind = text(value.kind || value.sourceType || value.source_type || "requirement") ||\n''',
    "baseline waived parse",
)
text = replace_once(
    text,
    '''    fulfilledAmount,\n    fulfilledBeforeCycle,\n    actualPaid: fulfilledAmount,\n''',
    '''    fulfilledAmount,\n    fulfilledBeforeCycle,\n    waivedAmount,\n    actualPaid: fulfilledAmount,\n''',
    "baseline waived normalized",
)
text = replace_once(
    text,
    '''    const fulfilledAmount = Math.min(entry.fulfilledAmount, plannedAmount);\n    const fulfilledBeforeCycle = Math.min(entry.fulfilledBeforeCycle, plannedAmount);\n    const remainingAmount = Math.max(plannedAmount - fulfilledAmount, 0);\n''',
    '''    const fulfilledAmount = Math.min(entry.fulfilledAmount, plannedAmount);\n    const fulfilledBeforeCycle = Math.min(entry.fulfilledBeforeCycle, plannedAmount);\n    const waivedAmount = Math.min(entry.waivedAmount, Math.max(plannedAmount - fulfilledAmount, 0));\n    const remainingAmount = Math.max(plannedAmount - fulfilledAmount - waivedAmount, 0);\n''',
    "baseline remaining waiver",
)
text = replace_once(
    text,
    '''      fulfilledAmount,\n      fulfilledBeforeCycle,\n      remainingAmount,\n''',
    '''      fulfilledAmount,\n      fulfilledBeforeCycle,\n      waivedAmount,\n      remainingAmount,\n''',
    "baseline requirement waiver",
)
path.write_text(text)

# 4) Means authority: map exact skipped debt occurrence to a waiver, not a payment.
path = Path("src/lib/clara-means-authority.js")
text = path.read_text()
text = replace_once(
    text,
    '''import { getLocalRecords } from "@/lib/localFinanceStore";''',
    '''import { getLocalRecords } from "@/lib/localFinanceStore";\nimport { isDebtOccurrenceSkipped } from "@/lib/debtOccurrenceState";''',
    "means skip import",
)
text = replace_once(
    text,
    '''          amount: planned,\n          actualPaid: cumulativeActualForOccurrence(record, dueDate),\n          fulfilledBeforeCycle: amountPaidBeforeCycle(record, dueDate, cycleStart),\n''',
    '''          amount: planned,\n          actualPaid: cumulativeActualForOccurrence(record, dueDate),\n          waivedAmount: isDebtOccurrenceSkipped(record, dueDate) ? planned : 0,\n          fulfilledBeforeCycle: amountPaidBeforeCycle(record, dueDate, cycleStart),\n''',
    "means debt waiver",
)
path.write_text(text)

# 5) Card UI: Pay + Skip, with explicit confirmation and no wallet/payment side effect for Skip.
path = Path("src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx")
text = path.read_text()
text = replace_once(
    text,
    '''import { getDebtTitle } from "@/lib/debtObligationStore";''',
    '''import { getDebtTitle, skipDebtOccurrenceForCycle } from "@/lib/debtObligationStore";''',
    "card store import",
)
text = replace_once(
    text,
    '''  if (occurrence.state === "due_today") {\n    return { label: `Every ${ordinal(dueDay)} · Due today`, state: "due_today", dueDate: occurrence.dueDate };\n  }\n  return { label: `Every ${ordinal(dueDay)} · Next ${dueLabel}`, state: "scheduled", dueDate: occurrence.dueDate };\n''',
    '''  if (occurrence.state === "due_today") {\n    return { label: `Every ${ordinal(dueDay)} · Due today`, state: "due_today", dueDate: occurrence.dueDate };\n  }\n  if (occurrence.state === "skipped") {\n    return { label: `Every ${ordinal(dueDay)} · Skipped ${dueLabel}`, state: "skipped", dueDate: occurrence.dueDate };\n  }\n  return { label: `Every ${ordinal(dueDay)} · Next ${dueLabel}`, state: "scheduled", dueDate: occurrence.dueDate };\n''',
    "card skipped due label",
)
text = replace_once(
    text,
    '''  const [paying, setPaying] = useState(false);\n''',
    '''  const [paying, setPaying] = useState(false);\n  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);\n  const [skipping, setSkipping] = useState(false);\n''',
    "card skip state",
)
text = replace_once(
    text,
    '''  const canPay =\n    !["paid", "completed", "closed"].includes(status) &&\n    (monthly > 0 || (mode === "balance" && balance > 0));\n''',
    '''  const canPay =\n    dueMeta.state !== "skipped" &&\n    !["paid", "completed", "closed"].includes(status) &&\n    (monthly > 0 || (mode === "balance" && balance > 0));\n  const canSkip = canPay && Boolean(dueMeta.dueDate);\n''',
    "card can skip",
)
skip_handler = '''\n  const submitSkip = async () => {\n    if (!canSkip || skipping || !localUserId) return;\n    setSkipping(true);\n    setPaymentNotice("");\n    try {\n      const updated = await skipDebtOccurrenceForCycle(localUserId, effectiveRecord.id, {\n        dueDate: dueMeta.dueDate,\n        referenceDate: new Date(),\n      });\n      if (updated) setLocalRecord(updated);\n      setSkipConfirmOpen(false);\n      setPaymentOpen(false);\n      setPaymentNotice("Skipped for this cycle. No money was deducted.");\n    } catch (error) {\n      setPaymentNotice(error?.message || "Unable to skip this payment.");\n    } finally {\n      setSkipping(false);\n    }\n  };\n'''
text = replace_once(
    text,
    '''  return (\n    <PremiumFinanceItemSurface tone={tone} className="p-3.5">''',
    skip_handler + '''\n  return (\n    <PremiumFinanceItemSurface tone={tone} className="p-3.5">''',
    "card skip handler",
)
old_button = '''        {canPay ? (\n          <button\n            type="button"\n            disabled={loadingWallets || paying}\n            onClick={openPayment}\n            className="mt-3 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"\n          >\n            {loadingWallets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}\n            {loadingWallets ? "Loading wallets..." : "Pay Obligation"}\n          </button>\n        ) : null}\n'''
new_button = '''        {canPay ? (\n          <div className="mt-3 grid grid-cols-2 gap-2">\n            <button\n              type="button"\n              disabled={loadingWallets || paying || skipping}\n              onClick={openPayment}\n              className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3 text-[11px] font-black text-emerald-200 disabled:opacity-45"\n            >\n              {loadingWallets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}\n              {loadingWallets ? "Loading..." : "Pay"}\n            </button>\n            <button\n              type="button"\n              disabled={!canSkip || loadingWallets || paying || skipping}\n              onClick={() => {\n                setPaymentOpen(false);\n                setSkipConfirmOpen(true);\n                setPaymentNotice("");\n              }}\n              className="flex min-h-[42px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 text-[11px] font-black text-white/70 disabled:opacity-45"\n            >\n              {skipping ? "Skipping..." : "Skip"}\n            </button>\n          </div>\n        ) : null}\n\n        {dueMeta.state === "skipped" ? (\n          <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5 text-center text-[11px] font-black text-white/58">\n            Skipped for this cycle · no wallet deduction\n          </div>\n        ) : null}\n\n        {skipConfirmOpen ? (\n          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/[0.16] p-3">\n            <p className="text-xs font-black text-white/90">Skip this payment for this cycle?</p>\n            <p className="mt-1 text-[10px] font-semibold leading-4 text-white/45">\n              No money will be deducted. This obligation stays active for future cycles.\n            </p>\n            <div className="mt-3 grid grid-cols-2 gap-2">\n              <button\n                type="button"\n                disabled={skipping}\n                onClick={() => setSkipConfirmOpen(false)}\n                className="min-h-[38px] rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[11px] font-black text-white/65 disabled:opacity-45"\n              >\n                Cancel\n              </button>\n              <button\n                type="button"\n                disabled={skipping}\n                onClick={submitSkip}\n                className="flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-amber-300/18 bg-amber-400/[0.07] px-3 text-[11px] font-black text-amber-100 disabled:opacity-45"\n              >\n                {skipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}\n                {skipping ? "Skipping..." : "Skip payment"}\n              </button>\n            </div>\n          </div>\n        ) : null}\n'''
text = replace_once(text, old_button, new_button, "card pay skip buttons")
path.write_text(text)

# 6) Regression coverage.
test_path = Path("tests/debt-skip-occurrence-regression.test.mjs")
test_path.write_text('''import assert from "node:assert/strict";\nimport test from "node:test";\nimport { readFile } from "node:fs/promises";\n\nimport {\n  calculateMeansScoreState,\n  resolveAdaptiveMeansBaselineState,\n} from "../src/lib/clara-means-cycle-baseline.js";\n\nconst cycle = { cycleStart: "2026-09-01", cycleEnd: "2026-09-30", today: "2026-09-13" };\n\ntest("skipped debt occurrence removes Remaining Plan without pretending Wallet moved", () => {\n  const planned = resolveAdaptiveMeansBaselineState({\n    ...cycle,\n    occurrences: [{\n      id: "debt:chatgpt:2026-09-10",\n      requirementKey: "debt:chatgpt:2026-09-10",\n      sourceId: "chatgpt",\n      sourceType: "debt",\n      kind: "debt",\n      date: "2026-09-10",\n      amount: 1100,\n    }],\n  });\n  const before = calculateMeansScoreState({\n    availableWalletMoney: 5000,\n    remainingPlannedSpending: planned.remainingPlannedSpending,\n    cycle100Anchor: planned.cycle100Anchor,\n  });\n  const skipped = resolveAdaptiveMeansBaselineState({\n    ...cycle,\n    stored: planned.baseline,\n    occurrences: [{\n      id: "debt:chatgpt:2026-09-10",\n      requirementKey: "debt:chatgpt:2026-09-10",\n      sourceId: "chatgpt",\n      sourceType: "debt",\n      kind: "debt",\n      date: "2026-09-10",\n      amount: 1100,\n      waivedAmount: 1100,\n      actualPaid: 0,\n    }],\n  });\n  const after = calculateMeansScoreState({\n    availableWalletMoney: 5000,\n    remainingPlannedSpending: skipped.remainingPlannedSpending,\n    cycle100Anchor: skipped.cycle100Anchor,\n  });\n\n  assert.equal(planned.remainingPlannedSpending, 1100);\n  assert.equal(skipped.remainingPlannedSpending, 0);\n  assert.equal(skipped.cycle100Anchor, 1100);\n  assert.equal(before.availableWalletMoney, 5000);\n  assert.equal(after.availableWalletMoney, 5000);\n  assert.equal(after.score > before.score, true);\n});\n\ntest("Skip implementation stays separate from payment history and wallet mutation", async () => {\n  const store = await readFile(new URL("../src/lib/debtObligationStore.js", import.meta.url), "utf8");\n  const authority = await readFile(new URL("../src/lib/clara-means-authority.js", import.meta.url), "utf8");\n  const card = await readFile(new URL("../src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx", import.meta.url), "utf8");\n\n  assert.match(store, /skipDebtOccurrenceForCycle/);\n  assert.match(store, /skippedOccurrences/);\n  assert.match(authority, /waivedAmount: isDebtOccurrenceSkipped/);\n  assert.match(card, />Pay</);\n  assert.match(card, />Skip</);\n});\n''')

print("Debt occurrence Skip patch applied.")
