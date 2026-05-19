import {
  LIFE_STAGE_SNAPSHOT_KEY,
  saveLifeStageIntelligence,
} from "./lifeStageIntelligenceEngine";

export const LIFE_STAGE_WORLD_CONTEXT_KEY = "clara_life_stage_world_context_v1";
export const LIFE_STAGE_ENRICHMENT_LOG_KEY = "clara_life_stage_enrichment_log_v1";

const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_TIMEOUT_MS = 22000;
const DEFAULT_REFRESH_DAYS = 14;
const MAX_ADJUSTMENT = 12;

function getGeminiConfig() {
  return {
    apiKey:
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
      "",
    model: import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL,
    backendEndpoint: import.meta.env.VITE_CLARA_LIFE_STAGE_ENRICHMENT_ENDPOINT || "",
    enableSearchGrounding:
      String(import.meta.env.VITE_CLARA_GEMINI_SEARCH_GROUNDING || "").toLowerCase() === "true",
  };
}

function nowIso() {
  return new Date().toISOString();
}

function daysBetween(fromIso, to = new Date()) {
  const from = new Date(fromIso || 0).getTime();
  if (!Number.isFinite(from) || from <= 0) return Infinity;
  return Math.floor((to.getTime() - from) / 86400000);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function cleanText(value, max = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Gemini returned an empty enrichment response.");

  const direct = safeJsonParse(raw, null);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = String(fenced?.[1] || raw).trim();
  const fencedParsed = safeJsonParse(candidate, null);
  if (fencedParsed) return fencedParsed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini enrichment was not valid JSON.");

  const sliced = candidate.slice(start, end + 1);
  const parsed = safeJsonParse(sliced, null);
  if (!parsed) throw new Error("Gemini enrichment JSON was malformed.");
  return parsed;
}

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeoutId),
  };
}

function currentManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentManilaMonth() {
  return currentManilaDate().slice(0, 7);
}

function profileSignature(intelligence = {}) {
  const answers = intelligence.answers || {};
  return [
    intelligence.stage,
    answers.setup,
    answers.rhythm,
    answers.workload,
    answers.pressure,
    answers.coping,
    answers.goal,
  ]
    .map((value) => cleanText(value, 160))
    .join("|");
}

function readJsonStorage(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  return safeJsonParse(window.localStorage.getItem(key), fallback);
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createCompactPayload(intelligence = {}) {
  const snapshot = intelligence.snapshot || {};
  const metrics = snapshot.metrics || {};

  return {
    stage: intelligence.stage,
    answers: intelligence.answers || {},
    behavioralProfile: intelligence.behaviorProfile || {},
    localSnapshot: {
      title: snapshot.title,
      statusBadge: snapshot.statusBadge,
      summary: snapshot.summary,
      metrics,
      riskFlags: snapshot.riskFlags || [],
      strengths: snapshot.strengths || [],
      protectionPriority: snapshot.protectionPriority,
      firstAction: snapshot.firstAction,
      confidenceScore: snapshot.confidenceScore,
    },
    generatedAt: intelligence.generatedAt || snapshot.updatedAt,
    manilaDate: currentManilaDate(),
    manilaMonth: currentManilaMonth(),
  };
}

function buildEnrichmentPrompt(compactPayload) {
  return `You are CLARA's Gemini World Intelligence Enrichment Layer.

Role:
- Enrich a local behavioral-financial life-stage profile with real-world context.
- Prioritize Philippine realities, but include global comparison only when useful.
- Treat user-provided answers and local CLARA metrics as stronger than external trends.
- Do not diagnose mental health. Do not exaggerate. Use cautious trend-informed language.
- Do not return article lists, raw news, citations, or long explanations.
- Summarize how external conditions may affect THIS specific profile.
- Keep output concise and practical for a mobile finance app.

Current Manila date: ${currentManilaDate()}
Current Manila month: ${currentManilaMonth()}

Research/synthesis focus:
- Philippine inflation and cost-of-living pressure
- food, transport, rent, salary, and household cost pressure
- student, worker, freelancer, single-parent, business, and shared-household realities when relevant
- digital spending, social media pressure, pay-later/credit behavior, lifestyle creep
- burnout, recovery capacity, routine instability, and emotional spending triggers
- practical protection actions that fit the user's answers

Local CLARA profile:
${JSON.stringify(compactPayload, null, 2)}

Return ONLY valid JSON with this exact shape:
{
  "sourceFreshness": "current_trend_synthesis|general_context_only|fallback_estimate",
  "philippinesContext": "1-2 sentence PH-specific context for this user profile",
  "globalComparison": "1 sentence global comparison if relevant",
  "currentlyAffectingYou": [
    { "label": "short label", "impact": "low|moderate|high", "why": "specific effect on this profile" }
  ],
  "likelyStruggles": ["short struggle"],
  "likelyStrengths": ["short strength"],
  "predictiveInsights": [
    { "risk": "short risk", "signal": "what CLARA should watch", "timeframe": "this week|this month|next 30 days", "confidence": 0.0, "action": "short adaptive action" }
  ],
  "adaptiveActions": [
    { "title": "short title", "reason": "why this fits", "action": "specific next move" }
  ],
  "snapshotUpdates": {
    "statusBadge": "short living status badge",
    "summary": "2 sentence world-aware summary",
    "firstAction": "one practical first action",
    "metricAdjustments": {
      "financialPressure": 0,
      "burnoutRisk": 0,
      "emotionalSpendingRisk": 0,
      "debtVulnerability": 0,
      "incomeInstability": 0,
      "routineInstability": 0,
      "recoveryCapacity": 0,
      "futurePotential": 0
    }
  },
  "confidenceNotes": ["short confidence note"],
  "refreshAfterDays": 14
}`;
}

function sanitizeList(value, limit = 5) {
  return (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === "string" ? cleanText(item, 180) : item))
    .filter(Boolean)
    .slice(0, limit);
}

function sanitizeImpact(value) {
  const impact = cleanText(value, 20).toLowerCase();
  return ["low", "moderate", "high"].includes(impact) ? impact : "moderate";
}

function sanitizeMetricAdjustments(adjustments = {}) {
  const allowed = [
    "financialPressure",
    "burnoutRisk",
    "emotionalSpendingRisk",
    "debtVulnerability",
    "incomeInstability",
    "routineInstability",
    "recoveryCapacity",
    "futurePotential",
  ];

  return allowed.reduce((acc, key) => {
    const raw = Number(adjustments?.[key] || 0);
    acc[key] = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, Number.isFinite(raw) ? Math.round(raw) : 0));
    return acc;
  }, {});
}

function sanitizeEnrichment(raw = {}, source = "gemini") {
  const updates = raw.snapshotUpdates || {};
  return {
    source,
    sourceFreshness: cleanText(raw.sourceFreshness, 80) || "general_context_only",
    philippinesContext: cleanText(raw.philippinesContext, 420),
    globalComparison: cleanText(raw.globalComparison, 280),
    currentlyAffectingYou: (Array.isArray(raw.currentlyAffectingYou) ? raw.currentlyAffectingYou : [])
      .map((item) => ({
        label: cleanText(item?.label, 60),
        impact: sanitizeImpact(item?.impact),
        why: cleanText(item?.why, 220),
      }))
      .filter((item) => item.label || item.why)
      .slice(0, 4),
    likelyStruggles: sanitizeList(raw.likelyStruggles, 5),
    likelyStrengths: sanitizeList(raw.likelyStrengths, 5),
    predictiveInsights: (Array.isArray(raw.predictiveInsights) ? raw.predictiveInsights : [])
      .map((item) => ({
        risk: cleanText(item?.risk, 90),
        signal: cleanText(item?.signal, 160),
        timeframe: cleanText(item?.timeframe, 60) || "next 30 days",
        confidence: Math.max(0, Math.min(1, Number(item?.confidence || 0.55))),
        action: cleanText(item?.action, 180),
      }))
      .filter((item) => item.risk || item.action)
      .slice(0, 4),
    adaptiveActions: (Array.isArray(raw.adaptiveActions) ? raw.adaptiveActions : [])
      .map((item) => ({
        title: cleanText(item?.title, 80),
        reason: cleanText(item?.reason, 180),
        action: cleanText(item?.action, 180),
      }))
      .filter((item) => item.title || item.action)
      .slice(0, 4),
    snapshotUpdates: {
      statusBadge: cleanText(updates.statusBadge, 80),
      summary: cleanText(updates.summary, 520),
      firstAction: cleanText(updates.firstAction, 220),
      metricAdjustments: sanitizeMetricAdjustments(updates.metricAdjustments),
    },
    confidenceNotes: sanitizeList(raw.confidenceNotes, 4),
    refreshAfterDays: Math.max(7, Math.min(30, Number(raw.refreshAfterDays || DEFAULT_REFRESH_DAYS))),
    enrichedAt: nowIso(),
  };
}

function buildFallbackEnrichment(intelligence = {}, reason = "Gemini unavailable") {
  const stage = intelligence.stage || "current life stage";
  const pressure = intelligence.answers?.pressure || "current pressure";
  const coping = intelligence.answers?.coping || "current coping pattern";

  return sanitizeEnrichment(
    {
      sourceFreshness: "fallback_estimate",
      philippinesContext: `CLARA could not refresh Gemini world context yet, so this snapshot is using local signals. For a ${stage}, ${pressure.toLowerCase()} may still affect weekly stability and savings consistency.`,
      globalComparison: "Global comparison is paused until world enrichment refreshes successfully.",
      currentlyAffectingYou: [
        {
          label: "Local-only reading",
          impact: "moderate",
          why: "CLARA is using your answers and local behavior rules while waiting for Gemini enrichment.",
        },
      ],
      likelyStruggles: [pressure, coping].filter(Boolean),
      likelyStrengths: intelligence.snapshot?.strengths || ["Context awareness"],
      predictiveInsights: [
        {
          risk: intelligence.snapshot?.riskFlags?.[0] || "Pressure pattern",
          signal: "CLARA should watch repeated unplanned spending and budget instability.",
          timeframe: "next 30 days",
          confidence: 0.45,
          action: intelligence.snapshot?.firstAction || "Protect essentials before flexible spending.",
        },
      ],
      adaptiveActions: [
        {
          title: "Keep local protection active",
          reason,
          action: intelligence.snapshot?.firstAction || "Use the local snapshot until Gemini refreshes.",
        },
      ],
      snapshotUpdates: {
        statusBadge: intelligence.snapshot?.statusBadge || "Local Snapshot Active",
        summary: intelligence.snapshot?.summary || "CLARA is using local behavioral intelligence while waiting for world context.",
        firstAction: intelligence.snapshot?.firstAction || "Protect the most repeated weekly expense first.",
        metricAdjustments: {},
      },
      confidenceNotes: ["Gemini enrichment unavailable; local snapshot remains active."],
      refreshAfterDays: 7,
    },
    "local_fallback"
  );
}

async function callBackendEnrichment(endpoint, compactPayload) {
  const timeout = withTimeout();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: compactPayload, requestedAt: nowIso() }),
      signal: timeout.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || data?.message || "Life Stage enrichment endpoint failed.");
    }
    return data?.enrichment || data;
  } finally {
    timeout.clear();
  }
}

async function callGeminiEnrichment(compactPayload) {
  const { apiKey, model, enableSearchGrounding } = getGeminiConfig();
  if (!apiKey) {
    throw Object.assign(new Error("Gemini API key is not configured."), { code: "GEMINI_NOT_CONFIGURED" });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = buildEnrichmentPrompt(compactPayload);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.42,
      topP: 0.85,
      topK: 32,
      maxOutputTokens: 1400,
      ...(enableSearchGrounding ? {} : { responseMimeType: "application/json" }),
    },
    ...(enableSearchGrounding ? { tools: [{ google_search: {} }] } : {}),
  };

  const timeout = withTimeout();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || "Gemini enrichment request failed.");
    }

    const textPayload =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .filter(Boolean)
        .join("\n") || "";

    return extractJson(textPayload);
  } finally {
    timeout.clear();
  }
}

function mergeMetricAdjustments(metrics = {}, adjustments = {}) {
  const next = { ...metrics };
  Object.entries(sanitizeMetricAdjustments(adjustments)).forEach(([key, value]) => {
    next[key] = clamp((Number(next[key]) || 0) + value);
  });
  if (next.routineInstability !== undefined) next.routineStability = clamp(100 - next.routineInstability);
  if (next.incomeInstability !== undefined) next.incomeStability = clamp(100 - next.incomeInstability);
  return next;
}

function refreshIndicators(indicators = [], metrics = {}) {
  return (indicators || []).map((indicator) => {
    const keyByLabel = {
      "Financial Pressure": "financialPressure",
      "Burnout Risk": "burnoutRisk",
      "Routine Stability": "routineStability",
      "Emotional Spending": "emotionalSpendingRisk",
      "Future Potential": "futurePotential",
    };
    const metricKey = keyByLabel[indicator.label];
    return metricKey ? { ...indicator, value: clamp(metrics[metricKey]) } : indicator;
  });
}

export function mergeLifeStageWorldContext(intelligence = {}, enrichmentInput = {}) {
  const enrichment = sanitizeEnrichment(enrichmentInput, enrichmentInput.source || "gemini");
  const snapshot = intelligence.snapshot || {};
  const metrics = mergeMetricAdjustments(snapshot.metrics || {}, enrichment.snapshotUpdates?.metricAdjustments || {});
  const updatedAt = nowIso();

  const worldTags = [
    "world_context_enriched",
    ...enrichment.currentlyAffectingYou.map((item) => `world:${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`),
  ];

  return {
    ...intelligence,
    version: Math.max(2, Number(intelligence.version || 1)),
    behaviorProfile: {
      ...(intelligence.behaviorProfile || {}),
      interpretedTags: [
        ...new Set([...(intelligence.behaviorProfile?.interpretedTags || []), ...worldTags]),
      ],
      worldContextUpdatedAt: updatedAt,
    },
    snapshot: {
      ...snapshot,
      statusBadge: enrichment.snapshotUpdates?.statusBadge || snapshot.statusBadge,
      summary: enrichment.snapshotUpdates?.summary || snapshot.summary,
      firstAction: enrichment.snapshotUpdates?.firstAction || snapshot.firstAction,
      metrics,
      indicators: refreshIndicators(snapshot.indicators || [], metrics),
      worldContext: {
        philippinesContext: enrichment.philippinesContext,
        globalComparison: enrichment.globalComparison,
        sourceFreshness: enrichment.sourceFreshness,
        currentlyAffectingYou: enrichment.currentlyAffectingYou,
        enrichedAt: updatedAt,
      },
      likelyStruggles: enrichment.likelyStruggles,
      likelyStrengths: enrichment.likelyStrengths,
      predictiveInsights: enrichment.predictiveInsights,
      adaptiveActions: enrichment.adaptiveActions,
      confidenceNotes: enrichment.confidenceNotes,
      enrichmentStatus: enrichment.source === "local_fallback" ? "local fallback" : "world-aware",
      generatedBy: `${snapshot.generatedBy || "local_life_stage_engine_v1"}+gemini_world_enrichment_v1`,
      worldUpdatedAt: updatedAt,
      staleAfter: new Date(Date.now() + enrichment.refreshAfterDays * 86400000).toISOString(),
      updatedAt,
    },
    worldEnrichment: enrichment,
    enrichedAt: updatedAt,
    nextRefreshReason: "world_context_cached",
  };
}

export function shouldRefreshLifeStageEnrichment(intelligence = {}, options = {}) {
  if (!intelligence?.snapshot) return false;
  if (options.force) return true;

  const signature = profileSignature(intelligence);
  const cached = readJsonStorage(LIFE_STAGE_WORLD_CONTEXT_KEY, null);
  const snapshot = intelligence.snapshot || {};
  const enrichedAt = intelligence.enrichedAt || snapshot.worldUpdatedAt || cached?.enrichedAt;
  const staleAfter = snapshot.staleAfter || cached?.staleAfter;

  if (!snapshot.worldContext || !intelligence.worldEnrichment) return true;
  if (cached?.signature && cached.signature !== signature) return true;
  if (staleAfter && new Date(staleAfter).getTime() < Date.now()) return true;
  if (daysBetween(enrichedAt) >= DEFAULT_REFRESH_DAYS) return true;
  if (snapshot.confidenceScore && snapshot.confidenceScore < 0.62) return true;
  if (snapshot.enrichmentStatus === "local fallback") return true;

  return false;
}

function updateEnrichmentLog(entry) {
  const previous = readJsonStorage(LIFE_STAGE_ENRICHMENT_LOG_KEY, { events: [] });
  const events = [entry, ...(previous.events || [])].slice(0, 30);
  writeJsonStorage(LIFE_STAGE_ENRICHMENT_LOG_KEY, { events, updatedAt: nowIso() });
}

export async function enrichLifeStageWithGemini(intelligence = {}, options = {}) {
  if (!intelligence?.snapshot) return intelligence;
  if (!shouldRefreshLifeStageEnrichment(intelligence, options)) return intelligence;

  const { backendEndpoint } = getGeminiConfig();
  const compactPayload = createCompactPayload(intelligence);
  const signature = profileSignature(intelligence);
  const startedAt = nowIso();

  try {
    const raw = backendEndpoint
      ? await callBackendEnrichment(backendEndpoint, compactPayload)
      : await callGeminiEnrichment(compactPayload);
    const enrichment = sanitizeEnrichment(raw, backendEndpoint ? "backend_gemini" : "gemini");
    const enriched = mergeLifeStageWorldContext(intelligence, enrichment);

    writeJsonStorage(LIFE_STAGE_WORLD_CONTEXT_KEY, {
      signature,
      stage: intelligence.stage,
      enrichment,
      enrichedAt: enriched.enrichedAt,
      staleAfter: enriched.snapshot?.staleAfter,
    });

    updateEnrichmentLog({
      type: "world_enrichment_success",
      stage: intelligence.stage,
      source: enrichment.source,
      startedAt,
      completedAt: nowIso(),
    });

    await saveLifeStageIntelligence(enriched, {
      reason: options.reason || "life_stage_world_enriched",
      localUserId: options.localUserId,
    });

    return enriched;
  } catch (error) {
    console.warn("CLARA Life Stage Gemini enrichment failed:", error);
    updateEnrichmentLog({
      type: "world_enrichment_failed",
      stage: intelligence.stage,
      error: error?.message || "Gemini enrichment failed.",
      startedAt,
      completedAt: nowIso(),
    });

    if (options.allowFallback === false) return intelligence;

    const fallback = buildFallbackEnrichment(intelligence, error?.message || "Gemini unavailable");
    const fallbackSnapshot = mergeLifeStageWorldContext(intelligence, fallback);
    await saveLifeStageIntelligence(fallbackSnapshot, {
      reason: "life_stage_world_enrichment_fallback",
      localUserId: options.localUserId,
    });
    return fallbackSnapshot;
  }
}

export function getLifeStageEnrichmentStatus() {
  const { apiKey, model, backendEndpoint, enableSearchGrounding } = getGeminiConfig();
  const cached = readJsonStorage(LIFE_STAGE_WORLD_CONTEXT_KEY, null);
  return {
    configured: Boolean(backendEndpoint || apiKey),
    model,
    backendEndpointConfigured: Boolean(backendEndpoint),
    directGeminiConfigured: Boolean(apiKey),
    searchGroundingEnabled: enableSearchGrounding,
    cachedStage: cached?.stage || null,
    cachedAt: cached?.enrichedAt || null,
    staleAfter: cached?.staleAfter || null,
  };
}
