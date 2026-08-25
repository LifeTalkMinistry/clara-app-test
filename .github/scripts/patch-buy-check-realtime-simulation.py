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

old_arch = '''- When CLARA supplies a current or projected Means Score, treat it as authoritative. Do not independently rebuild or contradict the Means calculation.
- Treat 100 as the financial protection line: protect it without moralizing ordinary safe purchases.'''
new_arch = '''- When CLARA supplies a current or projected Means Score, treat it as authoritative. Do not independently rebuild or contradict the Means calculation.
- REAL-TIME PURCHASE SIMULATION RULE: once a price is known and means.projectedScoreAfterPurchase is not null, that projected value is the authoritative AFTER-PURCHASE score. means.currentScore is BEFORE-PURCHASE only.
- Never say a purchase "keeps" the current score unless currentScore and projectedScoreAfterPurchase are actually equal.
- Never ignore a non-zero means.scoreChange or means.roomChange. Use the projected state for the recommendation.
- Treat 100 as the financial protection line: protect it without moralizing ordinary safe purchases.'''
if old_arch not in text:
    raise SystemExit('Could not find architecture Means rule')
text = text.replace(old_arch, new_arch, 1)

old_style = '''- Mention the ONE most important financial point, not every relevant fact.
- A second financial point is allowed only when the user cannot understand the recommendation without it.'''
new_style = '''- Mention the ONE most important financial point, not every relevant fact.
- When a purchase price is known and a projected Means Score exists, the projected score/change is normally that ONE most important financial point.
- Prefer natural phrasing such as: "That would move you from 144 to about 142, still comfortably above 100."
- A second financial point is allowed only when the user cannot understand the recommendation without it.'''
if old_style not in text:
    raise SystemExit('Could not find visible response style bullets')
text = text.replace(old_style, new_style, 1)

path.write_text(text, encoding='utf-8')
print('Patched Ask Before You Spend for authoritative real-time Means simulation.')
