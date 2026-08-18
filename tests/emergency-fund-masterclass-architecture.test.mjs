import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const budgetRuntime = read("src/components/community/BudgetMasterclassRuntime.jsx");
const runtime = read("src/components/community/masterclass/ClaraMasterclassRuntime.jsx");
const registry = read("src/lib/clara-masterclass-registry.js");
const api = read("api/clara-masterclass-gemini.js");
const emergencyCard = read("src/components/fresh/main-dashboard/carousel/EmergencyFundCardStorageWalletMoveConfirm.jsx");

test("Budget stays mounted through the one reusable Masterclass runtime", () => {
  assert.match(budgetRuntime, /ClaraMasterclassRuntime/);
  assert.match(runtime, /getClaraMasterclassDefinition/);
});

test("Masterclass registry supports Budget and Emergency Fund only through explicit definitions", () => {
  assert.match(registry, /budget:\s*Object\.freeze/);
  assert.match(registry, /"emergency-fund":\s*Object\.freeze/);
  assert.match(registry, /return MASTERCLASS_DEFINITIONS\[id\] \|\| null/);
});

test("Masterclass API validates explicit subject authorities", () => {
  assert.match(api, /\["budget",\s*"CLARA BUDGETING MASTERCLASS"\]/);
  assert.match(api, /\["emergency-fund",\s*"CLARA EMERGENCY FUND MASTERCLASS"\]/);
  assert.match(api, /CLARA_MASTERCLASS_ID_INVALID/);
  assert.match(api, /CLARA_MASTERCLASS_PROMPT_BLOCKED/);
});

test("Emergency Fund card links to the canonical Masterclass route without the old inline info toggle", () => {
  assert.match(emergencyCard, /\/community\?view=orb&masterclass=emergency-fund/);
  assert.match(emergencyCard, /Set up my emergency fund/);
  assert.doesNotMatch(emergencyCard, /showInfo/);
  assert.doesNotMatch(emergencyCard, /You’ll choose your monthly survival cost, storage wallet, and protection goal\./);
});

test("Emergency Fund card sends only existing display context into navigation state", () => {
  assert.match(emergencyCard, /monthlySurvivalCost:\s*monthlyExpense/);
  assert.match(emergencyCard, /targetMonths/);
  assert.match(emergencyCard, /targetAmount:\s*target/);
  assert.match(emergencyCard, /protectedAmount:\s*savedAmount/);
  assert.match(emergencyCard, /monthsProtected:\s*months/);
  assert.match(emergencyCard, /storageWalletName/);
  assert.doesNotMatch(emergencyCard, /requestClaraMasterclassAi/);
});
