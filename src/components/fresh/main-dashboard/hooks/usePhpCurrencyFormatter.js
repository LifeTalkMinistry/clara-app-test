const PHP_CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

export const formatPhpCurrency = (value) =>
  PHP_CURRENCY_FORMATTER.format(Number(value || 0));

export default function usePhpCurrencyFormatter() {
  return formatPhpCurrency;
}
