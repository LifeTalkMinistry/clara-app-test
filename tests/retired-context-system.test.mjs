import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const retiredFiles = [
  "src/clara-assistant-memory-tab.js",
  "src/clara-memory-bridge.js",
  "src/clara-onboarding-memory-review-bridge.js",
  "src/clara-memory-cabinet-autosave.js",
  "src/runtime/installScopedClaraMemoryStorage.js",
  "src/lib/clara-conversation-memory-summarizer.js",
  "src/lib/clara-universal-memory-profile.js",
  "src/lib/clara-user-context-story.js",
  "src/lib/clara-behavioral-intelligence.js",
  "src/lib/ai/clara-memory.js",
  "src/lib/ai/clara-memory-router.js",
  "src/lib/ai-brains/memory-brain.js",
];

test("retired Memory implementation files are absent", () => {
  retiredFiles.forEach((relativePath) => {
    assert.equal(existsSync(new URL(`../${relativePath}`, import.meta.url)), false, relativePath);
  });
  assert.equal(existsSync(new URL("../src/lib/memory-cabinets", import.meta.url)), false);
});

test("Settings and runtime no longer expose or install Memory", () => {
  const settings = readSource("src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx");
  const runtime = readSource("src/runtime/installClaraRuntimePatches.js");
  assert.doesNotMatch(settings, /title: "Memory"|open-assistant-memory-board|BrainCircuit/);
  assert.doesNotMatch(runtime, /clara-memory-bridge|clara-assistant-memory-tab|installScopedClaraMemoryStorage|memory-review-premium/);
  assert.match(runtime, /installRetiredContextDataCleanup/);
});

test("the hidden Behavioral Memory Gemini prompt interceptor is gone", () => {
  const html = readSource("index.html");
  assert.doesNotMatch(html, /CLARA BEHAVIORAL INTELLIGENCE FRAMEWORK/);
  assert.doesNotMatch(html, /__claraBehavioralMemoryTrainingInstalled/);
  assert.doesNotMatch(html, /__claraFrameworkFlowGuardInstalled/);
});

test("Profile and AI context have no parallel saved-memory reader", () => {
  const profile = readSource("src/lib/clara-life-profile.js");
  const effective = readSource("src/lib/clara-effective-finance-context.js");
  const buyCheck = readSource("src/lib/clara-buy-check-context-contract.js");
  const bridge = readSource("src/lib/clara-bridge-context-readers.js");
  assert.doesNotMatch(profile, /memoryNotes|approvedMemoryNotes/);
  assert.doesNotMatch(effective, /memoryContext|memory-cabinets|memoryLoaded/);
  assert.doesNotMatch(buyCheck, /memorySummary|profileMemoryNotes|storedMemoryRecords/);
  assert.doesNotMatch(bridge, /previousConversationMemory|CONVERSATION_MEMORY_KEYS|LIVE_USER_MESSAGE_HISTORY_KEY/);
});

test("the obsolete ai_financial_memory object store is migrated away", () => {
  const financeStore = readSource("src/lib/localFinanceStore.js");
  const backup = readSource("src/lib/local-data-export.js");
  assert.match(financeStore, /LOCAL_FINANCE_SCHEMA_VERSION = 4/);
  assert.match(financeStore, /deleteObjectStore\("ai_financial_memory"\)/);
  assert.doesNotMatch(financeStore, /aiFinancialMemory:/);
  assert.doesNotMatch(backup, /ai_financial_memory: \{ keyPath/);
});

test("legacy context storage is actively purged and excluded from backups", () => {
  const cleanup = readSource("src/runtime/installRetiredContextDataCleanup.js");
  const backup = readSource("src/lib/local-data-export.js");
  assert.match(cleanup, /clara_behavioral_memory_v1/);
  assert.match(cleanup, /CLARA_USER_CONTEXT_STORY_V1/);
  assert.match(cleanup, /clara_behavioral_memory_db/);
  assert.match(backup, /RETIRED_CONTEXT_STORAGE_PREFIXES/);
  assert.match(backup, /normalized\.startsWith\(prefix\)/);
});
