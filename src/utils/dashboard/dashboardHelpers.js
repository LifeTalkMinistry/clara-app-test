export * from "./dashboardHelpersBase.js";

import {
  getWalletCurrentBalance,
  getWalletSpendableBalance as getSharedWalletSpendableBalance,
} from "../../lib/clara-wallet-money-semantics.js";

// Explicit exports override the compatibility star export above so every
// dashboard consumer uses the shared wallet-money semantics authority.
export const getWalletDisplayBalance = (wallet = {}) =>
  getWalletCurrentBalance(wallet);

export const getWalletSpendableBalance = (wallet = {}) =>
  getSharedWalletSpendableBalance(wallet);
