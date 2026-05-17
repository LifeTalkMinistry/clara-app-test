const PHP_CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

const WALLET_HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const fmt = (value) =>
  PHP_CURRENCY_FORMATTER.format(Number(value || 0));

export const formatHistoryDate = (value) => {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return WALLET_HISTORY_DATE_FORMATTER.format(date);
};
