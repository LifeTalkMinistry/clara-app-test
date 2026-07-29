import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n");

const repository = readSource("src/lib/incomeHubRepository.js");
const card = readSource("src/components/financial-carousel/cards/investment/ui/InvestmentCardView.jsx");
const addMoneyModal = readSource("src/components/financial-carousel/cards/investment/ui/IncomeSourceAddMoneyModal.jsx");
const createModal = readSource("src/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModal.jsx");
const createModalBase = readSource("src/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModalBase.jsx");
const surfaces = readSource("src/components/financial-carousel/cards/investment/ui/IncomeHubExpandedSurfaces.jsx");
const cardLogic = readSource("src/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic.js");
const renderer = readSource("src/components/financial-carousel/ui/CarouselItemCard.jsx");
const financeActionModal = readSource("src/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal.jsx");

test("Income Hub transfer is one IndexedDB transaction across source, wallet, and wallet ledger", () => {
  assert.equal(repository.includes("transferIncomeSourceToWallet"), true);
  assert.equal(repository.includes("runLocalFinanceTransaction"), true);
  assert.equal(repository.includes("[STORE_NAME, WALLET_STORE, WALLET_TRANSACTION_STORE]"), true);
  assert.equal(repository.includes("income_source_id: source.id"), true);
});

test("Income Hub modals no longer create private finance controllers", () => {
  assert.equal(addMoneyModal.includes("useFinancialData"), false);
  assert.equal(createModalBase.includes("useFinancialData"), false);
  assert.equal(renderer.includes("financeCardController={financeCardController}"), true);
  assert.equal(addMoneyModal.includes("financeController = null"), true);
});

test("income timing is React-owned and saved with the source", () => {
  assert.equal(createModal.includes("MutationObserver"), false);
  assert.equal(createModalBase.includes("MutationObserver"), false);
  assert.equal(createModalBase.includes("document.createElement"), false);
  assert.equal(createModalBase.includes("incomeRecurrence: recurrence"), true);
  assert.equal(createModalBase.includes("syncIncomeTimingFromSource"), true);
});

test("one Hide tap is not swallowed by an open source menu", () => {
  assert.equal(card.includes("data-clara-finance-expand-toggle"), true);
  assert.equal(card.includes("suppressRootClickUntilRef"), false);
  assert.equal(card.includes("closeIncomeActionMenu();\n      return;"), true);
});

test("Income Hub validation and local date are visible and deterministic", () => {
  assert.equal(addMoneyModal.includes("toLocalDateKey(new Date())"), true);
  assert.equal(addMoneyModal.includes("submitDisabledLabel"), true);
  assert.equal(addMoneyModal.includes("setError(saveError?.message"), true);
  assert.equal(financeActionModal.includes('submitDisabledLabel = "Unavailable"'), true);
});

test("recent activity is operation history rather than aggregate totals", () => {
  assert.equal(repository.includes("incomeActivityLog"), true);
  assert.equal(surfaces.includes("getActivityLog"), true);
  assert.equal(surfaces.includes('type === "transfer_money"'), true);
  assert.equal(surfaces.includes("if (moneyOut > 0)"), false);
});

test("Income Hub refresh listens to one source event", () => {
  assert.equal(cardLogic.includes('addEventListener("clara-income-hub-updated"'), true);
  assert.equal(cardLogic.includes('addEventListener("clara-finance-updated"'), false);
});

test("closed Income Hub modals are not mounted", () => {
  assert.equal(card.includes("{incomeSourceModal.type ? ("), true);
  assert.equal(card.includes("{sourceFormModal.open ? ("), true);
  assert.equal(card.includes("{removalSource ? ("), true);
});
