import { useState } from "react";
import {
  Car,
  CreditCard,
  Edit3,
  Film,
  Fuel,
  GraduationCap,
  HeartPulse,
  Home,
  MoreHorizontal,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import {
  fmt,
  safeNumber,
} from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const RESERVE_TONES = {
  neutral: { name: "Neutral Slate", rgb: "148 163 184" },
  frost: { name: "Frost Blue", rgb: "125 211 252" },
  cyan: { name: "Cyan", rgb: "34 211 238" },
  teal: { name: "Aqua Teal", rgb: "45 212 191" },
  sapphire: { name: "Sapphire", rgb: "96 165 250" },
  violet: { name: "Royal Violet", rgb: "167 139 250" },
  gold: { name: "Premium Gold", rgb: "232 201 122" },
};

function getReserveTone(item, allocated) {
  const explicitShare = safeNumber(item?.reserveShare ?? item?.reserve_share);
  const declared = safeNumber(
    item?.declaredBudget ??
      item?.declared_budget ??
      item?.cycleBudget ??
      item?.cycle_budget
  );
  const totalAllocated = safeNumber(item?.totalAllocated ?? item?.total_allocated);
  const denominator = declared > 0 ? declared : totalAllocated;
  const share = explicitShare > 0
    ? explicitShare
    : denominator > 0
      ? allocated / denominator
      : 0;

  if (allocated <= 0 || share <= 0) return { ...RESERVE_TONES.neutral, share: 0 };
  if (share <= 0.05) return { ...RESERVE_TONES.frost, share };
  if (share <= 0.10) return { ...RESERVE_TONES.cyan, share };
  if (share <= 0.20) return { ...RESERVE_TONES.teal, share };
  if (share <= 0.35) return { ...RESERVE_TONES.sapphire, share };
  if (share <= 0.50) return { ...RESERVE_TONES.violet, share };
  return { ...RESERVE_TONES.gold, share };
}

function getCategoryIcon(title = "", isProtected = false) {
  if (isProtected) return ShieldCheck;

  const value = String(title).trim().toLowerCase();
  if (/food|meal|dining|restaurant/.test(value)) return Utensils;
  if (/grocery|groceries|market/.test(value)) return ShoppingCart;
  if (/bill|utility|internet|phone|subscription/.test(value)) return Receipt;
  if (/electric|power|water/.test(value)) return Zap;
  if (/rent|house|home|housing/.test(value)) return Home;
  if (/transport|commute|car|jeep|taxi|grab|fare/.test(value)) return Car;
  if (/gas|fuel/.test(value)) return Fuel;
  if (/health|medical|medicine|doctor/.test(value)) return HeartPulse;
  if (/school|education|tuition|study/.test(value)) return GraduationCap;
  if (/movie|entertainment|fun|leisure/.test(value)) return Film;
  if (/shopping|clothes|clothing/.test(value)) return ShoppingBag;
  if (/debt|loan|credit/.test(value)) return CreditCard;
  if (/saving|emergency|reserve/.test(value)) return ShieldCheck;
  return Wallet;
}

function getHealthState({ allocated, spent, isProtected }) {
  if (isProtected) {
    return {
      state: "protected",
      label: "Protected",
      progressRgb: null,
      ratio: allocated > 0 ? 1 : 0,
    };
  }

  const ratio = allocated > 0
    ? spent / allocated
    : spent > 0
      ? 1
      : 0;

  if (ratio >= 1) {
    return {
      state: "danger",
      label: spent > allocated ? "Over budget" : "Limit reached",
      progressRgb: "248 113 113",
      ratio,
    };
  }

  if (ratio >= 0.8) {
    return {
      state: "warning",
      label: "Near limit",
      progressRgb: "251 191 36",
      ratio,
    };
  }

  return {
    state: "healthy",
    label: "Safe",
    progressRgb: null,
    ratio,
  };
}

export default function BudgetCategoryItem({
  item,
  financeActionLoading = false,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isProtected =
    item?.isProtectedCommitment === true ||
    item?.is_protected_commitment === true;
  const categoryAllocated = safeNumber(item?.allocated ?? item?.allocated_amount);
  const categorySpent = safeNumber(item?.spent ?? item?.spent_amount ?? item?.used);
  const rawRemaining = categoryAllocated - categorySpent;
  const categoryRemaining = Math.max(rawRemaining, 0);
  const overAmount = Math.max(categorySpent - categoryAllocated, 0);
  const reserveTone = getReserveTone(item, categoryAllocated);
  const health = getHealthState({
    allocated: categoryAllocated,
    spent: categorySpent,
    isProtected,
  });
  const Icon = getCategoryIcon(item?.title, isProtected);
  const progressRgb = health.progressRgb || reserveTone.rgb;
  const displayProgress = Math.min(Math.max(health.ratio * 100, 0), 100);
  const heroAmount = isProtected
    ? categoryAllocated
    : overAmount > 0
      ? overAmount
      : categoryRemaining;
  const heroLabel = isProtected
    ? "Protected reserve"
    : overAmount > 0
      ? "Over budget"
      : "Remaining";
  const heroTone = health.state === "danger"
    ? "text-rose-100"
    : "text-white/96";

  const closeAndEdit = () => {
    setMenuOpen(false);
    onEditBudgetCategory?.(item);
  };

  const closeAndDelete = () => {
    setMenuOpen(false);
    onDeleteBudgetCategory?.(item);
  };

  return (
    <article
      className="relative rounded-[18px] border p-3 pl-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px"
      style={{
        borderColor: `rgb(${reserveTone.rgb} / 0.22)`,
        background: `radial-gradient(circle at 12% 0%, rgb(${reserveTone.rgb} / 0.115), transparent 38%), linear-gradient(145deg, rgba(8,20,38,0.97), rgba(8,13,31,0.985))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.065), 0 10px 22px rgba(0,0,0,0.20), 0 0 18px rgb(${reserveTone.rgb} / 0.04)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-x-5 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgb(${reserveTone.rgb} / 0.42), transparent)`,
          }}
        />
        <div
          className="absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl"
          style={{ backgroundColor: `rgb(${reserveTone.rgb} / 0.08)` }}
        />
      </div>

      <div
        className="pointer-events-none absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full"
        style={{
          backgroundColor: `rgb(${reserveTone.rgb})`,
          boxShadow: `0 0 12px rgb(${reserveTone.rgb} / 0.28)`,
        }}
      />

      <div className="relative grid grid-cols-[minmax(86px,0.85fr)_minmax(0,1fr)_32px] grid-rows-[40px_auto] items-center gap-x-2.5 gap-y-1">
        <div
          className="col-start-1 row-start-1 grid h-10 w-10 place-items-center rounded-[13px] border"
          style={{
            color: `rgb(${reserveTone.rgb})`,
            borderColor: `rgb(${reserveTone.rgb} / 0.25)`,
            backgroundColor: `rgb(${reserveTone.rgb} / 0.11)`,
            boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.055)`,
          }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </div>

        <p className={`col-start-2 row-start-1 truncate text-[20px] font-black leading-none tracking-[-0.045em] ${heroTone}`}>
          {fmt(heroAmount)}
        </p>

        {!isProtected ? (
          <div
            className="relative col-start-3 row-start-1 justify-self-end"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              disabled={financeActionLoading}
              className="grid h-8 w-8 place-items-center rounded-xl border border-transparent bg-white/[0.025] text-white/48 transition hover:border-white/[0.09] hover:bg-white/[0.065] hover:text-white/82 disabled:opacity-40"
              aria-label={`Open actions for ${item?.title || "budget category"}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#081426]/96 p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeAndEdit}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-bold text-white/72 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit category
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={closeAndDelete}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-bold text-rose-100/72 transition hover:bg-rose-400/[0.10] hover:text-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete category
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="col-start-3 row-start-1" aria-hidden="true" />
        )}

        <p className="col-start-1 row-start-2 min-w-0 truncate text-[11px] font-black leading-tight tracking-[-0.015em] text-white/88">
          {item?.title || "Budget category"}
        </p>

        <p className="col-start-2 row-start-2 min-w-0 truncate text-[9px] font-black uppercase leading-none tracking-[0.14em] text-white/42">
          {heroLabel}
        </p>
      </div>

      <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full border border-white/[0.055] bg-black/[0.30] shadow-[inset_0_1px_2px_rgba(0,0,0,0.32)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${displayProgress}%`,
            background: `linear-gradient(90deg, rgb(${progressRgb} / 0.78), rgb(${progressRgb}))`,
            boxShadow: `0 0 10px rgb(${progressRgb} / 0.28)`,
          }}
        />
      </div>
    </article>
  );
}
