import {
  Car,
  CreditCard,
  Film,
  Fuel,
  GraduationCap,
  HeartPulse,
  Home,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
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
      progressRgb: "248 113 113",
      ratio,
    };
  }

  if (ratio >= 0.8) {
    return {
      state: "warning",
      progressRgb: "251 191 36",
      ratio,
    };
  }

  return {
    state: "healthy",
    progressRgb: null,
    ratio,
  };
}

export default function BudgetCategoryItem({ item }) {
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

      <div className="relative grid grid-cols-[minmax(0,1fr)_76px] items-center gap-x-4">
        <div className="min-w-0 self-center">
          <p className={`truncate text-[20px] font-black leading-none tracking-[-0.045em] ${heroTone}`}>
            {fmt(heroAmount)}
          </p>
          <p className="mt-1.5 truncate text-[9px] font-black uppercase leading-none tracking-[0.14em] text-white/42">
            {heroLabel}
          </p>
        </div>

        <div className="flex w-[76px] flex-col items-center justify-center gap-1.5 justify-self-end">
          <div
            className="grid h-8 w-8 place-items-center rounded-[11px] border"
            style={{
              color: `rgb(${reserveTone.rgb})`,
              borderColor: `rgb(${reserveTone.rgb} / 0.20)`,
              backgroundColor: `rgb(${reserveTone.rgb} / 0.08)`,
              boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.05), 0 0 12px rgb(${reserveTone.rgb} / 0.05)`,
            }}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>

          <p className="max-h-[24px] w-full overflow-hidden whitespace-normal break-words text-center text-[10px] font-bold leading-[1.15] text-white/70">
            {item?.title || "Budget category"}
          </p>
        </div>
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
