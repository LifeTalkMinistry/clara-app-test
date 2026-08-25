from pathlib import Path

path = Path('src/lib/clara-buy-check-expert-ai.js')
text = path.read_text(encoding='utf-8')

# Keep only the recent decision context. Long transcripts materially increase
# Gemini latency without improving a one-purchase decision.
text = text.replace(
    'const lines = (Array.isArray(history) ? history.slice(-12) : [])',
    'const lines = (Array.isArray(history) ? history.slice(-6) : [])',
    1,
)

# Once the canonical Means snapshot exists, do not send Gemini a second large
# legacy financial model. The Means snapshot is already the product source of
# truth and contains the pay-cycle commitments needed for the decision.
needle = '''  const means = buildCanonicalMeansContext(price);\n\n  return {\n    means,\n'''
replacement = '''  const means = buildCanonicalMeansContext(price);\n\n  if (means) {\n    return {\n      means,\n      purchaseAlreadyUnderstood: {\n        item: purchase.item,\n        price,\n        suggestedTransactionReason: purchase.reason,\n      },\n      supportingContext: {\n        nextExpectedIncomeDate: income.estimatedNextIncomeDate || null,\n        nearestObligation: dueObligations[0] || null,\n        nearestScheduledEvent: upcomingSchedule[0] || null,\n      },\n    };\n  }\n\n  return {\n    means,\n'''
if needle not in text:
    raise SystemExit('Could not find Means context return insertion point')
text = text.replace(needle, replacement, 1)

# Gemini only needs a short JSON decision/reply. Smaller output ceilings improve
# response time and match CLARA's existing compact-response instruction.
text = text.replace('maxOutputTokens: 520,', 'maxOutputTokens: 320,', 1)

# Make timeout/network fallback useful instead of reverting to a questionnaire.
# If item + price + canonical Means are already known, CLARA can safely show the
# deterministic what-if result locally while Gemini is unavailable.
old_fallback = '''  if (!current.price) {\n    return {\n      action: "probe",\n      reply: `How much is the ${current.item}?`,\n      evidence: current,\n      readinessConfidence: 0.45,\n      source: "fallback",\n    };\n  }\n\n  if (!transactionReasonFromEvidence(current)) {\n    return {\n      action: "probe",\n      reply: "Do you need it, or is it more of a want?",\n      evidence: current,\n      readinessConfidence: 0.65,\n      source: "fallback",\n    };\n  }\n'''
new_fallback = '''  if (!current.price) {\n    return {\n      action: "probe",\n      reply: `How much is the ${current.item}?`,\n      evidence: current,\n      readinessConfidence: 0.45,\n      source: "fallback",\n    };\n  }\n\n  const means = buildCanonicalMeansContext(current.price);\n  if (means?.purchaseSimulationApplied && means.projectedScoreAfterPurchase !== null) {\n    const before = Number.isFinite(Number(means.currentScore)) ? Number(means.currentScore) : null;\n    const after = Number(means.projectedScoreAfterPurchase);\n    const movement = before !== null\n      ? `from ${before} to ${after}`\n      : `to ${after}`;\n    const guidance = after >= 100\n      ? `still above your 100 protection line`\n      : `below your 100 protection line, so I'd wait or reduce the amount`;\n\n    return {\n      action: "ready",\n      reply: `₱${Number(current.price).toLocaleString()} would move your Means Score ${movement}, ${guidance}. Will you still buy it?`,\n      evidence: current,\n      readinessConfidence: 0.9,\n      source: "means-fallback",\n    };\n  }\n\n  if (!transactionReasonFromEvidence(current)) {\n    return {\n      action: "probe",\n      reply: "Do you need it, or is it more of a want?",\n      evidence: current,\n      readinessConfidence: 0.65,\n      source: "fallback",\n    };\n  }\n'''
if old_fallback not in text:
    raise SystemExit('Could not find fallback price/reason block')
text = text.replace(old_fallback, new_fallback, 1)

path.write_text(text, encoding='utf-8')
print('Hardened Ask Before You Spend for lower latency and deterministic Means fallback.')
