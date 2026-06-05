function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

export function buildGroundedIncomeHubBlock(context = {}) {
  const packageData = context.__incomeHubGroundedReplyPackage || context.incomeHubGroundedReplyPackage || null;
  if (!packageData?.handled || !packageData?.shouldUseGemini || !packageData?.facts) {
    return "No grounded Income Hub package selected for this message.";
  }

  const facts = packageData.facts || {};
  const records = Array.isArray(facts.matchedRecords) ? facts.matchedRecords : [];
  const sourceRoots = Array.isArray(facts.sourceRoots) ? facts.sourceRoots : [];
  const summary = facts.summary || {};

  return `GROUNDING MODE ACTIVE: Income Hub Grounded Gemini Composer

Use this block first for Income Hub questions.
The local Income Hub reader already checked the user's real local data.
Use only these verified Income Hub facts.
Never invent income sources, amounts, wallets, dates, notes, or transfers.
Income source/root means where the money came from, such as employer, salary source, business, or side hustle.
Receiving wallet means where the money was received or stored.
Start the reply with: "I checked your Income Hub..."
Keep the reply natural, concise, and mobile-chat friendly.
Do not say Transaction Hub for this answer.

Verified matched income records:
${records.length ? records.map((record) => `${record.index}. ${record.incomeSourceName} | ${record.displayAmount} | Date: ${record.date} | Receiving wallet: ${record.destinationWalletName || "not shown"} | Source root: ${record.isSourceRoot ? "yes" : "no"} | Note: ${record.note || "none"}`).join("\n") : "No verified matched income records."}

Verified Income Hub source roots:
${sourceRoots.length ? sourceRoots.map((record) => `${record.index}. ${record.incomeSourceName} | Total: ${record.displayAmount} | Latest activity: ${record.date} | Receiving wallet: ${record.destinationWalletName || "not shown"}`).join("\n") : "No source roots loaded."}

Summary:
Total income in matched records: ${money(summary.totalIncome || 0)}
Matched records: ${summary.incomeCount || records.length || 0}
Top income source: ${summary.topIncomeSource || "No income source"}
Most used receiving wallet: ${summary.mostUsedReceivingWallet || "No receiving wallet"}`;
}
