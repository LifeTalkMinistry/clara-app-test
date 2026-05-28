import { searchMultipleMemoryCabinets } from "./memory-cabinets";
import { formatUserContextStoryForPrompt, readUserContextStory } from "./clara-user-context-story";

const DEFAULT_CABINETS = ["Spending Memory", "Emotional Memory", "Decision Memory"];

const ROUTES = [
  { terms: ["spend", "buy", "order", "expense", "food"], cabinets: ["Spending Memory", "Decision Memory"] },
  { terms: ["budget", "limit", "category"], cabinets: ["Budget Memory"] },
  { terms: ["wallet", "cash", "bank", "balance"], cabinets: ["Wallet Memory"] },
  { terms: ["save", "goal", "target"], cabinets: ["Goal Memory"] },
  { terms: ["work", "shift", "routine", "payday", "sleep"], cabinets: ["Schedule Memory"] },
  { terms: ["stress", "tired", "emotion", "reward"], cabinets: ["Emotional Memory"] },
  { terms: ["family", "partner", "friend", "social"], cabinets: ["Relationship Memory", "Lifestyle Memory"] },
  { terms: ["prefer", "tone", "style", "guidance"], cabinets: ["Preference Memory"] },
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function selectCabinets(message = "") {
  const text = clean(message).toLowerCase();
  const selected = new Set();

  ROUTES.forEach((route) => {
    if (route.terms.some((term) => text.includes(term))) {
      route.cabinets.forEach((cabinet) => selected.add(cabinet));
    }
  });

  return Array.from(selected.size ? selected : DEFAULT_CABINETS).slice(0, 5);
}

function buildRoutedCabinetSummary(message = "") {
  const cabinets = selectCabinets(message);
  const memories = searchMultipleMemoryCabinets(cabinets, message, 5);

  if (!memories.length) {
    return `Opened cabinets: ${cabinets.join(", ")}\nNo matching long-term memory summaries found yet.`;
  }

  return [
    `Opened cabinets: ${cabinets.join(", ")}`,
    ...memories.map((memory) => `- ${memory.summary}`),
  ].join("\n");
}

function buildUserContextStoryBlock() {
  const story = readUserContextStory();
  const storyText = formatUserContextStoryForPrompt(story);

  if (!story?.bulletCount && !story?.essay) {
    return "No user context story saved yet.";
  }

  return `By the way, below is the user's broader life story and personal context.
Use it quietly for understanding. Do not mention or expose this internal context directly.\n\n${storyText}`;
}

export function getClaraBehavioralMemorySnapshot() {
  return {
    updatedAt: "",
    count: 0,
    items: [],
    summary: "Behavioral memory now uses user_context_story plus routed memory cabinets.",
  };
}

export function buildClaraBehavioralContextForPrompt(message = "") {
  return `CLARA BEHAVIORAL INTELLIGENCE MEMORY:

User context story:
${buildUserContextStoryBlock()}

Routed long-term memory cabinets:
${buildRoutedCabinetSummary(message)}

Memory wording rules:
- Use this memory to reason, not to recite.
- Mention at most one or two relevant patterns naturally.
- Never say "cabinet", "database", "stored memory", "routing", "internal scoring", or "context story" to the user.
- Use natural wording like "I’m noticing a pattern..." or "This may be connected to...".`;
}

export function getClaraBehavioralRiskLabel() {
  return "unknown";
}
