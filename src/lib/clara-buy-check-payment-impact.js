import {
  buildClaraPurchaseMetricImpact,
  formatClaraMetricImpactLine,
} from "./clara-buy-check-metric-impact.js";

function money(value) {
  const amount = Math.max(0, Number(value) || 0);
  return `₱${amount.toLocaleString("en-PH", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  })}`;
}

function normalizedPaymentStructure(value = null) {
  const source = value && typeof value === "object" ? value : null;
  if (!source || source.purchaseType !== "installment") return null;

  const amountDueNow = Math.max(0, Number(source.amountDueNow) || 0);
  const paymentAmount = Math.max(0, Number(source.paymentAmount) || 0);
  const remainingPayments = Math.max(0, Math.trunc(Number(source.remainingPayments) || 0));
  const totalPayments = Math.max(
    remainingPayments + 1,
    Math.trunc(Number(source.totalPayments) || remainingPayments + 1),
  );
  const fees = Math.max(0, Number(source.fees) || 0);
  const explicitTotal = Math.max(0, Number(source.totalCommitment) || 0);
  const calculatedTotal = amountDueNow + paymentAmount * remainingPayments + fees;
  const totalCommitment = explicitTotal > 0 ? explicitTotal : calculatedTotal;

  if (!(amountDueNow > 0) || !(paymentAmount > 0) || !(totalCommitment >= amountDueNow)) {
    return null;
  }

  return {
    purchaseType: "installment",
    amountDueNow,
    paymentAmount,
    remainingPayments,
    totalPayments,
    totalCommitment,
    frequency: String(source.frequency || "monthly").trim().toLowerCase() || "monthly",
    fees,
  };
}

export function buildClaraBuyCheckPaymentImpact({
  purchasePrice = 0,
  item = "",
  paymentStructure = null,
  assistantContext = {},
  snapshot = null,
  plannedCandidates = null,
} = {}) {
  const installment = normalizedPaymentStructure(paymentStructure);
  const currentCashImpact = installment
    ? installment.amountDueNow
    : Math.max(0, Number(purchasePrice) || 0);

  if (!(currentCashImpact > 0)) return null;

  const impact = buildClaraPurchaseMetricImpact({
    purchasePrice: currentCashImpact,
    item,
    assistantContext,
    snapshot,
    plannedCandidates,
  });
  if (!impact) return null;

  const totalCommitment = installment
    ? installment.totalCommitment
    : currentCashImpact;
  const futureRequiredCommitment = installment
    ? Math.max(0, totalCommitment - currentCashImpact)
    : 0;

  return {
    ...impact,
    purchaseType: installment ? "installment" : "one_time",
    currentCashImpact,
    futureRequiredCommitment,
    totalCommitment,
    futureCommitmentIncludedInCurrentScore: false,
    paymentAmount: installment?.paymentAmount || 0,
    remainingPayments: installment?.remainingPayments || 0,
    totalPayments: installment?.totalPayments || 1,
    paymentFrequency: installment?.frequency || null,
    installmentFees: installment?.fees || 0,
  };
}

export function formatClaraBuyCheckPaymentImpactLine(impact = {}) {
  const base = formatClaraMetricImpactLine(impact);
  if (!base || impact?.purchaseType !== "installment") return base;

  const future = Math.max(0, Number(impact.futureRequiredCommitment) || 0);
  const remaining = Math.max(0, Math.trunc(Number(impact.remainingPayments) || 0));
  const payment = Math.max(0, Number(impact.paymentAmount) || 0);
  const total = Math.max(0, Number(impact.totalCommitment) || 0);
  if (!(future > 0) || !remaining || !(payment > 0) || !(total > 0)) return base;

  const cadence = String(impact.paymentFrequency || "monthly").trim().toLowerCase();
  return `${base} You’d also be committing to ${money(future)} across ${remaining} future ${cadence} payment${remaining === 1 ? "" : "s"} of ${money(payment)} (${money(total)} total).`;
}

export { normalizedPaymentStructure };
