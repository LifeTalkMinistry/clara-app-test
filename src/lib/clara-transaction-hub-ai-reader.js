const TRANSACTION_READER_LOG_PREFIX = "[CLARA Transaction Hub AI Reader]";

const DAY_MS = 24 * 60 * 60 * 1000;
const INCOME_GROUPS = new Set(["income"]);
const EXPENSE_GROUPS = new Set(["expense"]);
const TRANSFER_GROUPS = new Set(["transfer"]);
const SAVINGS_GROUPS = new Set(["savings"]);
const WALLET_GROUPS = new Set(["wallet"]);

function isDevLoggingEnabled() {
  return Boolean(import.meta?.env?.DEV || import.meta?.env?.VITE_CLARA_DEBUG_AI === "true");
}

export function logTransactionHubAiReader(message, payload) {
  if (!isDevLoggingEnabled()) return;
  if (payload !== undefined) console.info(TRANSACTION_READER_LOG_PREFIX, message, payload);
  else console.info(TRANSACTION_READER_LOG_PREFIX, message);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function cleanNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function titleCase(value) {
  return String(value || "Transaction")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDate(value, fallback = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (!hasValue(value)) return fallback instanceof Date ? new Date(fallback) : new Date();

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}

function toDateKey(value) {
  const d = parseDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMonthKey(value) {
  const d = parseDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function startOfDay(value) {
  const d = parseDate(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = startOfDay(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(value) {
  const d = startOfDay(value);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function startOfMonth(value) {
  const d = startOfDay(value);
  d.setDate(1);
  return d;
}

function isDeletedRecord(item) {
  return Boolean(
    item?.deletedAt ||
      item?.deleted_at ||
      item?.isDeleted ||
      item?.is_deleted ||
      normalizeText(item?.status) === "deleted"
  );
}

function firstValue(item, keys = []) {
  for (const key of keys) {
    if (hasValue(item?.[key])) return item[key];
  }
  return "";
}

function getWalletId(wallet) {
  return String(
    wallet?.id || wallet?.local_id || wallet?.localId || wallet?.wallet_id || wallet?.walletId || ""
  ).trim();
}

function getWalletName(wallet) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "").trim();
}

function buildWalletMap(wallets = []) {
  const map = new Map();

  safeArray(wallets).forEach((wallet) => {
    ["id", "local_id", "localId", "wallet_id", "walletId"].forEach((key) => {
      if (hasValue(wallet?.[key])) map.set(String(wallet[key]), wallet);
    });
  });

  return map;
}

function getWalletByAnyId(walletMap, item, keys = []) {
  for (const key of keys) {
    const value = item?.[key];
    if (hasValue(value) && walletMap.has(String(value))) return walletMap.get(String(value));
  }
  return null;
}

function getGroup(item) {
  if (item?.__activityGroup) return item.__activityGroup;

  const type = normalizeText(item?.type);
  const category = normalizeText(item?.category);
  const sourceType = normalizeText(item?.source_type || item?.sourceType);

  if (type.includes("transfer") || sourceType.includes("transfer")) return "transfer";

  if (
    type.includes("saving") ||
    category.includes("saving") ||
    sourceType.includes("saving") ||
    type.includes("emergency") ||
    category.includes("emergency") ||
    sourceType.includes("emergency")
  ) {
    return "savings";
  }

  if (
    type.includes("income") ||
    type.includes("deposit") ||
    type.includes("credit") ||
    type.includes("add") ||
    sourceType.includes("income") ||
    sourceType.includes("deposit")
  ) {
    return "income";
  }

  if (
    type.includes("expense") ||
    type.includes("debit") ||
    type.includes("cashout") ||
    type.includes("withdraw") ||
    sourceType.includes("expense")
  ) {
    return "expense";
  }

  return "wallet";
}

function isLinkedExpenseWalletTransaction(item) {
  const type = normalizeText(item?.type);
  const sourceType = normalizeText(item?.source_type || item?.sourceType);

  return (
    type === "expense" ||
    sourceType === "expense" ||
    hasValue(item?.expense_id) ||
    hasValue(item?.expenseId)
  );
}

function stableDedupeKey(item, group, source, fallback) {
  const expenseId = firstValue(item, ["expense_id", "expenseId"]);
  if (expenseId) return `expense:${expenseId}`;

  const transferId = firstValue(item, [
    "transfer_group_id",
    "transferGroupId",
    "transfer_id",
    "transferId",
  ]);
  if (transferId) return `transfer:${transferId}`;

  const savingsId = firstValue(item, [
    "savings_transaction_id",
    "savingsTransactionId",
    "savings_goal_id",
    "savingsGoalId",
  ]);
  if (savingsId) return `savings:${savingsId}`;

  const emergencyId = firstValue(item, [
    "emergency_fund_transaction_id",
    "emergencyFundTransactionId",
    "emergency_fund_id",
    "emergencyFundId",
  ]);
  if (emergencyId) return `emergency:${emergencyId}`;

  const transactionId = firstValue(item, [
    "transaction_id",
    "transactionId",
    "wallet_transaction_id",
    "walletTransactionId",
  ]);
  if (transactionId) return `${group}:transaction:${transactionId}`;

  const localId = firstValue(item, ["local_id", "localId"]);
  if (localId) return `${group}:local:${localId}`;

  const id = firstValue(item, ["id"]);
  if (id) return `${group}:${source}:id:${id}`;

  return fallback;
}

function getSignedAmountByGroup(group, amount) {
  const safeAmount = Math.abs(cleanNumber(amount));
  if (group === "expense") return -safeAmount;
  if (group === "savings") return -safeAmount;
  if (group === "income") return safeAmount;
  if (group === "transfer") return 0;
  return cleanNumber(amount);
}

function isJsonLike(value) {
  const text = String(value || "").trim();
  return (
    text.startsWith("{") ||
    text.startsWith("[") ||
    /"[\w-]+"\s*:/.test(text) ||
    /previous_balance|budget_category|wallet_id/i.test(text)
  );
}

function getBudgetCategory(budget) {
  return normalizeText(budget?.category || budget?.budget_category || budget?.name || budget?.title);
}

function getBudgetAmount(budget) {
  return cleanNumber(
    budget?.allocated_amount ||
      budget?.allocatedAmount ||
      budget?.amount ||
      budget?.limit ||
      budget?.budget ||
      budget?.target_amount ||
      budget?.targetAmount
  );
}

function getBudgetMonthKey(budget) {
  const explicitMonth =
    budget?.month ||
    budget?.month_key ||
    budget?.monthKey ||
    budget?.period ||
    budget?.budget_month ||
    budget?.budgetMonth;

  if (hasValue(explicitMonth)) {
    const text = String(explicitMonth).trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    return toMonthKey(text);
  }

  return toMonthKey(
    budget?.range_start ||
      budget?.rangeStart ||
      budget?.start_date ||
      budget?.startDate ||
      budget?.created_at ||
      budget?.createdAt ||
      new Date()
  );
}

function buildBudgetMap(budgets = []) {
  const map = new Map();

  safeArray(budgets)
    .filter((budget) => !isDeletedRecord(budget))
    .forEach((budget) => {
      const category = getBudgetCategory(budget);
      if (!category) return;

      const key = `${getBudgetMonthKey(budget)}:${category}`;
      const current = map.get(key) || { category, monthKey: getBudgetMonthKey(budget), allocated: 0 };
      current.allocated += getBudgetAmount(budget);
      map.set(key, current);
    });

  return map;
}

function getTransactionDate(raw) {
  return (
    raw?.created_at ||
    raw?.createdAt ||
    raw?.date ||
    raw?.transaction_date ||
    raw?.transactionDate ||
    raw?.paid_at ||
    raw?.paidAt ||
    raw?.logged_at ||
    raw?.loggedAt ||
    raw?.updated_at ||
    raw?.updatedAt ||
    new Date()
  );
}

function extractNestedTransactions(records = [], keys = [], source = "nested_transaction", group = "savings") {
  const output = [];

  safeArray(records).forEach((record) => {
    keys.forEach((key) => {
      const rows = safeArray(record?.[key]);
      rows.forEach((row) => {
        output.push({
          ...row,
          goalName: record?.name || record?.title || row?.goalName,
          savingsGoalId: record?.id || row?.savingsGoalId,
          __activityGroup: group,
          __activitySource: source,
        });
      });
    });
  });

  return output;
}

function buildTransferFallbacks(walletTransactions = [], transfers = []) {
  const existingTransferIds = new Set(
    safeArray(transfers)
      .filter((item) => !isDeletedRecord(item))
      .map((item) => String(firstValue(item, ["transfer_group_id", "transferGroupId", "id"]) || ""))
      .filter(Boolean)
  );

  const grouped = new Map();

  safeArray(walletTransactions)
    .filter((item) => !isDeletedRecord(item))
    .filter((item) => getGroup(item) === "transfer")
    .forEach((item, index) => {
      const groupId = String(
        firstValue(item, ["transfer_group_id", "transferGroupId", "transfer_id", "transferId"]) ||
          `fallback-transfer-${item?.created_at || item?.createdAt || item?.date || index}`
      );

      if (!grouped.has(groupId)) grouped.set(groupId, []);
      grouped.get(groupId).push(item);
    });

  return [...grouped.entries()]
    .filter(([groupId]) => !existingTransferIds.has(groupId))
    .map(([groupId, rows]) => {
      const transferOut = rows.find((item) => normalizeText(item?.type).includes("out"));
      const transferIn = rows.find((item) => normalizeText(item?.type).includes("in"));
      const anchor = transferOut || transferIn || rows[0] || {};
      const amount = Math.max(...rows.map((item) => Math.abs(cleanNumber(item?.amount))), 0);

      return {
        ...anchor,
        id: groupId,
        transfer_group_id: groupId,
        from_wallet_id:
          transferOut?.wallet_id ||
          transferOut?.walletId ||
          transferIn?.related_wallet_id ||
          transferIn?.relatedWalletId ||
          anchor?.from_wallet_id ||
          anchor?.fromWalletId ||
          "",
        to_wallet_id:
          transferIn?.wallet_id ||
          transferIn?.walletId ||
          transferOut?.related_wallet_id ||
          transferOut?.relatedWalletId ||
          anchor?.to_wallet_id ||
          anchor?.toWalletId ||
          "",
        amount,
        type: "transfer",
        created_at: anchor?.created_at || anchor?.createdAt || anchor?.date || new Date().toISOString(),
        notes: anchor?.notes || anchor?.note || "",
        __activityGroup: "transfer",
        __activitySource: "wallet_transfer_group",
        rawWalletTransactions: rows,
      };
    });
}

function normalizeTimeline(context = {}) {
  const wallets = safeArray(context.wallets);
  const expenses = safeArray(context.expenses);
  const walletTransactions = safeArray(context.walletTransactions);
  const transfers = safeArray(context.transfers);
  const budgets = safeArray(context.budgets);
  const savingsGoals = safeArray(context.savingsGoals);
  const walletMap = buildWalletMap(wallets);
  const budgetMap = buildBudgetMap(budgets);

  const savingsTransactions = [
    ...safeArray(context.savingsTransactions),
    ...safeArray(context.savingsGoalTransactions),
    ...extractNestedTransactions(savingsGoals, ["transactions", "transactionHistory", "activity", "activities"], "savings", "savings"),
  ];

  const emergencySource = context.emergencyFund || {};
  const emergencyFundTransactions = [
    ...safeArray(context.emergencyFundTransactions),
    ...safeArray(emergencySource?.transactions),
    ...safeArray(emergencySource?.transactionHistory),
    ...safeArray(emergencySource?.activity),
    ...safeArray(emergencySource?.activities),
  ];

  const transferFallbacks = buildTransferFallbacks(walletTransactions, transfers);

  const visibleSources = [
    ...expenses
      .filter((item) => !isDeletedRecord(item))
      .map((item) => ({ ...item, __activityGroup: "expense", __activitySource: "expense" })),

    ...walletTransactions
      .filter((item) => !isDeletedRecord(item))
      .filter((item) => !isLinkedExpenseWalletTransaction(item))
      .filter((item) => {
        const group = getGroup(item);
        return group === "income" || group === "savings" || group === "wallet";
      })
      .map((item) => ({ ...item, __activityGroup: getGroup(item), __activitySource: "wallet_transaction" })),

    ...transfers
      .filter((item) => !isDeletedRecord(item))
      .map((item) => ({ ...item, __activityGroup: "transfer", __activitySource: "transfer" })),

    ...transferFallbacks,

    ...savingsTransactions
      .filter((item) => !isDeletedRecord(item))
      .map((item) => ({ ...item, __activityGroup: "savings", __activitySource: item.__activitySource || "savings" })),

    ...emergencyFundTransactions
      .filter((item) => !isDeletedRecord(item))
      .map((item) => ({ ...item, __activityGroup: "savings", __activitySource: item.__activitySource || "emergency_fund" })),
  ];

  const seen = new Set();

  return visibleSources
    .map((item, index) => {
      const rawDate = getTransactionDate(item);
      const parsedDate = parseDate(rawDate);
      const group = getGroup(item);
      const source = item.__activitySource || "source";

      const wallet = getWalletByAnyId(walletMap, item, [
        "wallet_id",
        "walletId",
        "from_wallet_id",
        "fromWalletId",
        "to_wallet_id",
        "toWalletId",
        "source_wallet_id",
        "sourceWalletId",
        "destination_wallet_id",
        "destinationWalletId",
      ]);

      const fromWallet = getWalletByAnyId(walletMap, item, [
        "from_wallet_id",
        "fromWalletId",
        "source_wallet_id",
        "sourceWalletId",
      ]);

      const toWallet = getWalletByAnyId(walletMap, item, [
        "to_wallet_id",
        "toWalletId",
        "destination_wallet_id",
        "destinationWalletId",
        "related_wallet_id",
        "relatedWalletId",
      ]);

      const amount = Math.abs(cleanNumber(item.amount || item.value || item.total));
      const signedAmount = getSignedAmountByGroup(group, amount);
      const fallbackKey = `${group}:${source}:${toMonthKey(parsedDate)}:${parsedDate.getTime()}:${amount}:${item.category || item.type || index}`;
      const dedupeKey = stableDedupeKey(item, group, source, fallbackKey);

      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);

      const dateKey = toDateKey(parsedDate);
      const transactionMonthKey = toMonthKey(parsedDate);
      const normalizedCategory = normalizeText(item.category || item.budget_category || item.budgetCategory || item.tag || "");
      const budget = budgetMap.get(`${transactionMonthKey}:${normalizedCategory}`);
      const budgetStatus = group === "expense" ? (budget?.allocated > 0 ? "planned" : "unplanned") : "not_applicable";
      const note = item.notes || item.note || item.description || item.memo || "";
      const fromWalletName = getWalletName(fromWallet);
      const toWalletName = getWalletName(toWallet);
      const transferWalletLabel = group === "transfer" && (fromWalletName || toWalletName)
        ? `${fromWalletName || "Wallet"} → ${toWalletName || "Wallet"}`
        : "";

      return {
        id: dedupeKey,
        source,
        group,
        type: item.type || item.source_type || item.sourceType || group,
        title: titleCase(
          item.title ||
            item.name ||
            item.merchant ||
            item.payee ||
            item.goalName ||
            item.category ||
            item.source_type ||
            item.sourceType ||
            item.type ||
            group
        ),
        category: item.category || item.budget_category || item.budgetCategory || item.tag || "",
        walletName: transferWalletLabel || getWalletName(wallet),
        fromWalletName,
        toWalletName,
        amount,
        signedAmount,
        date: parsedDate.toISOString(),
        dateKey,
        monthKey: transactionMonthKey,
        note: isJsonLike(note) ? "" : String(note || "").trim(),
        budgetStatus,
        raw: item,
      };
    })
    .filter(Boolean)
    .sort((left, right) => parseDate(right.date).getTime() - parseDate(left.date).getTime());
}

function getConnectedState(context = {}) {
  return Boolean(
    Array.isArray(context.expenses) ||
      Array.isArray(context.walletTransactions) ||
      Array.isArray(context.transfers) ||
      Array.isArray(context.wallets) ||
      Array.isArray(context.budgets) ||
      Array.isArray(context.savingsGoals) ||
      Array.isArray(context.savingsTransactions) ||
      Array.isArray(context.emergencyFundTransactions) ||
      context.emergencyFund !== undefined
  );
}

function filterByDateKey(timeline, key) {
  return timeline.filter((item) => item.dateKey === key);
}

function filterFromDate(timeline, start, end = new Date()) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return timeline.filter((item) => {
    const time = parseDate(item.date).getTime();
    return time >= startTime && time <= endTime;
  });
}

function sumByGroup(records, groups) {
  return records
    .filter((item) => groups.has(item.group))
    .reduce((sum, item) => sum + Math.abs(cleanNumber(item.amount || item.signedAmount)), 0);
}

function buildSummary(timeline = []) {
  const moneyIn = sumByGroup(timeline, INCOME_GROUPS);
  const moneyOut = sumByGroup(timeline, EXPENSE_GROUPS) + sumByGroup(timeline, SAVINGS_GROUPS);
  const plannedExpenseCount = timeline.filter((item) => item.group === "expense" && item.budgetStatus === "planned").length;
  const unplannedExpenseCount = timeline.filter((item) => item.group === "expense" && item.budgetStatus === "unplanned").length;
  const transferCount = timeline.filter((item) => item.group === "transfer").length;
  const latestTransaction = timeline[0] || null;

  return {
    totalMoneyIn: moneyIn,
    totalMoneyOut: moneyOut,
    netFlow: moneyIn - moneyOut,
    transactionCount: timeline.length,
    plannedExpenseCount,
    unplannedExpenseCount,
    transferCount,
    latestTransactionLabel: latestTransaction
      ? `${latestTransaction.title} · ${latestTransaction.group} · ${latestTransaction.dateKey}`
      : "No latest transaction",
  };
}

export function filterTransactionHubTimeline(timeline = [], filters = {}) {
  let records = safeArray(timeline);
  const now = filters.now ? parseDate(filters.now) : new Date();

  if (filters.today) records = filterByDateKey(records, toDateKey(now));
  if (filters.yesterday) records = filterByDateKey(records, toDateKey(new Date(startOfDay(now).getTime() - DAY_MS)));
  if (filters.thisWeek) records = filterFromDate(records, startOfWeek(now), endOfDay(now));
  if (filters.thisMonth) records = filterFromDate(records, startOfMonth(now), endOfDay(now));
  if (filters.income) records = records.filter((item) => INCOME_GROUPS.has(item.group));
  if (filters.expense) records = records.filter((item) => EXPENSE_GROUPS.has(item.group));
  if (filters.transfer) records = records.filter((item) => TRANSFER_GROUPS.has(item.group));
  if (filters.savings) records = records.filter((item) => SAVINGS_GROUPS.has(item.group));
  if (filters.wallet) records = records.filter((item) => WALLET_GROUPS.has(item.group));
  if (filters.emergencyFund) records = records.filter((item) => item.source === "emergency_fund" || normalizeText(item.title).includes("emergency") || normalizeText(item.category).includes("emergency"));

  return filters.latest ? records.slice(0, 1) : records;
}

export function buildTransactionHubAiSnapshot(context = {}) {
  const connected = getConnectedState(context);

  if (!connected) {
    return {
      connected: false,
      totalTransactions: 0,
      latestTransaction: null,
      todayTransactions: [],
      yesterdayTransactions: [],
      thisWeekTransactions: [],
      thisMonthTransactions: [],
      incomeTransactions: [],
      expenseTransactions: [],
      transferTransactions: [],
      timeline: [],
      summary: buildSummary([]),
      generatedAt: new Date().toISOString(),
    };
  }

  const timeline = normalizeTimeline(context);
  const now = new Date();
  const todayTransactions = filterTransactionHubTimeline(timeline, { today: true, now });
  const yesterdayTransactions = filterTransactionHubTimeline(timeline, { yesterday: true, now });
  const thisWeekTransactions = filterTransactionHubTimeline(timeline, { thisWeek: true, now });
  const thisMonthTransactions = filterTransactionHubTimeline(timeline, { thisMonth: true, now });
  const incomeTransactions = filterTransactionHubTimeline(timeline, { income: true });
  const expenseTransactions = filterTransactionHubTimeline(timeline, { expense: true });
  const transferTransactions = filterTransactionHubTimeline(timeline, { transfer: true });
  const summary = buildSummary(timeline);

  const snapshot = {
    connected: true,
    totalTransactions: timeline.length,
    latestTransaction: timeline[0] || null,
    todayTransactions,
    yesterdayTransactions,
    thisWeekTransactions,
    thisMonthTransactions,
    incomeTransactions,
    expenseTransactions,
    transferTransactions,
    timeline,
    summary,
    generatedAt: new Date().toISOString(),
  };

  logTransactionHubAiReader("Snapshot ready", {
    totalTransactions: snapshot.totalTransactions,
    generatedAt: snapshot.generatedAt,
  });

  return snapshot;
}

export function summarizeTransactionRecords(records = []) {
  const safeRecords = safeArray(records);
  return {
    totalMoneyIn: sumByGroup(safeRecords, INCOME_GROUPS),
    totalMoneyOut: sumByGroup(safeRecords, EXPENSE_GROUPS) + sumByGroup(safeRecords, SAVINGS_GROUPS),
    netFlow: sumByGroup(safeRecords, INCOME_GROUPS) - (sumByGroup(safeRecords, EXPENSE_GROUPS) + sumByGroup(safeRecords, SAVINGS_GROUPS)),
    transactionCount: safeRecords.length,
    plannedExpenseCount: safeRecords.filter((item) => item.group === "expense" && item.budgetStatus === "planned").length,
    unplannedExpenseCount: safeRecords.filter((item) => item.group === "expense" && item.budgetStatus === "unplanned").length,
    transferCount: safeRecords.filter((item) => item.group === "transfer").length,
  };
}
