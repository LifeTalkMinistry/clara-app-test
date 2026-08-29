# Means Score Authority Repair

This branch aligns the active Means Score calculation with the CLARA Means Score Engineering Authority.

## Locked invariants

- Means Score = actual available Wallet money / current-cycle protected planned requirement * 100.
- Actual spending, actual debt payments, and actual income movements change Wallet only.
- Actual transaction history never reconstructs, shrinks, or expands the 100 baseline.
- Today and past planned requirements remain protected; future requirements remain adaptive.
- Time passage alone does not spend money.
- Savings Goal, Emergency Fund, other protected allocations, and Money Lent are unavailable to the numerator without becoming denominator requirements.
- Future-cycle debt payments and overdue carry do not enter the current-cycle denominator.
- Buy Check simulations use the same numerator/denominator truth as the live Means Score.
- Debt overpayment rollover policy remains intentionally undefined and is not implemented here.

## Verification policy

CI is verification-only. Historical workflows that edited source code during CI were removed. The current workflow checks committed source exactly as written and cannot push repair changes.
