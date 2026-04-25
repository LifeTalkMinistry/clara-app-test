export const TRANSACTIONS_ROUTE = "/expenses";

export function openTransactions(navigate, options = {}) {
  if (typeof navigate !== "function") return;
  navigate(TRANSACTIONS_ROUTE, {
    state: {
      from: "dashboard",
      ...options,
    },
  });
}
