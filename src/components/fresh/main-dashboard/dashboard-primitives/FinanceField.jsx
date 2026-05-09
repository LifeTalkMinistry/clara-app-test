export default function FinanceField({ label, children, helper }) {
  const normalizedHelper = String(helper || "")
    .replace(/^Current balance/i, "Available balance")
    .trim();

  return (
    <label className="block space-y-2.5">
      <span className="text-sm font-semibold tracking-[-0.01em] text-white/88">
        {label}
      </span>

      {children}

      {normalizedHelper ? (
        <p className="text-xs font-medium leading-5 text-white/62">
          {normalizedHelper}
        </p>
      ) : null}
    </label>
  );
}
