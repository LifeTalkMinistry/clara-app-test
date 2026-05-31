export default function FinanceField({ label, children, helper, hidden = false, className = "" }) {
  const normalizedHelper = String(helper || "")
    .replace(/^Current balance/i, "Available balance")
    .trim();
  const shouldHideHelper =
    /^Choose where this money came from\./i.test(normalizedHelper) ||
    /^Optional\. Choose an income source only/i.test(normalizedHelper);

  return (
    <label className={`${hidden ? "sr-only" : "block space-y-2.5"} ${className}`.trim()}>
      <span className="text-sm font-semibold tracking-[-0.01em] text-white/88">
        {label}
      </span>

      {children}

      {normalizedHelper && !shouldHideHelper ? (
        <p className="text-xs font-medium leading-5 text-white/62">
          {normalizedHelper}
        </p>
      ) : null}
    </label>
  );
}
