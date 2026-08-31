import { requestGeminiJson } from "./clara-gemini-json-utils";

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function compactImpact(impact = {}) {
  return {
    meansScoreBefore: impact?.currentScore ?? null,
    meansScoreAfter: impact?.projectedScoreAfterPurchase ?? null,
    crossesProtectionLine: Boolean(impact?.crossesProtectionLine),
    currentCashImpact: Number(impact?.currentCashImpact ?? impact?.purchasePrice ?? 0),
    alreadyAccountedAmount: Number(impact?.alreadyAccountedAmount || 0),
    unmatchedAmount: Number(impact?.unmatchedAmount || 0),
    futureRequiredCommitment: Number(impact?.futureRequiredCommitment || 0),
    totalCommitment: Number(impact?.totalCommitment ?? impact?.purchasePrice ?? 0),
  };
}

export function buildClaraBuyCheckAlternativePrompt({
  item = "",
  reason = "",
  price = 0,
  impact = {},
} = {}) {
  const packet = {
    item: clean(item).slice(0, 120),
    reason: clean(reason).slice(0, 500),
    price: Math.max(0, Number(price) || 0),
    financialImpact: compactImpact(impact),
  };

  return `FEATURE: ASK BEFORE YOU SPEND / BUY CHECK

You are CLARA's optional pre-purchase accountability assistant.

The application has already documented the purchase and calculated the financial effect.
You are called only because the user voluntarily chose to share why they want or need the purchase.

Your one narrow job:
- Give at most ONE practical alternative, delay option, lower-cost substitute, reuse option, or accountability observation that could help the user avoid unnecessary spending.
- If the reason clearly describes a genuine necessary purchase and there is no sensible alternative, do not invent one. Briefly say that no practical alternative is obvious from what the user shared.

Hard rules:
- Do NOT calculate affordability, Means Score, Wall Bill, wallet balances, remaining planned spending, or any financial metric.
- Do NOT ask a follow-up question.
- Do NOT request more user context.
- Do NOT infer facts that are not present in the packet.
- Do NOT automatically discourage spending.
- Do NOT automatically permit spending.
- Do NOT say "you can afford it", "go for it", "plenty of cushion", or similar permission language.
- Keep the visible advice to one short sentence, ideally under 35 words.
- Treat the application's financialImpact fields as authoritative and do not recalculate them.

PURCHASE PACKET — THIS IS THE ONLY USER CONTEXT YOU RECEIVE:
${JSON.stringify(packet, null, 2)}

Return JSON only:
{
  "advice": "one short practical accountability sentence",
  "alternativeFound": true
}`;
}

export async function requestClaraBuyCheckAlternative({
  item = "",
  reason = "",
  price = 0,
  impact = {},
  signal,
} = {}) {
  const prompt = buildClaraBuyCheckAlternativePrompt({ item, reason, price, impact });
  const { json, model } = await requestGeminiJson({
    feature: "ask-before-you-spend",
    prompt,
    maxOutputTokens: 180,
    label: "CLARA Buy Check Alternative",
    signal,
  });

  return {
    advice: clean(json?.advice),
    alternativeFound: json?.alternativeFound === true,
    model,
  };
}
