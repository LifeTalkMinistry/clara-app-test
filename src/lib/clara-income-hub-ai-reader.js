const INCOME_READER_LOG_PREFIX = "[CLARA Income Hub AI Reader]";

const DAY_MS = 24 * 60 * 60 * 1000;
const INCOME_TYPES = new Set(["income", "add", "cash_in", "cash in", "deposit", "opening_balance", "opening balance", "credit", "salary", "payday"]);
const TRANSFER_TYPES = new Set(["transfer", "transfer_in", "transfer_out", "transfer in", "transfer out"]);

function isDevLoggingEnabled() {
  return Boolean(import.meta?.env?.DEV || import.meta?.env?.VITE_CLARA_DEBUG_AI === "true");
}

export function logIncomeHubAiReader(message, payload) {
  if (!isDevLoggingEnabled()) return;
  if (payload !== undefined) console.info(INCOME_READER_LOG_PREFIX, message, payload);
  else console.info(INCOME_READER_LOG_PREFIX, message);
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
  return String(value || "Income")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseFirestoreTimestamp(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  const seconds = value.seconds ?? value._seconds;
  const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
  if (Number.isFinite(Number(seconds))) {
    const date = new Date(Number(seconds) * 1000 + Math.floor(Number(nanoseconds || 0) / 1000000));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function dateFromParts(year, month, day, hour = 12, minute = 0, second = 0) {
  const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDate(value, fallback = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value);
  const firestoreDate = parseFirestoreTimestamp(value);
  if (firestoreDate) return firestoreDate;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value < 10000000000 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
  }
  if (!hasValue(value)) return fallback instanceof Date ? new Date(fallback) : new Date();
  const text = String(value || "").trim().replace(/\bat\b/i, " ").replace(/\s+/g, " ");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return dateFromParts(year, month, day) || new Date(fallback);
  }
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) {
    const [year, month, day] = text.split("/").map(Number);
    return dateFromParts(year, month, day) || new Date(fallback);
  }
  const isoDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoDateTime) {
    const [, year, month, day, hour, minute, second = 0] = isoDateTime;
    const localDate = dateFromParts(year, month, day, hour, minute, second);
    if (localDate) return localDate;
  }
  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (slashDate) {
    const [, month, day, yearRaw, hour = 12, minute = 0, second = 0] = slashDate;
    const year = String(yearRaw).length === 2 ? `20${yearRaw}` : yearRaw;
    const localDate = dateFromParts(year, month, day, hour, minute, second);
    if (localDate) return localDate;
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
  return Boolean(item?.deletedAt || item?.deleted_at || item?.isDeleted || item?.is_deleted || normalizeText(item?.status) === "deleted");
}

function getWalletId(wallet) {
  return String(wallet?.id || wallet?.local_id || wallet?.localId || wallet?.wallet_id || wallet?.walletId || "").trim();
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

function getIncomeDate(raw) {
  const candidates = [
    raw?.transaction_date, raw?.transactionDate, raw?.transaction_at, raw?.transactionAt,
    raw?.received_at, raw?.receivedAt, raw?.income_date, raw?.incomeDate,
    raw?.lastActivityAt, raw?.last_activity_at, raw?.paid_at, raw?.paidAt,
    raw?.posted_at, raw?.postedAt, raw?.logged_at, raw?.loggedAt,
    raw?.created_at, raw?.createdAt, raw?.date, raw?.datetime, raw?.dateTime,
    raw?.timestamp, raw?.time, raw?.updated_at, raw?.updatedAt,
    raw?.metadata?.transaction_date, raw?.metadata?.transactionDate, raw?.metadata?.received_at,
    raw?.metadata?.date, raw?.raw?.transaction_date, raw?.raw?.transactionDate,
    raw?.raw?.received_at, raw?.raw?.date,
  ];
  return candidates.find((candidate) => hasValue(candidate) || candidate instanceof Date || typeof candidate === "number") || new Date();
}

function isIncomeLike(item = {}) {
  const type = normalizeText(item.type || item.source_type || item.sourceType || item.kind || item.category || item.recordType);
  const title = normalizeText(item.title || item.name || item.sourceName || item.incomeSourceName || item.note || item.description);
  return INCOME_TYPES.has(type) || type.includes("income") || type.includes("salary") || type.includes("deposit") || type.includes("credit") || type.includes("cash in") || title.includes("salary") || title.includes("income") || title.includes("payday");
}

function getIncomeSourceName(item = {}) {
  return String(item.incomeSourceName || item.income_source_name || item.sourceName || item.source_name || item.employer || item.company || item.payor || item.payer || item.name || item.title || item.merchant || item.category || item.note || item.description || item.type || "Income").trim();
}

function normalizeIncomeSourceRoot(source = {}, walletMap = new Map(), index = 0) {
  const parsedDate = parseDate(source.lastActivityAt || source.last_activity_at || source.updatedAt || source.updated_at || source.createdAt || source.created_at || new Date());
  const amount = Math.abs(cleanNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in ?? source.currentBalance ?? source.current_balance ?? source.balance));
  const wallet = getWalletByAnyId(walletMap, source, ["wallet_id", "walletId", "destination_wallet_id", "destinationWalletId", "to_wallet_id", "toWalletId", "linkedWalletId", "linked_wallet_id"]);
  const walletName = source.walletName || source.wallet_name || source.destinationWalletName || source.destination_wallet_name || source.linkedWalletName || source.linked_wallet_name || getWalletName(wallet);
  const dateKey = toDateKey(parsedDate);
  const incomeSourceName = source.name || source.title || source.category || "Income Source";

  return {
    id: String(source.id || `income_source_root:${dateKey}:${incomeSourceName}:${index}`),
    source: "income_source_root",
    incomeSourceName: titleCase(incomeSourceName),
    title: titleCase(incomeSourceName),
    amount,
    date: parsedDate.toISOString(),
    dateKey,
    monthKey: toMonthKey(parsedDate),
    walletId: String(source.wallet_id || source.walletId || getWalletId(wallet) || ""),
    walletName: String(walletName || "").trim(),
    destinationWalletName: String(walletName || "").trim(),
    note: String(source.notes || source.description || "").trim(),
    type: source.category || source.type || "income_source",
    isSourceRoot: true,
    currentBalance: cleanNumber(source.currentBalance ?? source.current_balance ?? source.balance),
    totalMoneyIn: cleanNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in),
    totalMoneyOut: cleanNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out),
    raw: source,
  };
}

function normalizeIncomeRecord(item = {}, source = "income", walletMap = new Map(), index = 0) {
  const parsedDate = parseDate(getIncomeDate(item));
  const wallet = getWalletByAnyId(walletMap, item, ["wallet_id", "walletId", "destination_wallet_id", "destinationWalletId", "to_wallet_id", "toWalletId", "account_id", "accountId"]);
  const walletName = item.walletName || item.wallet_name || item.destinationWalletName || item.destination_wallet_name || item.toWalletName || item.to_wallet_name || getWalletName(wallet);
  const walletId = item.wallet_id || item.walletId || item.destination_wallet_id || item.destinationWalletId || item.to_wallet_id || item.toWalletId || getWalletId(wallet);
  const incomeSourceName = getIncomeSourceName(item);
  const amount = Math.abs(cleanNumber(item.amount || item.value || item.total || item.incomeAmount || item.income_amount));
  const dateKey = toDateKey(parsedDate);
  const id = String(item.id || item.local_id || item.localId || item.transaction_id || item.transactionId || item.wallet_transaction_id || item.walletTransactionId || `${source}:${dateKey}:${amount}:${incomeSourceName}:${index}`);
  return {
    id,
    source,
    incomeSourceName: titleCase(incomeSourceName),
    title: titleCase(item.title || item.name || incomeSourceName || "Income"),
    amount,
    date: parsedDate.toISOString(),
    dateKey,
    monthKey: toMonthKey(parsedDate),
    walletId: String(walletId || ""),
    walletName: String(walletName || "").trim(),
    destinationWalletName: String(walletName || "").trim(),
    note: String(item.note || item.notes || item.description || item.memo || "").trim(),
    type: item.type || item.source_type || item.sourceType || "income",
    isSourceRoot: false,
    raw: item,
  };
}

function normalizeFromTransactionHub(transactionHubSnapshot = {}) {
  return safeArray(transactionHubSnapshot?.incomeTransactions).map((item) => ({
    id: item.id,
    source: "transaction_hub",
    incomeSourceName: titleCase(item.title || item.category || "Income"),
    title: titleCase(item.title || item.category || "Income"),
    amount: Math.abs(cleanNumber(item.amount || item.signedAmount)),
    date: item.date,
    dateKey: item.dateKey,
    monthKey: item.monthKey,
    walletId: item.raw?.wallet_id || item.raw?.walletId || "",
    walletName: item.walletName || "",
    destinationWalletName: item.walletName || "",
    note: item.note || "",
    type: item.type || "income",
    isSourceRoot: false,
    raw: item.raw || item,
  }));
}

function getTransferDate(raw) {
  return raw?.transaction_date || raw?.transactionDate || raw?.created_at || raw?.createdAt || raw?.date || raw?.updated_at || raw?.updatedAt || new Date();
}

function isTransferLike(item = {}) {
  const type = normalizeText(item.type || item.source_type || item.sourceType || item.kind);
  return TRANSFER_TYPES.has(type) || type.includes("transfer") || hasValue(item.from_wallet_id) || hasValue(item.to_wallet_id) || hasValue(item.fromWalletId) || hasValue(item.toWalletId);
}

function normalizeTransfer(item = {}, walletMap = new Map(), index = 0) {
  const parsedDate = parseDate(getTransferDate(item));
  const fromWallet = getWalletByAnyId(walletMap, item, ["from_wallet_id", "fromWalletId", "source_wallet_id", "sourceWalletId"]);
  const toWallet = getWalletByAnyId(walletMap, item, ["to_wallet_id", "toWalletId", "destination_wallet_id", "destinationWalletId", "wallet_id", "walletId"]);
  return {
    id: String(item.id || item.transfer_id || item.transferId || `transfer:${parsedDate.getTime()}:${index}`),
    amount: Math.abs(cleanNumber(item.amount || item.value || item.total)),
    date: parsedDate.toISOString(),
    dateKey: toDateKey(parsedDate),
    fromWalletName: item.fromWalletName || item.from_wallet_name || getWalletName(fromWallet),
    toWalletName: item.toWalletName || item.to_wallet_name || item.destinationWalletName || item.destination_wallet_name || getWalletName(toWallet),
    raw: item,
  };
}

function dedupeById(records = []) {
  const seen = new Set();
  return records.filter((record, index) => {
    const key = record.id || `${record.source}:${record.dateKey}:${record.amount}:${record.incomeSourceName}:${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterByDateKey(records = [], key) {
  return records.filter((item) => item.dateKey === key || toDateKey(item.date) === key);
}

function filterFromDate(records = [], start, end = new Date()) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return records.filter((item) => {
    const time = parseDate(item.date).getTime();
    return time >= startTime && time <= endTime;
  });
}

function sumAmount(records = []) {
  return safeArray(records).reduce((sum, item) => sum + Math.abs(cleanNumber(item.amount)), 0);
}

function groupByText(records = [], keyGetter) {
  const map = new Map();
  records.forEach((record) => {
    const key = String(keyGetter(record) || "Unknown").trim() || "Unknown";
    const current = map.get(key) || { name: key, count: 0, total: 0, records: [] };
    current.count += 1;
    current.total += Math.abs(cleanNumber(record.amount));
    current.records.push(record);
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => b.total - a.total || b.count - a.count);
}

function findPossibleRelatedTransfers(incomes = [], transfers = []) {
  return safeArray(incomes).flatMap((income) => {
    const incomeTime = parseDate(income.date).getTime();
    const walletName = normalizeText(income.walletName || income.destinationWalletName);
    const amount = Math.abs(cleanNumber(income.amount));
    return safeArray(transfers).filter((transfer) => {
      const transferAmount = Math.abs(cleanNumber(transfer.amount));
      const transferTime = parseDate(transfer.date).getTime();
      const hoursApart = Math.abs(transferTime - incomeTime) / (60 * 60 * 1000);
      const fromWallet = normalizeText(transfer.fromWalletName);
      const toWallet = normalizeText(transfer.toWalletName);
      const amountClose = amount > 0 && transferAmount > 0 && Math.abs(transferAmount - amount) <= Math.max(1, amount * 0.02);
      const walletRelated = walletName && (fromWallet.includes(walletName) || walletName.includes(fromWallet) || toWallet.includes(walletName) || walletName.includes(toWallet));
      return amountClose && (hoursApart <= 72 || walletRelated);
    }).map((transfer) => ({ income, transfer }));
  }).slice(0, 20);
}

function buildSummary({ latestIncome, thisMonthIncome, thisWeekIncome, todayIncome, incomeBySource, incomeByWallet }) {
  const topIncomeSource = incomeBySource[0] || null;
  const mostUsedWallet = [...incomeByWallet].sort((a, b) => b.count - a.count || b.total - a.total)[0] || null;
  return {
    latestIncomeSource: latestIncome?.incomeSourceName || "No latest income",
    latestIncomeAmount: latestIncome?.amount || 0,
    latestDestinationWallet: latestIncome?.destinationWalletName || latestIncome?.walletName || "No wallet shown",
    totalIncomeThisMonth: sumAmount(thisMonthIncome),
    totalIncomeThisWeek: sumAmount(thisWeekIncome),
    totalIncomeToday: sumAmount(todayIncome),
    numberOfIncomeSources: incomeBySource.length,
    topIncomeSource: topIncomeSource?.name || "No income source",
    mostUsedReceivingWallet: mostUsedWallet?.name || "No receiving wallet",
  };
}

export function filterIncomeHubRecords(records = [], filters = {}) {
  let output = safeArray(records);
  const now = filters.now ? parseDate(filters.now) : new Date();
  if (filters.today) output = filterByDateKey(output, toDateKey(now));
  if (filters.yesterday) output = filterByDateKey(output, toDateKey(new Date(startOfDay(now).getTime() - DAY_MS)));
  if (filters.thisWeek) output = filterFromDate(output, startOfWeek(now), endOfDay(now));
  if (filters.thisMonth) output = filterFromDate(output, startOfMonth(now), endOfDay(now));
  if (filters.sourceText) {
    const target = normalizeText(filters.sourceText);
    output = output.filter((item) => normalizeText(item.incomeSourceName).includes(target) || normalizeText(item.title).includes(target) || normalizeText(item.note).includes(target));
  }
  if (filters.walletText) {
    const target = normalizeText(filters.walletText);
    output = output.filter((item) => normalizeText(item.walletName).includes(target) || normalizeText(item.destinationWalletName).includes(target));
  }
  return filters.latest ? output.slice(0, 1) : output;
}

export function buildIncomeHubAiSnapshot(context = {}) {
  const connected = Boolean(Array.isArray(context.incomes) || Array.isArray(context.incomeSources) || Array.isArray(context.walletTransactions) || Array.isArray(context.wallets) || Array.isArray(context.transfers) || context.transactionHubSnapshot);
  if (!connected) {
    const emptySummary = buildSummary({ latestIncome: null, thisMonthIncome: [], thisWeekIncome: [], todayIncome: [], incomeBySource: [], incomeByWallet: [] });
    return { connected: false, totalIncomeRecords: 0, latestIncome: null, todayIncome: [], yesterdayIncome: [], thisWeekIncome: [], thisMonthIncome: [], incomeSources: [], incomeBySource: [], incomeByWallet: [], totalIncomeThisMonth: 0, totalIncomeThisWeek: 0, totalIncomeToday: 0, possibleRelatedTransfers: [], summary: emptySummary, sourceRoots: [], generatedAt: new Date().toISOString() };
  }

  const walletMap = buildWalletMap(context.wallets);
  const sourceRootRecords = safeArray(context.incomeSources).filter((item) => !isDeletedRecord(item)).map((item, index) => normalizeIncomeSourceRoot(item, walletMap, index));
  const sourceNames = new Set(sourceRootRecords.map((item) => normalizeText(item.incomeSourceName)));
  const explicitIncomes = safeArray(context.incomes).filter((item) => !isDeletedRecord(item)).filter((item) => isIncomeLike(item)).map((item, index) => normalizeIncomeRecord(item, "income", walletMap, index));
  const walletIncomes = safeArray(context.walletTransactions).filter((item) => !isDeletedRecord(item)).filter((item) => isIncomeLike(item)).map((item, index) => normalizeIncomeRecord(item, "wallet_transaction", walletMap, index));
  const hubIncomes = normalizeFromTransactionHub(context.transactionHubSnapshot);

  const movementRecords = dedupeById([...explicitIncomes, ...walletIncomes, ...hubIncomes]).filter((item) => item.amount > 0);
  const filteredMovementRecords = sourceRootRecords.length
    ? movementRecords.filter((item) => !sourceNames.has(normalizeText(item.incomeSourceName)) || item.source !== "transaction_hub")
    : movementRecords;

  const incomeRecords = dedupeById([...sourceRootRecords, ...filteredMovementRecords]).filter((item) => item.amount > 0).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  const transferRecords = safeArray(context.transfers).filter((item) => !isDeletedRecord(item)).filter((item) => isTransferLike(item)).map((item, index) => normalizeTransfer(item, walletMap, index));
  const walletTransferRecords = safeArray(context.walletTransactions).filter((item) => !isDeletedRecord(item)).filter((item) => isTransferLike(item)).map((item, index) => normalizeTransfer(item, walletMap, index));
  const transfers = dedupeById([...transferRecords, ...walletTransferRecords]);
  const now = new Date();
  const todayIncome = filterIncomeHubRecords(incomeRecords, { today: true, now });
  const yesterdayIncome = filterIncomeHubRecords(incomeRecords, { yesterday: true, now });
  const thisWeekIncome = filterIncomeHubRecords(incomeRecords, { thisWeek: true, now });
  const thisMonthIncome = filterIncomeHubRecords(incomeRecords, { thisMonth: true, now });
  const incomeBySource = groupByText(incomeRecords, (item) => item.incomeSourceName || item.title);
  const incomeByWallet = groupByText(incomeRecords, (item) => item.destinationWalletName || item.walletName || "No wallet shown");
  const possibleRelatedTransfers = findPossibleRelatedTransfers(incomeRecords, transfers);
  const latestIncome = sourceRootRecords[0] || incomeRecords[0] || null;
  const summary = buildSummary({ latestIncome, thisMonthIncome, thisWeekIncome, todayIncome, incomeBySource, incomeByWallet });
  const snapshot = { connected: true, totalIncomeRecords: incomeRecords.length, latestIncome, todayIncome, yesterdayIncome, thisWeekIncome, thisMonthIncome, incomeSources: incomeBySource.map((source) => source.name), incomeBySource, incomeByWallet, totalIncomeThisMonth: summary.totalIncomeThisMonth, totalIncomeThisWeek: summary.totalIncomeThisWeek, totalIncomeToday: summary.totalIncomeToday, possibleRelatedTransfers, summary, sourceRoots: sourceRootRecords, timeline: incomeRecords, generatedAt: new Date().toISOString() };
  logIncomeHubAiReader("Snapshot ready", { totalIncomeRecords: snapshot.totalIncomeRecords, sourceRoots: sourceRootRecords.length, today: todayIncome.length, yesterday: yesterdayIncome.length, thisWeek: thisWeekIncome.length, thisMonth: thisMonthIncome.length, latestIncomeSource: summary.latestIncomeSource, generatedAt: snapshot.generatedAt });
  return snapshot;
}

export function summarizeIncomeRecords(records = []) {
  const safeRecords = safeArray(records);
  const incomeBySource = groupByText(safeRecords, (item) => item.incomeSourceName || item.title);
  const incomeByWallet = groupByText(safeRecords, (item) => item.destinationWalletName || item.walletName || "No wallet shown");
  return { totalIncome: sumAmount(safeRecords), incomeCount: safeRecords.length, incomeBySource, incomeByWallet, topIncomeSource: incomeBySource[0]?.name || "No income source", mostUsedReceivingWallet: incomeByWallet[0]?.name || "No receiving wallet" };
}
