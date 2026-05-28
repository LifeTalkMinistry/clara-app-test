import {
  buildClaraContextDiagnostics,
  collectClaraAvailableContext,
} from "./clara-central-context-brain";

const DIAGNOSTIC_COMMAND_PATTERNS = [
  /\brun\s+(the\s+)?context\s+diagnostic\b/i,
  /\bcontext\s+diagnostic\b/i,
  /\bcontext\s+audit\b/i,
  /\breadability\s+audit\b/i,
  /\bphase\s*1\s+(diagnostic|audit|check)\b/i,
  /\bwhat\s+can\s+clara\s+read\b/i,
  /\bwhat\s+context\s+can\s+clara\s+read\b/i,
  /\bcan\s+clara\s+read\s+(all\s+)?(features|cards|context)\b/i,
  /\bcheck\s+(all\s+)?(features|cards|context)\b/i,
];

const CONTEXT_GROUPS = [
  {
    title: "CLARA core",
    sources: ["CLARA_core_identity"],
  },
  {
    title: "Dashboard features",
    sources: [
      "daily_money_tip",
      "learning_hub_progress",
      "dashboard_cards_carousel",
      "money_summary",
      "transaction_history",
    ],
  },
  {
    title: "Finance core",
    sources: [
      "wallet_balance",
      "wallet_list",
      "budget_summary",
      "budget_categories",
      "recent_expenses",
      "monthly_spending",
      "planned_vs_unplanned_spending",
      "income",
      "wallet_transactions",
      "transfers",
    ],
  },
  {
    title: "Protection and goals",
    sources: ["savings_goals", "emergency_fund"],
  },
  {
    title: "Me / Life Stage",
    sources: [
      "Me_summary_profile",
      "life_stage_snapshot_signals",
      "dominant_pressure",
      "recommended_next_moves",
    ],
  },
  {
    title: "Schedule and external context",
    sources: ["schedule_events", "weather", "current_time", "location"],
  },
  {
    title: "Conversation memory",
    sources: ["previous_conversation_memory", "user_message_history"],
  },
  {
    title: "Long-term intelligence",
    sources: ["universal_memory_profile", "user_context_story"],
  },
];

function statusLabel(status = "not_available") {
  if (status === "available") return "available";
  if (status === "empty") return "empty";
  return "not connected";
}

function countByStatus(availableContext = {}) {
  return Object.values(availableContext).reduce(
    (counts, entry) => {
      const status = entry?.status || "not_available";
      if (status === "available") counts.available += 1;
      else if (status === "empty") counts.empty += 1;
      else counts.missing += 1;
      return counts;
    },
    { available: 0, empty: 0, missing: 0 }
  );
}

function groupLines(group, availableContext) {
  return group.sources.map((source) => {
    const entry = availableContext[source] || { status: "not_available" };
    return `• ${source}: ${statusLabel(entry.status)}`;
  });
}

export function isClaraContextDiagnosticRequest(message = "") {
  const text = String(message || "").trim();
  if (!text) return false;
  return DIAGNOSTIC_COMMAND_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildClaraContextDiagnosticReport(context = {}) {
  const availableContext = collectClaraAvailableContext(context || {});
  const diagnostics = buildClaraContextDiagnostics(context || {});
  const counts = countByStatus(availableContext);

  const sections = CONTEXT_GROUPS.map((group) => [
    group.title,
    ...groupLines(group, availableContext),
  ].join("\n"));

  const ready = diagnostics.ai_ready_sources || [];
  const empty = diagnostics.empty_sources || [];
  const missing = diagnostics.missing_sources || [];

  return [
    "CLARA Phase 1 Context Diagnostic",
    "",
    `Summary: ${counts.available} available, ${counts.empty} empty, ${counts.missing} not connected.`,
    "",
    ...sections.flatMap((section) => [section, ""]),
    "AI-readable now:",
    ready.length ? ready.map((source) => `• ${source}`).join("\n") : "• none yet",
    "",
    "Connected but empty:",
    empty.length ? empty.map((source) => `• ${source}`).join("\n") : "• none",
    "",
    "Not connected yet:",
    missing.length ? missing.map((source) => `• ${source}`).join("\n") : "• none",
    "",
    "Phase 1 purpose: this is only checking what CLARA can read. It does not judge answer quality yet.",
  ].join("\n").trim();
}
