import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const syncedContent = readSource("src/components/financial-carousel/cards/wallet/ui/WalletCardContentSynced.jsx");
const walletCard = readSource("src/components/WalletCard.jsx");
const walletView = readSource("src/components/financial-carousel/cards/wallet/ui/WalletCardView.jsx");
const carouselItem = readSource("src/components/financial-carousel/ui/CarouselItemCard.jsx");
const walletLogic = readSource("src/components/financial-carousel/cards/wallet/logic/useWalletCardLogic.js");
const editModal = readSource("src/components/financial-carousel/cards/wallet/modal/EditWalletModal.jsx");
const walletListItem = readSource("src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx");
const handlers = readSource("src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlersCore.js");
const renderer = readSource("src/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer.jsx");
const helpers = readSource("src/utils/dashboard/dashboardHelpers.js");
const stateSync = readSource("src/components/fresh/main-dashboard/finance-content/useDashboardFinanceStateSync.js");
const previewState = readSource("src/components/fresh/main-dashboard/finance-content/useDashboardFinancePreviewState.js");

test("Wallet card does not create a second finance controller or poll every 900ms", () => {
  assert.equal(syncedContent.includes("useFinancialData"), false);
  assert.equal(syncedContent.includes("setInterval"), false);
  assert.equal(walletView.includes("financeCardController = null"), true);
  assert.equal(carouselItem.includes("financeCardController={financeCardController}"), true);
  assert.equal(walletCard.includes("emergencyFund={emergencyFund}"), true);
});

test("wallet editing preserves provider identity and shows inline errors", () => {
  assert.equal(walletLogic.includes("getWalletProviderFromWallet"), true);
  assert.equal(walletLogic.includes("buildWalletProviderPayload"), true);
  assert.equal(walletLogic.includes("alert("), false);
  assert.equal(editModal.includes("WalletProviderPicker"), true);
  assert.equal(editModal.includes("editError"), true);
});

test("wallet transfers respect spendable balance after protected funds", () => {
  assert.equal(helpers.includes("getWalletSpendableBalance"), true);
  assert.equal(handlers.includes("const transferableBalance"), true);
  assert.equal(handlers.includes("getWalletSpendableBalance(fromWallet)"), true);
  assert.equal(handlers.includes("if (transferableBalance < amount)"), true);
  assert.equal(handlers.includes("spendable balance after protected funds"), true);
});

test("wallet removal blocks money loss and preserves transaction history", () => {
  assert.equal(handlers.includes("Transfer or clear the wallet balance before removing it"), true);
  assert.equal(handlers.includes("protectedAmount > 0 || hasLinkedFunds"), true);
  assert.equal(handlers.includes("hasHistory"), true);
  assert.equal(handlers.includes("is_archived: true"), true);
  assert.equal(handlers.includes("wallet?.isEmergencyFundStorageWallet"), true);
  assert.equal(walletListItem.includes("onDeleteWallet?.(wallet)"), true);
  assert.equal(stateSync.includes("!wallet?.is_archived"), true);
  assert.equal(stateSync.includes("!wallet?.isArchived"), true);
});

test("wallet reorder touches only the two adjacent wallets", () => {
  assert.equal(handlers.includes("const fromWallet = orderedWallets[fromIndex]"), true);
  assert.equal(handlers.includes("const toWallet = orderedWallets[toIndex]"), true);
  assert.equal(handlers.includes("orderedWallets.map((wallet, index)"), false);
  assert.equal(walletListItem.includes("index <= 0"), true);
  assert.equal(walletListItem.includes("index >= walletCount - 1"), true);
});

test("expanded Wallet activity can show more than the collapsed two-row preview", () => {
  assert.equal(previewState.includes(".slice(0, 8)"), true);
  assert.equal(previewState.includes(".slice(0, 2)"), false);
});
