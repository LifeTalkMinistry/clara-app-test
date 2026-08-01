const INSTALL_FLAG = "__claraLocalFinanceSyncGuardInstalled";
const FINANCE_DB_NAME = "clara_local_finance";
const FINANCE_UPDATED_EVENT = "clara-local-finance-updated";
const WRITE_METHODS = ["add", "put", "delete", "clear"];
const trackedTransactions = new WeakSet();
const transactionChanges = new WeakMap();

function dispatchFinanceUpdated(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FINANCE_UPDATED_EVENT, {
      detail: {
        source: "local_indexeddb_guard",
        ...detail,
      },
    })
  );
}

function getTransactionChanges(transaction) {
  if (!transaction) return null;

  if (!trackedTransactions.has(transaction)) {
    trackedTransactions.add(transaction);
    transactionChanges.set(transaction, []);
    transaction.addEventListener(
      "complete",
      () => {
        const changes = transactionChanges.get(transaction) || [];
        dispatchFinanceUpdated({ changes: [...changes] });
        transactionChanges.delete(transaction);
      },
      { once: true }
    );
    transaction.addEventListener(
      "abort",
      () => transactionChanges.delete(transaction),
      { once: true }
    );
  }

  return transactionChanges.get(transaction) || null;
}

export function installLocalFinanceSyncGuard() {
  if (
    typeof window === "undefined" ||
    typeof IDBObjectStore === "undefined" ||
    window[INSTALL_FLAG]
  ) {
    return;
  }

  window[INSTALL_FLAG] = true;
  const prototype = IDBObjectStore.prototype;

  WRITE_METHODS.forEach((methodName) => {
    const original = prototype[methodName];
    if (typeof original !== "function" || original.__claraSyncWrapped) return;

    const wrapped = function claraTrackedIndexedDbWrite(...args) {
      const transaction = this?.transaction;
      const databaseName = transaction?.db?.name || "";

      if (databaseName === FINANCE_DB_NAME) {
        getTransactionChanges(transaction)?.push({
          storeName: this?.name || null,
          operation: methodName,
        });
      }

      return original.apply(this, args);
    };

    wrapped.__claraSyncWrapped = true;
    wrapped.__claraSyncOriginal = original;

    try {
      prototype[methodName] = wrapped;
    } catch {
      // Some embedded WebViews may expose a non-writable prototype. CLARA keeps
      // running and falls back to the explicit feature events and foreground sync.
    }
  });
}

installLocalFinanceSyncGuard();
