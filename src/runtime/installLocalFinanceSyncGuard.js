const INSTALL_FLAG = "__claraLocalFinanceSyncGuardInstalled";
const FINANCE_DB_NAME = "clara_local_finance";
const FINANCE_UPDATED_EVENT = "clara-local-finance-updated";
const WRITE_METHODS = ["add", "put", "delete", "clear"];

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

function installTransactionCompletionNotice(transaction, detail) {
  if (!transaction || transaction.__claraSyncNoticeInstalled) return;
  transaction.__claraSyncNoticeInstalled = true;
  const changes = [];
  transaction.__claraSyncChanges = changes;

  transaction.addEventListener(
    "complete",
    () => {
      dispatchFinanceUpdated({ changes: [...changes] });
    },
    { once: true }
  );
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
        installTransactionCompletionNotice(transaction);
        transaction.__claraSyncChanges?.push({
          storeName: this?.name || null,
          operation: methodName,
        });
      }

      return original.apply(this, args);
    };

    wrapped.__claraSyncWrapped = true;
    wrapped.__claraSyncOriginal = original;
    prototype[methodName] = wrapped;
  });
}

installLocalFinanceSyncGuard();
