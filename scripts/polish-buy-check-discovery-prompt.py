from pathlib import Path

path = Path("src/lib/clara-buy-check-expert-ai.js")
text = path.read_text(encoding="utf-8")

replacements = {
    '- The application owns the exact Means math and adds one short, natural consequence sentence to the visible reply. Never invent, recalculate, or contradict those values.':
        '- The application owns the exact Means math. During discovery keep it private; once the conversation reaches the decision phase, the application adds one short natural consequence sentence. Never invent, recalculate, or contradict those values.',
    '- Do NOT repeat the score movement when the application has already stated it. Continue from it with the practical meaning, recommendation, or one useful question.':
        '- During discovery, do NOT reveal or summarize the score movement. In the decision phase, once the application states it, do NOT repeat it; continue with the practical meaning or recommendation.',
    '- When the purchase and price are known, actively consider how that amount fits the verified money situation. Be selective: mention only the financial facts that actually help the user decide.':
        '- When the purchase and price are known, actively consider how that amount fits the verified money situation internally. During discovery do not reveal the consequence; once context is mature, mention only the financial fact that actually helps the user decide.',
    '- REAL-TIME PURCHASE SIMULATION RULE: once means.purchaseSimulationApplied is true, base the recommendation on the projected state, not the current state.':
        '- REAL-TIME PURCHASE SIMULATION RULE: once means.purchaseSimulationApplied is true, use the projected state in your internal reasoning. Do not turn that into a visible recommendation until the discovery gate is mature.',
    '- When means.purchaseSimulationApplied is true and means.projectedScoreAfterPurchase is available, the FINAL ASSEMBLED response will include that exact projected score through the application-owned natural consequence sentence. Do not repeat it in your own reply.':
        '- When the discovery gate is mature and means.purchaseSimulationApplied is true, the FINAL ASSEMBLED decision-phase response will include the exact projected score through the application-owned natural consequence sentence. Do not repeat it in your own reply.',
    '- Never ignore a non-zero means.scoreChange or means.roomChange in your reasoning. The application-owned sentence will state the exact movement; your own reply should interpret what it means for the user.':
        '- Never ignore a non-zero means.scoreChange or means.roomChange in your reasoning. Keep it private during discovery; in the decision phase the application-owned sentence states the movement and your own reply interprets what it means.',
    '- For ordinary safe purchases, explain the financial consequence, protect the 100 line, and let the user decide.':
        '- For ordinary safe purchases, first understand enough context. Once the discovery gate is mature, explain the financial consequence, protect the 100 line, and let the user decide.',
    '- Once a price is known, the deterministic Means consequence is the primary financial truth, but it must read as a normal sentence inside the conversation — not a dashboard readout.':
        '- Once purchase context is mature, the deterministic Means consequence becomes the primary visible financial truth, but it must read as a normal sentence inside the conversation — not a dashboard readout.',
    '- The application will state the exact before/after consequence. Pick up naturally from that sentence instead of echoing it.':
        '- In the decision phase, the application will state the exact before/after consequence. Pick up naturally from that sentence instead of echoing it. During discovery, do not expose it.',
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"prompt line not found: {old[:70]}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
