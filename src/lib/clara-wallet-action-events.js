export const CLARA_OPEN_CREATE_WALLET_EVENT = "clara:open-create-wallet";
export const CLARA_OPEN_ADD_MONEY_EVENT = "clara:open-add-money";

function dispatchWalletAction(name, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function requestClaraWalletCreation(detail = {}) {
  dispatchWalletAction(CLARA_OPEN_CREATE_WALLET_EVENT, detail);
}

export function requestClaraWalletFunding(walletId, detail = {}) {
  dispatchWalletAction(CLARA_OPEN_ADD_MONEY_EVENT, {
    ...detail,
    walletId: String(walletId || ""),
  });
}
