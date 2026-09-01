import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ShieldCheck, X } from "lucide-react";
import { formatImpactDate, getCurrentMonthImpact } from "@/lib/clara-buy-check-impact-ledger";

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function ImpactTrigger({ open, impact, onToggle, previewReadOnly = false }) {
  return (
    <button
      type="button"
      onClick={previewReadOnly ? undefined : onToggle}
      data-clara-impact-trigger="true"
      data-clara-impact-preview={previewReadOnly ? "true" : undefined}
      aria-expanded={open}
      aria-disabled={previewReadOnly ? "true" : undefined}
      aria-label={`${open ? "Close" : "Open"} CLARA Impact. ${money(impact.total)} protected this month.`}
      className={`absolute bottom-3 right-3 z-30 grid h-11 w-11 place-items-center rounded-full border transition active:scale-95 ${open
        ? "border-[#ffd84a]/55 bg-[#ffd84a]/12 text-[#ffe783] shadow-[0_10px_30px_rgba(255,216,74,0.14),0_0_0_4px_rgba(23,105,255,0.08)]"
        : "border-blue-300/32 bg-[#07152d]/92 text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-blue-300/52 hover:bg-blue-500/12"}`}
    >
      <ShieldCheck className="h-[19px] w-[19px]" strokeWidth={2.2} />
      {impact.count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full border border-[#07152d] bg-[#1769ff] px-1 py-0.5 text-[8px] font-black leading-none text-white">
          {impact.count > 99 ? "99+" : impact.count}
        </span>
      ) : null}
    </button>
  );
}

function ImpactLedgerRow({ entry }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-black text-white/94">{entry.item}</p>
        {entry.reason ? <p className="mt-0.5 truncate text-[9.5px] font-semibold text-slate-400/72">{entry.reason}</p> : null}
      </div>
      <strong className="whitespace-nowrap text-[12px] font-black text-blue-300">{money(entry.amount)}</strong>
      <span className="whitespace-nowrap text-[10px] font-bold text-slate-400/76">{formatImpactDate(entry.created_at)}</span>
    </div>
  );
}

function ClaraImpactBoard({ impact, onClose }) {
  const visibleEntries = useMemo(() => impact.entries.slice(0, 5), [impact.entries]);

  return (
    <section
      data-clara-impact-board="true"
      className="relative mx-1 mt-3 shrink-0 overflow-hidden rounded-[28px] border border-blue-200/18 bg-[linear-gradient(150deg,rgba(5,22,46,0.96),rgba(4,12,29,0.98)_58%,rgba(22,9,35,0.94))] px-4 pb-4 pt-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/[0.08] blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border border-blue-300/24 bg-blue-500/[0.09] text-blue-200">
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/70">CLARA IMPACT</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-400/72">{impact.monthLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-black/16 text-white/62 transition hover:border-blue-200/28 hover:text-white active:scale-95"
          aria-label="Close CLARA Impact"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative mt-4 text-center">
        <strong className="block text-[38px] font-black leading-none tracking-[-0.045em] text-white">{money(impact.total)}</strong>
        <span className="mt-2 block text-[14px] font-black tracking-[-0.015em] text-blue-200">Money Protected</span>
        <span className="mt-1 block text-[10.5px] font-semibold text-slate-400/76">kept under your control this month</span>
      </div>

      <div className="relative mt-4 flex items-center justify-between rounded-[18px] border border-blue-200/12 bg-black/16 px-4 py-3">
        <div>
          <strong className="text-[20px] font-black text-white">{impact.count}</strong>
          <span className="ml-2 text-[10.5px] font-bold text-slate-300/76">{impact.count === 1 ? "purchase avoided" : "purchases avoided"}</span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#ffd84a]/72">CONFIRMED ONLY</span>
      </div>

      <div className="relative mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300/72">Avoided Spending Ledger</p>
          {impact.entries.length > 5 ? <span className="text-[9px] font-bold text-blue-300/70">Latest 5</span> : null}
        </div>

        {visibleEntries.length ? (
          <div className="grid gap-2">
            {visibleEntries.map((entry) => <ImpactLedgerRow key={entry.id} entry={entry} />)}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-blue-200/14 bg-white/[0.018] px-5 py-6 text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-blue-300/62" />
            <p className="mt-2 text-[12px] font-black text-white/90">No protected spending yet</p>
            <p className="mx-auto mt-1 max-w-[250px] text-[10.5px] font-semibold leading-5 text-slate-400/76">
              When you confirm that you are not buying something, CLARA will audit the amount here.
            </p>
          </div>
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between rounded-[14px] border border-white/[0.055] bg-white/[0.018] px-3.5 py-2.5 text-[9.5px] font-semibold text-slate-400/76">
        <span>Not savings yet — this is spending you successfully avoided.</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-blue-300/65" />
      </div>
    </section>
  );
}

function introAnimationIsDone(board) {
  if (!(board instanceof HTMLElement)) return false;
  const question = board.querySelector('[data-clara-buy-check-active-question="true"]');
  return Boolean(question?.className?.includes("opacity-100"));
}

export default function ClaraBuyCheckImpactPortal({
  isActive = false,
  disabled = false,
  previewImpact = null,
  previewReadOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState({ board: null, host: null });
  const [impact, setImpact] = useState(() => previewImpact || getCurrentMonthImpact());
  const [entryAnimationDone, setEntryAnimationDone] = useState(false);

  useEffect(() => {
    if (!isActive || disabled) {
      setOpen(false);
      setTargets({ board: null, host: null });
      setEntryAnimationDone(false);
      return undefined;
    }

    const syncTargets = () => {
      const board = document.querySelector('[data-clara-pause-entry-board="true"]');
      const host = board?.parentElement || null;
      setTargets((current) => (current.board === board && current.host === host ? current : { board, host }));
      setEntryAnimationDone(introAnimationIsDone(board));
      if (!board || !host) setOpen(false);
    };

    syncTargets();
    const observer = new MutationObserver(syncTargets);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [disabled, isActive]);

  useEffect(() => {
    if (!isActive || disabled) return undefined;
    if (previewImpact) {
      setImpact(previewImpact);
      return undefined;
    }

    const refresh = () => setImpact(getCurrentMonthImpact());
    refresh();
    window.addEventListener("clara:buy-check-impact-updated", refresh);
    window.addEventListener("clara:buy-check-decision-memory", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("clara:buy-check-impact-updated", refresh);
      window.removeEventListener("clara:buy-check-decision-memory", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [disabled, isActive, previewImpact]);

  useEffect(() => {
    const host = targets.host;
    if (!open || !host) return undefined;

    const previous = {
      justifyContent: host.style.justifyContent,
      gap: host.style.gap,
      paddingTop: host.style.paddingTop,
      paddingBottom: host.style.paddingBottom,
    };
    host.style.justifyContent = "flex-start";
    host.style.gap = "12px";
    host.style.paddingTop = "12px";
    host.style.paddingBottom = "112px";

    const viewport = host.closest('[data-clara-ai-message-viewport="true"]');
    viewport?.scrollTo?.({ top: 0, behavior: "smooth" });

    return () => {
      host.style.justifyContent = previous.justifyContent;
      host.style.gap = previous.gap;
      host.style.paddingTop = previous.paddingTop;
      host.style.paddingBottom = previous.paddingBottom;
    };
  }, [open, targets.host]);

  if (!isActive || disabled || !targets.board || !targets.host) return null;

  return (
    <>
      {entryAnimationDone ? createPortal(
        <ImpactTrigger
          open={open}
          impact={impact}
          previewReadOnly={previewReadOnly}
          onToggle={() => setOpen((current) => !current)}
        />,
        targets.board,
      ) : null}
      {open ? createPortal(<ClaraImpactBoard impact={impact} onClose={() => setOpen(false)} />, targets.host) : null}
    </>
  );
}