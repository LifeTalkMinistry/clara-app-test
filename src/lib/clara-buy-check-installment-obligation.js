const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();

const positiveNumber = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const nonNegativeInteger = (value) => {
  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
};

export function normalizeClaraInstallmentDueDay(value) {
  const dueDay = Number(value);
  return Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 ? dueDay : null;
}

export function buildClaraInstallmentObligationPayload({
  item = "",
  reason = "",
  paymentStructure = null,
  dueDay = null,
  sessionId = "",
} = {}) {
  const structure = paymentStructure && typeof paymentStructure === "object"
    ? paymentStructure
    : null;
  if (!structure || structure.purchaseType !== "installment") {
    throw new Error("A confirmed installment structure is required before documenting this obligation.");
  }

  const frequency = clean(structure.frequency || "monthly").toLowerCase() || "monthly";
  if (frequency !== "monthly") {
    throw new Error("CLARA can currently document monthly installment schedules only.");
  }

  const totalCommitment = positiveNumber(structure.totalCommitment);
  const paymentAmount = positiveNumber(structure.paymentAmount);
  const amountDueNow = positiveNumber(structure.amountDueNow);
  const remainingPayments = nonNegativeInteger(structure.remainingPayments);
  const totalPayments = nonNegativeInteger(structure.totalPayments);
  const fees = Math.max(0, Number(structure.fees) || 0);
  const normalizedDueDay = normalizeClaraInstallmentDueDay(dueDay);

  if (!(totalCommitment > 0) || !(paymentAmount > 0) || !(amountDueNow > 0)) {
    throw new Error("CLARA needs the total commitment, payment amount, and amount due now before documenting this installment.");
  }
  if (remainingPayments === null || totalPayments === null || totalPayments < 1) {
    throw new Error("CLARA needs the confirmed installment payment count before documenting this obligation.");
  }
  if (!normalizedDueDay) {
    throw new Error("Choose the day of the month this installment is due.");
  }

  const title = clean(item) || "Installment purchase";
  const safeReason = clean(reason);
  const structureNote = `${totalPayments} payments of ₱${paymentAmount.toLocaleString("en-PH")} • ₱${amountDueNow.toLocaleString("en-PH")} due now • ${remainingPayments} future payments • ₱${totalCommitment.toLocaleString("en-PH")} total commitment${fees > 0 ? ` • ₱${fees.toLocaleString("en-PH")} fees included` : ""}.`;

  return {
    title,
    name: title,
    label: title,
    lender: title,
    debtType: "installment",
    type: "installment",
    obligationMode: "balance",
    obligation_mode: "balance",
    totalDebt: totalCommitment,
    balance: totalCommitment,
    amount: totalCommitment,
    monthlyDebt: paymentAmount,
    monthlyPayment: paymentAmount,
    monthly_payment: paymentAmount,
    interestRate: 0,
    interest_rate: 0,
    dueDay: normalizedDueDay,
    due_day: normalizedDueDay,
    dueDate: "",
    due_date: "",
    status: "active",
    notes: [
      "Created from Ask Before You Spend as an installment obligation.",
      structureNote,
      safeReason ? `Decision context: ${safeReason}` : "",
    ].filter(Boolean).join(" "),
    sourceFeature: "ask_before_you_spend",
    source_feature: "ask_before_you_spend",
    buyCheckSessionId: clean(sessionId),
    buy_check_session_id: clean(sessionId),
    installmentTotalCommitment: totalCommitment,
    installment_total_commitment: totalCommitment,
    installmentAmountDueNow: amountDueNow,
    installment_amount_due_now: amountDueNow,
    installmentPaymentAmount: paymentAmount,
    installment_payment_amount: paymentAmount,
    installmentRemainingPaymentsAfterInitial: remainingPayments,
    installment_remaining_payments_after_initial: remainingPayments,
    installmentTotalPayments: totalPayments,
    installment_total_payments: totalPayments,
    installmentFrequency: frequency,
    installment_frequency: frequency,
    installmentFees: fees,
    installment_fees: fees,
  };
}
