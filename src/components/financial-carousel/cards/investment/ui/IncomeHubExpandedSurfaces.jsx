import { ChevronDown, MoreHorizontal, Pencil, Plus, Repeat2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { fmt } from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import { FINANCE_ITEM_HIERARCHY_TONES } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import { getIncomeSourceRemovalPlan } from "@/lib/incomeHubRepository";
import { isIncomeSourceMasterPayCycle } from "@/lib/clara-master-pay-cycle-repository";

const INCOME_MENU_WIDTH = 208;
const INCOME_MENU_GAP = 8;
const INCOME_MENU_VIEWPORT_PADDING = 12;

const incomeMenuButtonClass =
  "relative z-[130] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.055] text-white/78 transition hover:border-white/28 hover:bg-white/[0.10] hover:text-white disabled:opacity-50";

const incomeMenuActionClass =
  "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-white/94 transition hover:bg-white/[0.10] disabled:opacity-50";

export function toIncomeNumber(value) {
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function getSourceIn(source) {
  return toIncomeNumber(source?.totalMoneyIn ?? source?.total_money_in);
}

export function getSourceOut(source) {
  return toIncomeNumber(source?.totalMoneyOut ?? source?.total_money_out);
}

export function getSourceNet(source) {
  return toIncomeNumber(
    source?.currentBalance ??
      source?.current_balance ??
      getSourceIn(source) - getSourceOut(source)
  );
}

function formatIncomeActivityDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function stopIncomeSourceGesture(event) {
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

export function stopIncomeSourceAction(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

export function isIncomeSourceInteractiveTarget(target) {
  return Boolean(target?.closest?.('[data-income-source-interactive="true"]'));
}

export function IncomeSourcePreviewRow({ source, tone, menuOpen, onToggleMenu }) {
  const net = getSourceNet(source);
  const initial = String(source?.name || "I").trim().slice(0, 1).toUpperCase() || "I";
  const isNegative = net < 0;
  const isZero = net === 0;
  const isMaster = isIncomeSourceMasterPayCycle(source);

  return (
    <PremiumFinanceItemSurface tone={tone} glow={!isZero} className="p-3.5">
      <div className="grid grid-cols-[48px_minmax(0,1fr)_32px] items-start gap-3">
        <PremiumFinanceIconTile tone={tone}>{initial}</PremiumFinanceIconTile>

        <div className="min-w-0 pt-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[14px] font-black tracking-[-0.02em] text-white/92">
              {source?.name || "Income Source"}
            </p>
            {isMaster ? (
              <span className="shrink-0 rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/88">
                Master
              </span>
            ) : null}
          </div>
          <p
            className="mt-1.5 truncate text-[20px] font-black leading-none tracking-[-0.04em]"
            style={{ color: isNegative ? "rgb(251 113 133)" : isZero ? "rgb(203 213 225 / 0.78)" : `rgb(${tone.rgb})` }}
          >
            {fmt(net)}
          </p>
          <p className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${isNegative ? "text-rose-200/82" : "text-white/38"}`}>
            {isNegative ? "Negative net" : "Net generated"}
          </p>
        </div>

        <div className="relative shrink-0" data-income-source-interactive="true">
          <button
            type="button"
            onPointerDownCapture={stopIncomeSourceGesture}
            onMouseDownCapture={stopIncomeSourceGesture}
            onTouchStartCapture={stopIncomeSourceGesture}
            onClick={(event) => {
              stopIncomeSourceAction(event);
              onToggleMenu(source, event.currentTarget);
            }}
            className={incomeMenuButtonClass}
            aria-expanded={menuOpen}
            aria-label={`Open ${source?.name || "income source"} actions`}
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 divide-x divide-white/[0.06] border-t border-white/[0.06] pt-2.5">
        <div className="pr-3">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Money in</p>
          <p className="mt-1.5 truncate text-[12px] font-black text-emerald-100/88">{fmt(getSourceIn(source))}</p>
        </div>
        <div className="pl-3">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Money out</p>
          <p className="mt-1.5 truncate text-[12px] font-black text-white/76">{fmt(getSourceOut(source))}</p>
        </div>
      </div>
    </PremiumFinanceItemSurface>
  );
}

export function IncomeSourceActionMenu({ source, anchorElement, menuRef, onAction, onClose }) {
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    if (typeof window === "undefined" || !anchorElement || !menuRef.current) return;
    if (!anchorElement.isConnected) {
      onClose();
      return;
    }

    const anchorRect = anchorElement.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const menuWidth = Math.min(
      INCOME_MENU_WIDTH,
      Math.max(0, window.innerWidth - INCOME_MENU_VIEWPORT_PADDING * 2)
    );
    const menuHeight = menuRect.height;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const openAbove = spaceBelow < menuHeight + INCOME_MENU_GAP && spaceAbove > spaceBelow;
    const rawTop = openAbove
      ? anchorRect.top - menuHeight - INCOME_MENU_GAP
      : anchorRect.bottom + INCOME_MENU_GAP;
    const maxTop = Math.max(
      INCOME_MENU_VIEWPORT_PADDING,
      window.innerHeight - menuHeight - INCOME_MENU_VIEWPORT_PADDING
    );
    const top = Math.min(Math.max(rawTop, INCOME_MENU_VIEWPORT_PADDING), maxTop);
    const maxLeft = Math.max(
      INCOME_MENU_VIEWPORT_PADDING,
      window.innerWidth - menuWidth - INCOME_MENU_VIEWPORT_PADDING
    );
    const left = Math.min(
      Math.max(anchorRect.right - menuWidth, INCOME_MENU_VIEWPORT_PADDING),
      maxLeft
    );

    setPosition((current) => {
      if (current?.top === top && current?.left === left && current?.width === menuWidth) return current;
      return { top, left, width: menuWidth };
    });
  }, [anchorElement, menuRef, onClose]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    setPosition(null);
    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  const handleMenuAction = (event, action) => {
    stopIncomeSourceAction(event);
    onAction(source, action);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[190] rounded-[22px] border border-white/[0.18] bg-[rgba(12,18,45,0.96)] p-1.5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-cyan-200/10 backdrop-blur-xl"
      style={{
        top: position?.top ?? INCOME_MENU_VIEWPORT_PADDING,
        left: position?.left ?? INCOME_MENU_VIEWPORT_PADDING,
        width: position?.width ?? INCOME_MENU_WIDTH,
        visibility: position ? "visible" : "hidden",
      }}
      onClick={stopIncomeSourceAction}
      onPointerDownCapture={stopIncomeSourceGesture}
      onMouseDownCapture={stopIncomeSourceGesture}
      onTouchStartCapture={stopIncomeSourceGesture}
      data-income-source-interactive="true"
    >
      <button type="button" onClick={(event) => handleMenuAction(event, "add_money")} className={incomeMenuActionClass}>
        <Plus className="h-3.5 w-3.5 text-emerald-200" /> Add Money
      </button>
      <button type="button" onClick={(event) => handleMenuAction(event, "transfer_money")} className={incomeMenuActionClass}>
        <Repeat2 className="h-3.5 w-3.5 text-sky-200" /> Transfer Money
      </button>
      <button type="button" onClick={(event) => handleMenuAction(event, "delete_income_source")} className={`${incomeMenuActionClass} text-rose-100 hover:bg-rose-500/10`}>
        <Trash2 className="h-3.5 w-3.5 text-rose-200" /> Delete
      </button>
      <button type="button" onClick={(event) => handleMenuAction(event, "edit_income_source")} className={incomeMenuActionClass}>
        <Pencil className="h-3.5 w-3.5 text-cyan-100" /> Edit
      </button>
    </div>
  );
}

function getActivityLog(source = {}) {
  const log = source?.incomeActivityLog ?? source?.income_activity_log ?? [];
  return Array.isArray(log) ? log.filter(Boolean) : [];
}

function getActivityPresentation(activity = {}) {
  const type = String(activity?.type || "").toLowerCase();
  if (type === "transfer_money") {
    return {
      title: `Transfer to ${activity?.destinationWalletName || activity?.destination_wallet_name || "Wallet"}`,
      prefix: "-",
      tone: { key: "transfer", rgb: "96 165 250" },
      amountClassName: "text-sky-100",
    };
  }
  if (type === "add_money") {
    return {
      title: "Added Money",
      prefix: "+",
      tone: { key: "added", rgb: "52 211 153" },
      amountClassName: "text-emerald-100",
    };
  }
  if (type === "source_updated") {
    return { title: "Updated Source", prefix: "", tone: FINANCE_ITEM_HIERARCHY_TONES.neutral, amountClassName: "text-white/70" };
  }
  return { title: "Created Source", prefix: "", tone: FINANCE_ITEM_HIERARCHY_TONES.neutral, amountClassName: "text-white/70" };
}

function buildIncomeActivityItems(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .flatMap((source) => {
      const log = getActivityLog(source);
      if (log.length) {
        return log.map((activity) => {
          const presentation = getActivityPresentation(activity);
          const rawAmount = activity?.amount;
          return {
            id: activity?.id || `${source.id}-${activity?.createdAt || activity?.created_at || "activity"}`,
            title: presentation.title,
            date: activity?.createdAt || activity?.created_at || null,
            amount: rawAmount === null || rawAmount === undefined ? null : Math.abs(toIncomeNumber(rawAmount)),
            prefix: presentation.prefix,
            tone: presentation.tone,
            amountClassName: presentation.amountClassName,
          };
        });
      }

      const createdAt = source?.createdAt || source?.created_at;
      if (!createdAt) return [];
      return [{
        id: `${source.id}-created`,
        title: "Created Source",
        date: createdAt,
        amount: null,
        prefix: "",
        tone: FINANCE_ITEM_HIERARCHY_TONES.neutral,
        amountClassName: "text-white/70",
      }];
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 5);
}

export function IncomeRecentActivityPreview({ sources = [] }) {
  const [expanded, setExpanded] = useState(false);
  const items = buildIncomeActivityItems(sources);
  if (!items.length) return null;

  return (
    <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false} className="p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
        data-income-source-interactive="true"
        onClick={(event) => {
          stopIncomeSourceAction(event);
          setExpanded((value) => !value);
        }}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/44">Recent activity</span>
        <ChevronDown className={`h-4 w-4 text-white/58 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <PremiumFinanceItemSurface key={item.id} tone={item.tone} glow={false} className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-white/84">{item.title}</p>
                  <p className="mt-1 text-[10px] font-semibold text-white/38">{formatIncomeActivityDate(item.date)}</p>
                </div>
                {item.amount !== null ? (
                  <p className={`shrink-0 text-[12px] font-black ${item.amountClassName}`}>
                    {item.prefix}{fmt(item.amount || 0)}
                  </p>
                ) : null}
              </div>
            </PremiumFinanceItemSurface>
          ))}
        </div>
      ) : null}
    </PremiumFinanceItemSurface>
  );
}

export function IncomeSourceCreateButton({ onCreateIncomeSource }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        stopIncomeSourceAction(event);
        onCreateIncomeSource?.();
      }}
      data-income-source-interactive="true"
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-black text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-cyan-200/18 hover:bg-white/[0.07]"
    >
      <Plus className="h-4 w-4 text-cyan-100" /> Add income source
    </button>
  );
}

export function EmptyIncomeSourcesPreview({ onCreateIncomeSource }) {
  return (
    <div className="space-y-3">
      <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} glow={false} className="px-4 py-4 text-center">
        <p className="text-sm font-black text-white/88">No income sources yet</p>
        <p className="mt-1.5 text-[11px] font-semibold leading-5 text-white/48">Create an income source to start tracking money coming in.</p>
      </PremiumFinanceItemSurface>
      <IncomeSourceCreateButton onCreateIncomeSource={onCreateIncomeSource} />
    </div>
  );
}

export function IncomeSourceRemovalModal({ source, open, saving, error = "", onClose, onConfirm }) {
  if (!open || !source) return null;
  const removalPlan = getIncomeSourceRemovalPlan(source);
  const isMaster = isIncomeSourceMasterPayCycle(source);
  const isBlocked = removalPlan.type === "blocked_balance" || isMaster;
  const primaryLabel = isBlocked ? "Close" : removalPlan.primaryLabel;
  const title = isMaster ? "Choose another Master first" : removalPlan.title;
  const message = isMaster
    ? "This income source controls CLARA's active financial cycle. Open another existing income source and make it the Master Pay Cycle before deleting this one."
    : removalPlan.message;

  return (
    <div className="fixed inset-0 z-[160] flex min-h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.45),rgba(2,6,23,0.78)_55%,rgba(2,6,23,0.92))] px-4 py-5 backdrop-blur-[16px]" onClick={() => { if (!saving) onClose?.(); }}>
      <div className="w-full max-w-[390px] rounded-[32px] border border-white/[0.14] bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.10),transparent_38%),linear-gradient(135deg,rgba(5,31,48,0.98),rgba(8,16,42,0.995)_50%,rgba(35,15,67,0.995))] p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_42px_rgba(244,63,94,0.06)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Income source safety</p>
            <h3 className="mt-2 text-[25px] font-black leading-tight tracking-[-0.045em] text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50" aria-label="Close modal">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white">{source.name}</p>
            {isMaster ? <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100">Master</span> : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-white/55">Current balance: {fmt(getSourceNet(source))}</p>
        </div>
        <p className="mt-4 text-[13px] font-semibold leading-6 text-white/68">{message}</p>
        {error ? <p className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">{error}</p> : null}
        <div className="mt-5 grid grid-cols-[0.84fr_1.16fr] gap-2.5">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/76 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-55">{removalPlan.secondaryLabel}</button>
          <button type="button" onClick={isBlocked ? onClose : onConfirm} disabled={saving} className={`rounded-2xl px-4 py-3 text-sm font-black text-white transition disabled:opacity-55 ${removalPlan.danger && !isBlocked ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.24)]" : "bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 shadow-[0_10px_30px_rgba(34,211,238,0.18)]"}`}>
            {saving ? "Saving..." : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
