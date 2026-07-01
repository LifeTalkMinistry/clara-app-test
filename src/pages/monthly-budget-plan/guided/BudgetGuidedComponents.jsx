import { Edit3, Lock, Trash2 } from "lucide-react";
import { BALANCE_EPSILON, fmt } from "./budgetGuidedUtils";

export function QuestionHeader({ icon: Icon, eyebrow, title, body }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_12px_28px_rgba(34,211,238,0.1)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/45">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black leading-tight tracking-[-0.035em]">{title}</h2>
        {body ? <p className="mt-2 text-sm font-semibold leading-6 text-white/52">{body}</p> : null}
      </div>
    </div>
  );
}

export function CompactAllocationStatus({ allocated, categoryCount, rawBalance }) {
  const over = rawBalance < -BALANCE_EPSILON;
  const balanceText = over ? `${fmt(Math.abs(rawBalance))} over` : `${fmt(Math.max(rawBalance, 0))} left`;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black text-white/60">
      <span className="text-emerald-100">{fmt(allocated)} allocated</span>
      <span className="text-white/20">•</span>
      <span>{categoryCount} {categoryCount === 1 ? "category" : "categories"}</span>
      <span className="text-white/20">•</span>
      <span className={over ? "text-rose-200" : "text-cyan-100"}>{balanceText}</span>
    </div>
  );
}

export function AllocatedItemLedger({
  protectedRows,
  categories,
  onEditProtection,
  onEditCategory,
  onRemoveCategory,
  busy,
  emptyLabel = "No budget items added yet.",
}) {
  const hasRows = protectedRows.length > 0 || categories.length > 0;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/36">Allocated items</p>
        {protectedRows.length > 0 && onEditProtection ? (
          <button type="button" onClick={onEditProtection} className="text-[11px] font-bold text-cyan-100/62">
            Edit protection
          </button>
        ) : null}
      </div>
      {!hasRows ? (
        <p className="mt-3 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-xs font-semibold text-white/38">
          {emptyLabel}
        </p>
      ) : (
        <div className="mt-2 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8 bg-black/10">
          {protectedRows.map((item) => (
            <div key={item.id || item.key || item.title} className="flex items-center gap-3 px-3.5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-300/14 bg-emerald-400/10 text-emerald-100/75">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white/88">{item.title || item.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100/40">Protected</p>
              </div>
              <p className="shrink-0 text-sm font-black text-emerald-100">{fmt(item.allocated)}</p>
            </div>
          ))}
          {categories.map((item) => (
            <div key={item.id || item.key || item.title} className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white/88">{item.title}</p></div>
              <p className="shrink-0 text-sm font-black text-white/82">{fmt(item.allocated)}</p>
              {onEditCategory ? (
                <button type="button" onClick={() => onEditCategory(item)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/50" aria-label={`Edit ${item.title}`}>
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {onRemoveCategory ? (
                <button type="button" onClick={() => onRemoveCategory(item)} disabled={busy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-300/14 bg-rose-500/8 text-rose-100/65 disabled:opacity-45" aria-label={`Remove ${item.title}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {protectedRows.length > 0 && categories.length === 0 ? (
        <p className="mt-2 text-xs font-semibold text-white/34">No spending categories added yet.</p>
      ) : null}
    </div>
  );
}

export function ReviewDetail({ label, value, onEdit }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/32">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black text-white/78">{value}</p>
      </div>
      {onEdit ? (
        <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/48" aria-label={`Edit ${label}`}>
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
