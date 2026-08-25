from pathlib import Path

path = Path('src/lib/clara-buy-check-expert-ai.js')
text = path.read_text(encoding='utf-8')

mandatory_rule = '- When a purchase price is known and means.projectedScoreAfterPurchase is available, ALWAYS state the exact projected Means Score in the visible reply.'
if mandatory_rule in text:
    print('Exact projected Means score rule already present.')
    raise SystemExit(0)

old_primary = '''- Never describe means.currentScore as the score the user will keep after buying when means.projectedScoreAfterPurchase is available.
- If the projected score differs from the current score, state the movement accurately when discussing the impact (for example: 144 → 142).
- Also use means.currentRoomUntilPayday → means.projectedRoomAfterPurchase when that makes the consequence clearer.'''
new_primary = '''- Never describe means.currentScore as the score the user will keep after buying when means.projectedScoreAfterPurchase is available.
- When a purchase price is known and means.projectedScoreAfterPurchase is available, ALWAYS state the exact projected Means Score in the visible reply.
- Prefer stating the before → after movement when means.currentScore is also available (for example: 144 → 142), but at minimum the projected score must always be visible.
- Do not replace the exact score with vague wording such as "comfortably above 100", "healthy", or "plenty of breathing room" without also stating the projected score.
- Also use means.currentRoomUntilPayday → means.projectedRoomAfterPurchase when that makes the consequence clearer.'''
if old_primary not in text:
    raise SystemExit('Could not find current PRIMARY JOB simulation bullets')
text = text.replace(old_primary, new_primary, 1)

old_arch = '''- REAL-TIME PURCHASE SIMULATION RULE: once means.purchaseSimulationApplied is true, base the recommendation on the projected state, not the current state.
- Never say a purchase "keeps" the current score unless means.currentScore and means.projectedScoreAfterPurchase are actually equal.
- Never ignore a non-zero means.scoreChange or means.roomChange. If you mention the impact, describe the before → after movement accurately.'''
new_arch = '''- REAL-TIME PURCHASE SIMULATION RULE: once means.purchaseSimulationApplied is true, base the recommendation on the projected state, not the current state.
- When means.purchaseSimulationApplied is true and means.projectedScoreAfterPurchase is available, the visible response MUST include that exact projected score.
- Never say a purchase "keeps" the current score unless means.currentScore and means.projectedScoreAfterPurchase are actually equal.
- Never ignore a non-zero means.scoreChange or means.roomChange. Describe the before → after score movement accurately whenever both scores are available.'''
if old_arch not in text:
    raise SystemExit('Could not find current architecture simulation rules')
text = text.replace(old_arch, new_arch, 1)

old_style = '''- When a purchase price is known and means.projectedScoreAfterPurchase exists, the projected score/change is normally that ONE most important financial point.
- Prefer natural before → after wording when useful, for example: "That would move you from 144 to about 142, still comfortably above 100."'''
new_style = '''- When a purchase price is known and means.projectedScoreAfterPurchase exists, the projected score/change is ALWAYS the primary visible financial point.
- State the exact projected score every time. Prefer natural before → after wording, for example: "That would move you from 144 to 142, still comfortably above 100."
- Never give only a qualitative statement like "you stay above 100" when the exact projected score is available.'''
if old_style not in text:
    raise SystemExit('Could not find current visible response simulation bullets')
text = text.replace(old_style, new_style, 1)

path.write_text(text, encoding='utf-8')
print('Patched Ask Before You Spend to always show the exact projected Means Score.')
