import { normalizeCabinetName, searchMultipleMemoryCabinets } from "@/lib/memory-cabinets";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function fallbackCabinets(userConcern = "") {
  const text = clean(userConcern).toLowerCase();
  const selected = new Set();

  if (/spend|spent|buy|bili|order|food|coffee|shopping|gastos|expense|leak/.test(text)) selected.add("Spending Memory");
  if (/budget|limit|allocation|category|left/.test(text)) selected.add("Budget Memory");
  if (/wallet|cash|gcash|maya|bank|balance/.test(text)) selected.add("Wallet Memory");
  if (/goal|save|saving|target|ipon/.test(text)) selected.add("Goal Memory");
  if (/emergency|buffer|survival|safety/.test(text)) selected.add("Emergency Memory");
  if (/debt|utang|loan|payable|obligation/.test(text)) selected.add("Debt Memory");
  if (/schedule|shift|work|after work|payday|routine|sleep|night/.test(text)) selected.add("Schedule Memory");
  if (/stress|sad|tired|emotion|lonely|burnout|drained|happy|reward/.test(text)) selected.add("Emotional Memory");
  if (/lifestyle|habit|routine|family|partner|friends|social/.test(text)) selected.add("Lifestyle Memory");
  if (/decide|decision|should i|can i|afford|choose/.test(text)) selected.add("Decision Memory");
  if (/learn|lesson|understand|teach|explain/.test(text)) selected.add("Learning Memory");
  if (/prefer|tone|style|remind|guidance/.test(text)) selected.add("Preference Memory");
  if (/relationship|partner|family|coworker|friend|conflict/.test(text)) selected.add("Relationship Memory");

  if (!selected.size) {
    selected.add("Spending Memory");
    selected.add("Emotional Memory");
    selected.add("Decision Memory");
  }

  return Array.from(selected).slice(0, 4);
}

function validateRouterResult(openCabinets = [], userConcern = "") {
  const normalized = (Array.isArray(openCabinets) ? openCabinets : [])
    .map(normalizeCabinetName)
    .filter(Boolean)
    .slice(0, 5);

  return {
    open_cabinets: normalized.length ? normalized : fallbackCabinets(userConcern),
    reason: "Local cabinet route selected from the user concern.",
    source: "local_rule_engine",
  };
}

// Memory routing is deliberately deterministic and free. It never contacts an AI API.
export async function routeClaraMemoryCabinets({ userConcern = "" } = {}) {
  const concern = clean(userConcern);
  return validateRouterResult(fallbackCabinets(concern), concern);
}

export async function buildRelevantMemoryContext({ userConcern = "", limit = 5 } = {}) {
  const route = await routeClaraMemoryCabinets({ userConcern });
  const memories = searchMultipleMemoryCabinets(route.open_cabinets, userConcern, limit);

  return {
    connected: true,
    route,
    memories,
    memoryCount: memories.length,
    note: memories.length
      ? "CLARA opened only the routed memory cabinets and retrieved the most relevant memory summaries."
      : "CLARA memory router is connected, but no saved cabinet memories matched this concern yet.",
  };
}
