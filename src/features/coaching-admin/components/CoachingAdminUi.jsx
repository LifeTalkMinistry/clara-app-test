import { AlertTriangle, Database, X } from "lucide-react";
import { STATUS_LABELS, STATUS_STYLES } from "../constants";

export const panelClass =
  "rounded-[26px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(7,24,45,0.90),rgba(9,17,37,0.92))] shadow-[0_24px_70px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl";

export function StatusBadge({ status, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.10em] ${
        STATUS_STYLES[status] || STATUS_STYLES.declined
      } ${className}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function MockModeBadge() {
  return (
    <div
      title="Using local demonstration data. Supabase is not connected yet."
      className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.10] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100"
    >
      <Database className="h-3.5 w-3.5" />
      Mock Mode
    </div>
  );
}

export function AdminButton({
  children,
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}) {
  const variants = {
    primary:
      "border-cyan-200/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.86),rgba(99,102,241,0.92))] text-white shadow-[0_14px_30px_rgba(37,99,235,0.20)] hover:brightness-110",
    secondary:
      "border-white/[0.09] bg-white/[0.055] text-white/80 hover:bg-white/[0.09] hover:text-white",
    danger:
      "border-rose-300/20 bg-rose-300/[0.09] text-rose-100 hover:bg-rose-300/[0.14]",
    success:
      "border-emerald-300/20 bg-emerald-300/[0.10] text-emerald-100 hover:bg-emerald-300/[0.15]",
    ghost: "border-transparent bg-transparent text-white/60 hover:bg-white/[0.05] hover:text-white",
  };

  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[15px] border px-3.5 text-[10px] font-black uppercase tracking-[0.09em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/55">
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-[15px] border border-white/[0.09] bg-black/[0.16] px-3.5 text-[12px] font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/30 focus:bg-white/[0.04]";

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  onConfirm,
  onClose,
  busy = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coaching-confirm-title"
        className={`${panelClass} relative w-full max-w-md p-5 sm:p-6`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
          aria-label="Close confirmation"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-amber-300/20 bg-amber-300/[0.10] text-amber-100">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 id="coaching-confirm-title" className="mt-4 text-xl font-black text-white">
          {title}
        </h2>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-300/70">
          {description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <AdminButton onClick={onClose} disabled={busy}>
            Keep current
          </AdminButton>
          <AdminButton variant={tone} onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
