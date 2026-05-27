export const MEMORY_CABINET_DEFINITIONS = [
  { name: "Spending Memory", key: "spending", file: "spending-memory.js" },
  { name: "Budget Memory", key: "budget", file: "budget-memory.js" },
  { name: "Wallet Memory", key: "wallet", file: "wallet-memory.js" },
  { name: "Goal Memory", key: "goal", file: "goal-memory.js" },
  { name: "Emergency Memory", key: "emergency", file: "emergency-memory.js" },
  { name: "Debt Memory", key: "debt", file: "debt-memory.js" },
  { name: "Schedule Memory", key: "schedule", file: "schedule-memory.js" },
  { name: "Emotional Memory", key: "emotional", file: "emotional-memory.js" },
  { name: "Lifestyle Memory", key: "lifestyle", file: "lifestyle-memory.js" },
  { name: "Decision Memory", key: "decision", file: "decision-memory.js" },
  { name: "Learning Memory", key: "learning", file: "learning-memory.js" },
  { name: "Preference Memory", key: "preference", file: "preference-memory.js" },
  { name: "Relationship Memory", key: "relationship", file: "relationship-memory.js" },
];

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeCabinetName(value = "") {
  const clean = cleanText(value);
  if (!clean) return null;

  const normalized = clean.toLowerCase().replace(/[^a-z0-9]/g, "");

  const match = MEMORY_CABINET_DEFINITIONS.find((cabinet) => {
    const cabinetName = cabinet.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cabinetKey = cabinet.key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normalized === cabinetName || normalized === cabinetKey || normalized === `${cabinetKey}memory`;
  });

  return match?.name || null;
}

export function getCabinetDefinition(value = "") {
  const cabinetName = normalizeCabinetName(value);
  if (!cabinetName) return null;
  return MEMORY_CABINET_DEFINITIONS.find((cabinet) => cabinet.name === cabinetName) || null;
}

export function getAvailableCabinetNames() {
  return MEMORY_CABINET_DEFINITIONS.map((cabinet) => cabinet.name);
}
