import { requestGeminiJson, hasGeminiJsonConfig } from "@/lib/clara-gemini-json-utils";
import { getAvailableCabinetNames, normalizeCabinetName, searchMultipleMemoryCabinets } from "@/lib/memory-cabinets";

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

function validateRouterJson(json = {}, userConcern = "") {
  const candidates = Array.isArray(json.open_cabinets) ? json.open_cabinets : [];
  const openCabinets = candidates.map(normalizeCabinetName).filter(Boolean).slice(0, 5);

  return {
    open_cabinets: openCabinets.length ? openCabinets : fallbackCabinets(userConcern),
    reason: clean(json.reason) || "Fallback cabinet route selected from the user concern.",
  };
}

export async function routeClaraMemoryCabinets({ userConcern = "" } = {}) {
  const concern = clean(userConcern);

  if (!concern || !hasGeminiJsonConfig()) {
    return validateRouterJson({ open_cabinets: fallbackCabinets(concern) }, concern);
  }

  const prompt = `You are CLARA's Memory Cabinet Router.

Based on this user concern, choose only the memory cabinets CLARA should open.

Available cabinets:
${getAvailableCabinetNames().map((name) => `- ${name}`).join("\n")}

Rules:
- Open only relevant cabinets.
- Prefer 2 to 4 cabinets.
- Never request all cabinets unless the concern truly requires it.
- Return JSON only.

User concern:
${concern}

JSON shape:
{
  "open_cabinets": [],
  "reason": ""
}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.12, maxOutputTokens: 360, label: "CLARA Memory Cabinet Router" });
    return validateRouterJson(result.json, concern);
  } catch {
    return validateRouterJson({ open_cabinets: fallbackCabinets(concern) }, concern);
  }
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
