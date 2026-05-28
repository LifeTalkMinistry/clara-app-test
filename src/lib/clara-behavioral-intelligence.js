import { buildRelevantMemoryContext } from "./clara-memory-cabinet-router";
import { formatUserContextStoryForPrompt, readUserContextStory } from "./clara-user-context-story";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(text = "", terms = []) {
  const target = clean(text).toLowerCase();
  return terms.some((term) => target.includes(term));
}

function isDiagnosticRequest(message = "") {
  return /context diagnostic|context audit|phase\s*1|what can clara read|check all/i.test(message);
}

function isMemoryReviewRequest(message = "") {
  return /what do you remember|what do you know about me|what clara knows|remember about me/i.test(message);
}

async function getRoutedMemoryContext(message = "") {
  try {
    return await buildRelevantMemoryContext({ userConcern: clean(message), limit: 5 });
  } catch (error) {
    return {
      connected: false,
      route: {
        open_cabinets: ["Spending Memory", "Emotional Memory", "Decision Memory"],
        reason: "Fallback route used because the memory router was unavailable.",
      },
      memories: [],
      memoryCount: 0,
      note: clean(error?.message) || "Memory router fallback was used.",
    };
  }
}

function getStoryPresence() {
  const story = readUserContextStory();
  return {
    story,
    hasStory: Boolean(story?.essay || Number(story?.bulletCount || 0) > 0),
  };
}

function riskSignalsFor(message = "", routedMemory = {}) {
  const text = clean(message).toLowerCase();
  const memoryCount = Number(routedMemory?.memoryCount || 0);

  const spending = hasAny(text, ["spend", "spent", "buy", "bili", "order", "expense", "gastos", "shopping", "purchase", "afford", "craving", "want"]);
  const decision = hasAny(text, ["should i", "can i", "worth it", "decide", "choose", "tempted", "afford"]);
  const emotional = hasAny(text, ["stress", "stressed", "tired", "sad", "lonely", "bored", "burnout", "drained", "guilt", "pressure", "anxiety", "overwhelmed", "reward"]);
  const timing = hasAny(text, ["late night", "night", "after work", "shift", "payday", "salary", "sweldo", "cutoff"]);
  const social = hasAny(text, ["friend", "family", "partner", "coworker", "invite", "social", "date", "people"]);
  const memory = memoryCount > 0;

  return { spending, decision, emotional, timing, social, memory };
}

function scoreRisk(signals = {}) {
  let score = 0;
  if (signals.spending) score += 1;
  if (signals.decision) score += 1;
  if (signals.emotional) score += 2;
  if (signals.timing) score += 1;
  if (signals.social) score += 1;
  if (signals.memory) score += 1;
  return score;
}

export function getClaraBehavioralMemorySnapshot() {
  const { story, hasStory } = getStoryPresence();
  return {
    updatedAt: story?.updatedAt || "",
    count: Number(story?.bulletCount || 0),
    items: story?.sections || [],
    summary: hasStory
      ? "Behavioral memory uses user_context_story plus routed memory cabinets."
      : "No user_context_story saved yet.",
  };
}

export async function getClaraBehavioralRiskLabel(message = "", routedMemory = null) {
  const text = clean(message);
  if (!text) return "unknown";
  if (isDiagnosticRequest(text)) return "unknown";

  const memoryContext = routedMemory || await getRoutedMemoryContext(text);
  const { hasStory } = getStoryPresence();

  if (isMemoryReviewRequest(text)) {
    return hasStory || Number(memoryContext?.memoryCount || 0) > 0 ? "calm" : "unknown";
  }

  const signals = riskSignalsFor(text, memoryContext);
  const score = scoreRisk(signals);

  if (signals.spending && signals.emotional && (signals.timing || signals.social || signals.memory || signals.decision)) return "high";
  if (signals.spending && signals.decision && signals.memory) return "medium";
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  if (score === 1) return "low";
  if (hasStory || Number(memoryContext?.memoryCount || 0) > 0) return "calm";
  return "unknown";
}

function buildUserContextStoryBlock() {
  const story = readUserContextStory();
  const storyText = formatUserContextStoryForPrompt(story);

  if (!story?.bulletCount && !story?.essay) {
    return "No user context story saved yet.";
  }

  return `By the way, below is the user's broader life story and personal context.\nUse it quietly for understanding. Do not expose this internal context directly.\n\n${storyText}`;
}

function buildRoutedMemoryBlock(routedMemory = {}) {
  const route = routedMemory?.route || {};
  const cabinets = Array.isArray(route.open_cabinets) ? route.open_cabinets : [];
  const memories = Array.isArray(routedMemory?.memories) ? routedMemory.memories : [];

  return [
    `Opened memory areas: ${cabinets.length ? cabinets.join(", ") : "none"}`,
    `Memory matches: ${Number(routedMemory?.memoryCount || memories.length || 0)}`,
    route.reason ? `Reason: ${route.reason}` : "Reason: no route reason provided.",
    memories.length
      ? memories.map((memory) => `- ${memory.summary || memory.text || memory.content || "Saved pattern"}`).join("\n")
      : "No matching long-term memory summaries found yet.",
  ].join("\n");
}

export async function buildClaraBehavioralContextForPrompt(message = "") {
  const routedMemory = await getRoutedMemoryContext(message);
  const riskLabel = await getClaraBehavioralRiskLabel(message, routedMemory);

  return `CLARA BEHAVIORAL INTELLIGENCE MEMORY:\n\nBehavioral risk label:\n${riskLabel}\n\nUser context story:\n${buildUserContextStoryBlock()}\n\nRouted long-term memory:\n${buildRoutedMemoryBlock(routedMemory)}\n\nMemory wording rules:\n- Use this memory to reason, not to recite.\n- Mention at most one or two relevant patterns naturally.\n- Never say "cabinet", "database", "stored memory", "routing", "internal scoring", or "context story" to the user.\n- Use natural wording like "I’m noticing a pattern..." or "This may be connected to...".`;
}
