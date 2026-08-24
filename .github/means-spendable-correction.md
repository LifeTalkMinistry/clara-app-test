# Means Metric spendable-money correction

Update `src/runtime/installClaraOrbGreeting.js` so the Living Means / Means Score uses the canonical wallet money-semantics layer rather than raw non-Money-Lent wallet balances.

Requirements:
- Import `getEmergencyFund` from `@/lib/financeRepository`.
- Import and use the canonical wallet semantics from `@/lib/clara-wallet-money-semantics.js` (prefer `buildCanonicalWalletState` or the canonical equivalent already exported).
- `buildMeansSnapshot` must fetch emergency fund along with wallets and savings goals.
- Build canonical wallet state from `{ wallets, emergencyFund, savingsGoals }`.
- The amount used as the Means calculation base must be canonical spendable money: wallet balances minus Emergency Fund protected allocation, minus Savings Goal protected allocation, minus other protected allocations, with Money Lent contributing zero.
- Emergency Fund must never become ordinary spendable money for this metric.
- Savings Goal money remains protected; its planned-use date may affect its own scheduled commitment logic but does not make the saved balance general-purpose spendable cash.
- Money Lent remains owned but unavailable.
- Rename the displayed `Available now` line to `Money in hand` because this is now genuinely unprotected/spendable money.
- Keep `Money lent · not available` as contextual information.
- Add contextual protected-money rows only when non-zero: `Emergency fund · protected` and `Savings goals · protected`. Keep them visually secondary and separate from upcoming commitments so they are not presented as expenses.
- `projectedRoom` and Means Score must use this corrected spendable/money-in-hand amount.
- Preserve all existing upcoming Money Schedule, debt/obligation, savings-goal due logic and UI styling unless necessary for this correction.
- Add/adjust a regression test proving that a wallet containing ordinary money plus Emergency Fund/Savings Goal allocations only contributes its unprotected remainder to Means; Money Lent contributes zero.
- Run relevant tests/build if available.
- Commit the implementation to main with a clear message.
