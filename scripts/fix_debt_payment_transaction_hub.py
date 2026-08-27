from pathlib import Path

path = Path("src/pages/TransactionHub.jsx")
text = path.read_text(encoding="utf-8")

old = '''        .filter((item) => {
          const group = getGroup(item);
          return group === "income" || group === "savings" || group === "wallet";
        })
'''

new = '''        .filter((item) => {
          const group = getGroup(item);
          const isDebtPayment = Boolean(
            item?.debt_payment_id ||
              item?.debtPaymentId ||
              item?.debt_obligation_id ||
              item?.debtObligationId ||
              normalizeText(item?.type) === "debt payment" ||
              normalizeText(item?.source_type || item?.sourceType).includes("debt payment")
          );

          return (
            group === "income" ||
            group === "savings" ||
            group === "wallet" ||
            (group === "expense" && isDebtPayment)
          );
        })
'''

if old not in text:
    if '(group === "expense" && isDebtPayment)' in text:
        print("Debt-payment Transaction Hub visibility fix is already present.")
        raise SystemExit(0)
    raise SystemExit("Expected Transaction Hub wallet-transaction filter was not found; refusing unsafe patch.")

updated = text.replace(old, new, 1)
path.write_text(updated, encoding="utf-8")
print("Patched TransactionHub.jsx to surface debt-payment audit rows as expenses.")
