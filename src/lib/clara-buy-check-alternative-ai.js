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
    unmatchedAmount: Number(impact?.unmatchedAmount || 0),
    futureRequiredCommitment: Number(impact?.futureRequiredCommitment || 0),
    totalCommitment: Number(impact?.totalCommitment ?? impact?.purchasePrice ?? 0),
  };
}

export async function requestClaraBuyCheckAlternative({ item = "", reason = "", price = 0, impact = {}, signal } = {}) {
  const packet = {
    item: clean(item).slice(0, 120),
    reason: clean(reason).slice(0, 500),
    price: Math.max(0, Number(price) || 0),
    financialImpact: compactImpact(impact),
  };

  const prompt = `FEATURE: ASK BEFORE YOU SPEND / BUY CHECK\n\nYou are CLARA's optional pre-purchase accountability assistant.\nThe application already documented the purchase and calculated the financial effect.\nYou are called only because the user voluntarily shared why they want or need the purchase.\n\nGive at most ONE brief practical alternative, delay option, lower-cost substitute, reuse option, or accountability observation.\nIf there is no sensible alternative, say so briefly.\nDo not calculate affordability, Means Score, Wall Bill, wallets, or planned spending.\nDo not ask a follow-up question.\nDo not request more context.\nDo not automatically discourage or permit the purchase.\n\nPURCHASE PACKET:\n${JSON.stringify(packet, null, 2)}\n\nReturn JSON only:\n{\n  \"advice\": \"one short accountability sentence\",\n  \"alternativeFound\": true\n}`;

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
