import { X, Wallet, CalendarDays, Tag, FileText, CheckCircle2 } from "lucide-react";

const DEFAULT_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "shopping",
  "health",
  "education",
  "personal",
  "other",
];

const normalizeString = (value) => String(value ?? "").trim();

const formatCategoryLabel = (value) => {
  const normalized = normalizeString(value || "other");
  return normalized
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function ManualExpenseFullScreenSheet({
  open = false,
  form = {},
  wallets = [],
  categories = DEFAULT_CATEGORIES,
  loading = false,
  saving = false,
  error = "",
  title = "Log expense",
  subtitle = "Record a spending decision and keep CLARA updated.",
  submitLabel = "Save expense",
  cancelLabel = "Cancel",
  onClose,
  onSubmit,
  onChange,
}) {
  if (!open) return null;

  const safeWallets = Array.isArray(wallets) ? wallets.filter(Boolean) : [];
  const safeCategories = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES;
  const isBusy = loading || saving;

  const updateField = (field, value) => {
    if (typeof onChange === "function") {
      onChange(field, value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isBusy) return;
    if (typeof onSubmit === "function") {
      onSubmit(event);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex min-h-dvh flex-col bg-[#050912]/96 text-white backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="relative flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/70">
            Manual entry
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-white">{title}</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/75 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition hover:bg-white/[0.1] hover:text-white"
          aria-label="Close manual expense sheet"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto w-full max-w-md space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{subtitle}</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Choose the wallet, category, date, and amount. Sensitive finance writes still stay controlled by the parent Dashboard logic.
                  </p>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                {error}
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Amount</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.08]"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                <Wallet className="h-3.5 w-3.5" /> Wallet
              </span>
              <select
                value={form.wallet_id ?? form.walletId ?? ""}
                onChange={(event) => updateField("wallet_id", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1420] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
              >
                <option value="">Select wallet</option>
                {safeWallets.map((wallet) => {
                  const id = wallet?.id || wallet?.wallet_id || wallet?.name;
                  const name = wallet?.name || wallet?.wallet_name || wallet?.title || "Wallet";
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                <Tag className="h-3.5 w-3.5" /> Category
              </span>
              <select
                value={form.category ?? "other"}
                onChange={(event) => updateField("category", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1420] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40"
              >
                {safeCategories.map((category) => (
                  <option key={category} value={category}>
                    {formatCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                <CalendarDays className="h-3.5 w-3.5" /> Date
              </span>
              <input
                type="date"
                value={form.date ?? ""}
                onChange={(event) => updateField("date", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.08]"
              />
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                <FileText className="h-3.5 w-3.5" /> Note
              </span>
              <textarea
                value={form.note ?? form.description ?? ""}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Optional note"
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.08]"
              />
            </label>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-[#050912]/92 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-2xl">
          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.09] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_14px_34px_rgba(16,185,129,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
