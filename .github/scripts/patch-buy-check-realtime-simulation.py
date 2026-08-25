from pathlib import Path

path = Path('src/lib/clara-buy-check-expert-ai.js')
text = path.read_text(encoding='utf-8')

old_return = '''    protectionLine: 100,
    currentScore: Number.isFinite(currentScore) ? currentScore : null,
    projectedScoreAfterPurchase,
    currentRoomUntilPayday,
    projectedRoomAfterPurchase,
    crossesProtectionLine:
'''
new_return = '''    protectionLine: 100,
    currentScore: Number.isFinite(currentScore) ? currentScore : null,
    projectedScoreAfterPurchase,
    scoreChange:
      Number.isFinite(currentScore) && projectedScoreAfterPurchase !== null
        ? projectedScoreAfterPurchase - currentScore
        : null,
    currentRoomUntilPayday,
    projectedRoomAfterPurchase,
    roomChange:
      projectedRoomAfterPurchase !== null
        ? projectedRoomAfterPurchase - currentRoomUntilPayday
        : null,
    purchaseSimulationApplied: price > 0,
    crossesProtectionLine:
'''
if old_return not in text:
    raise SystemExit('Could not find canonical Means return block')
text = text.replace(old_return, new_return, 1)

old_primary = '''- When CLARA supplies current and projected Means values, focus primarily on what the purchase does to the user's Means Score and Room Until Payday.
- If the purchase keeps the user comfortably above 100, you may support it while mentioning a meaningful tradeoff when useful.'''
new_primary = '''- When a purchase price is known, ALWAYS treat the projected Means values as the real-time what-if result of buying the item.
- Compare means.currentScore BEFORE the purchase with means.projectedScoreAfterPurchase AFTER the purchase.
- Never describe means.currentScore as the score the user will keep after buying when means.projectedScoreAfterPurchase is available.
- If the projected score differs from the current score, state the movement accurately when discussing the impact (for example: 144 → 142).
- Also use means.currentRoomUntilPayday → means.projectedRoomAfterPurchase when that makes the consequence clearer.
- If the purchase keeps the user comfortably above 100, you may support it while mentioning a meaningful tradeoff when useful.'''
if old_primary not in text:
    raise SystemExit('Could not find PRIMARY JOB Means bullets')
text = text.replace(old_primary, new_primary, 1)

old_arch = '''- means.currentScore is the user's real current Means Score. means.projectedScoreAfterPurchase is the simulated score after this proposed purchase.
- means.currentRoomUntilPayday and means.projectedRoomAfterPurchase are authoritative breathing-room values through means.nextPayday.
- NEVER claim the user has no wallet, income, or Means setup when the means object is present.
- Do not independently rebuild or contradict the Means calculation.
- Treat 100 as the financial protection line: protect it without moralizing ordinary safe purchases.'''
new_arch = '''- means.currentScore is the user's BEFORE-PURCHASE Means Score. means.projectedScoreAfterPurchase is the authoritative AFTER-PURCHASE simulated score when a price is known.
- means.currentRoomUntilPayday and means.projectedRoomAfterPurchase are authoritative before/after breathing-room values through means.nextPayday.
- REAL-TIME PURCHASE SIMULATION RULE: once means.purchaseSimulationApplied is true, base the recommendation on the projected state, not the current state.
- Never say a purchase "keeps" the current score unless means.currentScore and means.projectedScoreAfterPurchase are actually equal.
- Never ignore a non-zero means.scoreChange or means.roomChange. If you mention the impact, describe the before → after movement accurately.
- NEVER claim the user has no wallet, income, or Means setup when the means object is present.
- Do not independently rebuild or contradict the Means calculation.
- Treat 100 as the financial protection line: protect it without moralizing ordinary safe purchases.'''
if old_arch not in text:
    raise SystemExit('Could not find architecture Means rule')
text = text.replace(old_arch, new_arch, 1)

old_style = '''- Mention only the ONE most important financial point for this turn. A second fact is allowed only when it is essential to understand the first.
- Do not recite every balance, obligation, budget, Money Schedule amount, savings goal, tradeoff, or calculation you considered.'''
new_style = '''- Mention only the ONE most important financial point for this turn. A second fact is allowed only when it is essential to understand the first.
- When a purchase price is known and means.projectedScoreAfterPurchase exists, the projected score/change is normally that ONE most important financial point.
- Prefer natural before → after wording when useful, for example: "That would move you from 144 to about 142, still comfortably above 100."
- Do not recite every balance, obligation, budget, Money Schedule amount, savings goal, tradeoff, or calculation you considered.'''
if old_style not in text:
    raise SystemExit('Could not find visible response style bullets')
text = text.replace(old_style, new_style, 1)

path.write_text(text, encoding='utf-8')
print('Patched Ask Before You Spend for authoritative real-time Means simulation.')
