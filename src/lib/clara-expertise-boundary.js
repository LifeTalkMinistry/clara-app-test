import { simulateMeansPurchaseImpact } from "./clara-buy-check-metric-impact.js";

const INVESTMENT_PATTERN = /\b(invest|investing|investment|crypto|cryptocurrency|bitcoin|btc|ethereum|eth|stocks?|shares?|forex|trading|trade|etfs?|mutual funds?|bonds?|securities|portfolio|dividend|tokens?|coins?)\b/i;
const BUSINESS_PATTERN = /\b(business|startup|start-up|franchise|entrepreneur|entrepreneurship|venture|business capital|capital for (?:a|my|the) business)\b/i;
const ADVICE_PATTERN = /\b(should i|can i|is it (?:safe|good|smart|worth it)|would you recommend|do you recommend|recommend|advice|advise|best|which|what should i|where should i|how (?:do i|can i|should i)?\s*(?:invest|start|build|launch|grow)|help me (?:invest|start|build|choose|pick|launch)|i want to (?:invest|start|build|launch)|thinking (?:of|about) (?:investing|starting|building|launching))\b/i;
const EXPLICIT_RECORDING_PATTERN = /\b(log|record|add (?:this )?(?:transaction|expense)|transaction history|show my|check my)\b/i;

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function peso(value = 0) {
  const amount = Math.max(0, Number(value) || 0);
  return `₱${amount.toLocaleString("en-PH", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  })}`;
}

function extractAmount(text = "") {
  const source = clean(text);
  const pesoMatch = source.match(/₱\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (pesoMatch) return Number(String(pesoMatch[1]).replace(/,/g, ""));

  const phpMatch = source.match(/\bphp\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (phpMatch) return Number(String(phpMatch[1]).replace(/,/g, ""));

  const trailingPesoMatch = source.match(/\b([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:pesos?|php)\b/i);
  if (trailingPesoMatch) return Number(String(trailingPesoMatch[1]).replace(/,/g, ""));

  const shorthandMatch = source.match(/\b([0-9]+(?:\.\d+)?)\s*k\b/i);
  if (shorthandMatch) return Number(shorthandMatch[1]) * 1000;

  const contextualMatch = source.match(/\b(?:invest|commit|capital|put in|put|use)\s+(?:about\s+|around\s+)?([0-9][0-9,]*(?:\.\d{1,2})?)(?!\s*(?:months?|years?|%))/i);
  if (contextualMatch) return Number(String(contextualMatch[1]).replace(/,/g, ""));

  return 0;
}

function domainFromText(text = "") {
  const source = clean(text);
  if (BUSINESS_PATTERN.test(source)) return "business";
  if (INVESTMENT_PATTERN.test(source)) return "investment";
  return "";
}

function subjectForDomain(domain = "") {
  return domain === "business" ? "business idea" : "investment";
}

function fundForDomain(domain = "") {
  return domain === "business" ? "business fund" : "investment fund";
}

function scopeStatement(domain = "") {
  if (domain === "business") {
    return "I can’t judge whether the business itself will succeed or design the business strategy for you.";
  }
  return "I can’t judge whether a specific investment, crypto, stock, or trading choice is good or safe for you.";
}

function defaultMeansSnapshot() {
  if (typeof window === "undefined") return null;
  const snapshot = window.__claraCanonicalMeansSnapshot__;
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

export function detectClaraExpertiseBoundary(text = "") {
  const source = clean(text);
  const domain = domainFromText(source);
  if (!domain) return null;
  if (EXPLICIT_RECORDING_PATTERN.test(source)) return null;
  if (!ADVICE_PATTERN.test(source) && !/\?$/.test(source)) return null;

  return {
    domain,
    subject: subjectForDomain(domain),
    amount: extractAmount(source),
  };
}

export function buildClaraExpertiseBoundaryResponse({ text = "", meansSnapshot = null } = {}) {
  const boundary = detectClaraExpertiseBoundary(text);
  if (!boundary) return null;

  const { domain, subject, amount } = boundary;
  const fundName = fundForDomain(domain);
  const scope = scopeStatement(domain);

  if (!(amount > 0)) {
    const practical = domain === "business"
      ? `What I can help with is protecting your living means while you prepare capital—such as building a separate ${fundName} and checking how much you can commit without weakening your everyday runway.`
      : `What I can help with is protecting your living means—such as building a separate ${fundName} and checking how much you can commit without weakening your everyday runway.`;

    return {
      kind: "expertise_boundary",
      domain,
      amount: 0,
      metricImpact: null,
      message: `${scope} ${practical} How much are you thinking of committing?`,
    };
  }

  const snapshot = meansSnapshot || defaultMeansSnapshot();
  const metricImpact = snapshot
    ? simulateMeansPurchaseImpact({
        snapshot,
        purchasePrice: amount,
        impactSource: `${domain}_capital`,
        impactLabel: subject,
      })
    : null;

  if (!metricImpact?.purchaseSimulationApplied || metricImpact.projectedScoreAfterPurchase == null) {
    return {
      kind: "expertise_boundary",
      domain,
      amount,
      metricImpact: null,
      message: `${scope} I can still help you protect your living means, but I can’t verify the Means impact of ${peso(amount)} right now. I’d keep that money separate in a dedicated ${fundName} rather than treat it as available living money.`,
    };
  }

  const before = Number(metricImpact.currentScore);
  const after = Number(metricImpact.projectedScoreAfterPurchase);
  const movement = Number.isFinite(before)
    ? `Committing ${peso(amount)} would bring your Means Score from ${before} to ${after}`
    : `Committing ${peso(amount)} would put your Means Score at ${after}`;

  let readiness;
  if (Number.isFinite(before) && before < 100) {
    readiness = `Your Means Score is already below the 100 protection line, so from a living-means standpoint I would not use current runway for this yet. Build a separate ${fundName} first.`;
  } else if (after < 100) {
    readiness = `That would cross the 100 protection line, so from a living-means standpoint this is too risky right now. I’d build a separate ${fundName} first.`;
  } else if (after === 100) {
    readiness = `That would leave you exactly at the 100 protection line. That is protection, not permission, so I’d build more separate ${fundName} room before taking the risk.`;
  } else {
    readiness = `Your living runway would remain above the 100 protection line. That only tells us your current living means can carry the capital without crossing the line—it does not mean the ${subject} itself is safe, good, or likely to succeed. Keep the capital separate from protected living money.`;
  }

  return {
    kind: "expertise_boundary",
    domain,
    amount,
    metricImpact,
    message: `${scope} ${movement}. ${readiness}`,
  };
}
