import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Check,
  Church,
  Coins,
  Coffee,
  CookingPot,
  CreditCard,
  Droplets,
  Dumbbell,
  Film,
  Flame,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  KeyRound,
  Laptop,
  MapPin,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Store,
  Target,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  fmt,
  safeNumber,
} from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const BUDGET_ICON_STORAGE_KEY = "clara_budget_category_icons_v1";

const RESERVE_TONES = {
  neutral: { name: "CLARA White", rgb: "226 232 240" },
  frost: { name: "CLARA Soft Blue", rgb: "147 197 253" },
  cyan: { name: "CLARA Blue", rgb: "96 165 250" },
  teal: { name: "CLARA Yellow", rgb: "252 209 22" },
  sapphire: { name: "CLARA Royal Blue", rgb: "59 130 246" },
  violet: { name: "CLARA Deep Blue", rgb: "0 56 168" },
  gold: { name: "CLARA Gold", rgb: "252 209 22" },
};

const ICON_OPTIONS = [
  { key: "wallet", label: "Wallet", group: "Money", icon: Wallet, keywords: "general budget other" },
  { key: "banknote", label: "Cash", group: "Money", icon: Banknote, keywords: "money income salary" },
  { key: "coins", label: "Coins", group: "Money", icon: Coins, keywords: "cash loose change" },
  { key: "piggy-bank", label: "Savings", group: "Money", icon: PiggyBank, keywords: "save fund" },
  { key: "credit-card", label: "Credit Card", group: "Money", icon: CreditCard, keywords: "debt loan payment" },
  { key: "receipt", label: "Bills", group: "Money", icon: Receipt, keywords: "utility invoice payment" },

  { key: "home", label: "Home", group: "Home", icon: Home, keywords: "house bahay housing" },
  { key: "building", label: "Apartment", group: "Home", icon: Building2, keywords: "condo rent property" },
  { key: "key", label: "Rent", group: "Home", icon: KeyRound, keywords: "lease housing" },
  { key: "wrench", label: "Repairs", group: "Home", icon: Wrench, keywords: "maintenance fix" },
  { key: "hammer", label: "Maintenance", group: "Home", icon: Hammer, keywords: "repair construction" },
  { key: "store", label: "Household", group: "Home", icon: Store, keywords: "supplies market" },

  { key: "zap", label: "Electricity", group: "Daily", icon: Zap, keywords: "power electric bill" },
  { key: "droplets", label: "Water", group: "Daily", icon: Droplets, keywords: "water bill utility" },
  { key: "flame", label: "Gas", group: "Daily", icon: Flame, keywords: "cooking gas utility" },
  { key: "wifi", label: "Internet", group: "Daily", icon: Wifi, keywords: "connection broadband" },
  { key: "smartphone", label: "Phone", group: "Daily", icon: Smartphone, keywords: "mobile load data" },
  { key: "utensils", label: "Food", group: "Daily", icon: Utensils, keywords: "meal dining pagkain" },
  { key: "cooking-pot", label: "Cooking", group: "Daily", icon: CookingPot, keywords: "kitchen meal" },
  { key: "shopping-basket", label: "Groceries", group: "Daily", icon: ShoppingBasket, keywords: "grocery supermarket palengke" },
  { key: "shopping-cart", label: "Shopping Cart", group: "Daily", icon: ShoppingCart, keywords: "market grocery" },
  { key: "coffee", label: "Coffee", group: "Daily", icon: Coffee, keywords: "cafe drinks" },
  { key: "car", label: "Car", group: "Daily", icon: Car, keywords: "vehicle transport" },
  { key: "bus", label: "Commute", group: "Daily", icon: Bus, keywords: "public transport jeep pamasahe" },
  { key: "fuel", label: "Fuel", group: "Daily", icon: Fuel, keywords: "gasoline diesel petrol" },
  { key: "map-pin", label: "Travel Fare", group: "Daily", icon: MapPin, keywords: "location trip route" },

  { key: "heart-pulse", label: "Health", group: "Life", icon: HeartPulse, keywords: "medical wellness" },
  { key: "stethoscope", label: "Doctor", group: "Life", icon: Stethoscope, keywords: "checkup clinic" },
  { key: "pill", label: "Medicine", group: "Life", icon: Pill, keywords: "medication pharmacy" },
  { key: "dumbbell", label: "Fitness", group: "Life", icon: Dumbbell, keywords: "gym exercise" },
  { key: "briefcase", label: "Work", group: "Life", icon: Briefcase, keywords: "job office business" },
  { key: "graduation-cap", label: "Education", group: "Life", icon: GraduationCap, keywords: "school tuition study" },
  { key: "book-open", label: "Books", group: "Life", icon: BookOpen, keywords: "reading school" },
  { key: "laptop", label: "Technology", group: "Life", icon: Laptop, keywords: "computer work online" },
  { key: "baby", label: "Child", group: "Life", icon: Baby, keywords: "kids family" },
  { key: "paw-print", label: "Pets", group: "Life", icon: PawPrint, keywords: "dog cat animal" },
  { key: "shirt", label: "Clothing", group: "Life", icon: Shirt, keywords: "clothes fashion" },
  { key: "shopping-bag", label: "Shopping", group: "Life", icon: ShoppingBag, keywords: "personal purchase" },
  { key: "film", label: "Entertainment", group: "Life", icon: Film, keywords: "movie cinema leisure" },
  { key: "music", label: "Music", group: "Life", icon: Music, keywords: "audio concert" },
  { key: "gamepad", label: "Gaming", group: "Life", icon: Gamepad2, keywords: "games recreation" },
  { key: "gift", label: "Gifts", group: "Life", icon: Gift, keywords: "present celebration" },
  { key: "plane", label: "Travel", group: "Life", icon: Plane, keywords: "vacation flight" },

  { key: "target", label: "Goal", group: "Goals", icon: Target, keywords: "achievement milestone" },
  { key: "shield-check", label: "Protected Fund", group: "Goals", icon: ShieldCheck, keywords: "secure savings emergency" },
  { key: "shield-alert", label: "Emergency", group: "Goals", icon: ShieldAlert, keywords: "urgent protection" },
  { key: "church", label: "Church", group: "Goals", icon: Church, keywords: "offering ministry donation" },
];

const ICON_GROUPS = ["All", "Money", "Home", "Daily", "Life", "Goals"];
const ICON_BY_KEY = Object.fromEntries(ICON_OPTIONS.map((option) => [option.key, option]));

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getCategoryIdentity(item = {}) {
  const id = String(item?.id || item?.key || item?.budget_id || "").trim();
  if (id) return `id:${id}`;

  const title = normalizeText(item?.title || item?.name || item?.category || item?.budget_category);
  return `title:${title || "budget-category"}`;
}

function readStoredIconKey(item) {
  if (typeof window === "undefined") return "";

  try {
    const raw = window.localStorage.getItem(BUDGET_ICON_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return typeof stored?.[getCategoryIdentity(item)] === "string"
      ? stored[getCategoryIdentity(item)]
      : "";
  } catch {
    return "";
  }
}

function writeStoredIconKey(item, iconKey) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(BUDGET_ICON_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    stored[getCategoryIdentity(item)] = iconKey;
    window.localStorage.setItem(BUDGET_ICON_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Icon selection remains available for the current session even if storage is unavailable.
  }
}

function clearStoredIconKey(item) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(BUDGET_ICON_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    delete stored[getCategoryIdentity(item)];
    window.localStorage.setItem(BUDGET_ICON_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // No-op when storage is unavailable.
  }
}

function getRecordIconKey(item = {}) {
  const value = String(
    item?.iconKey ||
      item?.icon_key ||
      item?.categoryIcon ||
      item?.category_icon ||
      ""
  ).trim();

  return ICON_BY_KEY[value] ? value : "";
}

function inferDefaultIconKey(title = "", isProtected = false) {
  if (isProtected) return "shield-check";

  const value = normalizeText(title);
  if (/\b(food|meal|dining|restaurant|pagkain)\b/.test(value)) return "utensils";
  if (/\b(grocery|groceries|supermarket|palengke)\b/.test(value)) return "shopping-basket";
  if (/\b(bill|bills|utility|utilities|internet|phone|subscription)\b/.test(value)) return "receipt";
  if (/\b(electric|electricity|power|kuryente)\b/.test(value)) return "zap";
  if (/\b(water|tubig)\b/.test(value)) return "droplets";
  if (/\b(bahay|rent|house|home|housing)\b/.test(value)) return "home";
  if (/\b(transport|transportation|commute|car|jeep|taxi|grab|fare|pamasahe)\b/.test(value)) return "bus";
  if (/\b(gas|gasoline|fuel|diesel|petrol)\b/.test(value)) return "fuel";
  if (/\b(health|medical|medicine|doctor|hospital|gamot)\b/.test(value)) return "heart-pulse";
  if (/\b(school|education|tuition|study|college)\b/.test(value)) return "graduation-cap";
  if (/\b(movie|entertainment|fun|leisure|cinema)\b/.test(value)) return "film";
  if (/\b(shopping|clothes|clothing|fashion)\b/.test(value)) return "shopping-bag";
  if (/\b(debt|loan|credit|utang)\b/.test(value)) return "credit-card";
  if (/\b(saving|savings|emergency|reserve|fund)\b/.test(value)) return "piggy-bank";
  if (/\b(church|offering|tithe|ministry|donation)\b/.test(value)) return "church";
  return "wallet";
}

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

function getHealthState({ allocated, spent, isProtected }) {
  const ratio = allocated > 0
    ? spent / allocated
    : spent > 0
      ? 1
      : 0;

  if (isProtected) {
    return {
      state: "protected",
      progressRgb: null,
      ratio,
    };
  }

  if (ratio >= 1) {
    return {
      state: "danger",
      progressRgb: "206 17 38",
      ratio,
    };
  }

  if (ratio >= 0.8) {
    return {
      state: "warning",
      progressRgb: "252 209 22",
      ratio,
    };
  }

  return {
    state: "healthy",
    progressRgb: null,
    ratio,
  };
}

function BudgetIconPickerModal({
  categoryTitle,
  selectedIconKey,
  reserveTone,
  onClose,
  onReset,
  onSelect,
}) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");

  const filteredIcons = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return ICON_OPTIONS.filter((option) => {
      const matchesGroup = activeGroup === "All" || option.group === activeGroup;
      if (!matchesGroup) return false;
      if (!normalizedQuery) return true;

      const searchable = normalizeText(
        `${option.label} ${option.key} ${option.group} ${option.keywords || ""}`
      );
      return searchable.includes(normalizedQuery);
    });
  }, [activeGroup, query]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const SelectedIcon = ICON_BY_KEY[selectedIconKey]?.icon || Wallet;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020B20]/82 px-4 py-5 backdrop-blur-xl"
      role="presentation"
      data-clara-budget-icon-overlay="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-icon-picker-title"
        data-clara-budget-icon-picker="true"
        className="relative flex max-h-[min(86dvh,680px)] w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] border border-blue-200/[0.18] bg-[linear-gradient(145deg,rgba(0,56,168,0.98),rgba(8,42,103,0.99)_54%,rgba(6,29,76,0.995))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.62),0_0_48px_rgba(0,56,168,0.22),0_0_24px_rgba(252,209,22,0.06)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-yellow-300/[0.12] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-14 h-52 w-52 rounded-full bg-red-500/[0.14] blur-3xl" />

        <header className="relative flex items-start gap-3 border-b border-blue-100/[0.10] bg-[linear-gradient(90deg,rgba(252,209,22,0.035),transparent_36%,rgba(206,17,38,0.045))] px-4 pb-4 pt-4">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border"
            style={{
              color: `rgb(${reserveTone.rgb})`,
              borderColor: `rgb(${reserveTone.rgb} / 0.34)`,
              backgroundColor: `rgb(${reserveTone.rgb} / 0.13)`,
              boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.08), 0 0 18px rgb(${reserveTone.rgb} / 0.11)`,
            }}
          >
            <SelectedIcon className="h-5 w-5" strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-yellow-200/78">
              Budget category
            </p>
            <h2 id="budget-icon-picker-title" className="mt-1 truncate text-[18px] font-black tracking-[-0.035em] text-white/96">
              Choose an icon
            </h2>
            <p className="mt-1 truncate text-[11px] font-semibold text-blue-100/66">
              {categoryTitle || "Budget category"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-100/[0.14] bg-[#082A67]/80 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-red-300/30 hover:bg-red-500/[0.12] hover:text-white"
            aria-label="Close icon picker"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative border-b border-blue-100/[0.08] bg-[#082A67]/28 px-4 py-3.5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-100/48" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons"
              className="h-11 w-full rounded-2xl border border-blue-100/[0.13] bg-[#06275F]/80 pl-10 pr-3 text-[12px] font-semibold text-white/92 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition placeholder:text-blue-100/38 focus:border-yellow-200/34 focus:bg-[#06275F] focus:ring-1 focus:ring-yellow-200/10"
            />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ICON_GROUPS.map((group) => {
              const active = activeGroup === group;
              return (
                <button
                  type="button"
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                    active
                      ? "border-yellow-200/52 bg-yellow-300/[0.13] text-yellow-100 shadow-[0_0_16px_rgba(252,209,22,0.07)]"
                      : "border-blue-100/[0.10] bg-[#0A2D6B]/62 text-blue-100/50 hover:border-blue-100/20 hover:bg-[#0C377F]/70 hover:text-white/76"
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(5,31,78,0.12),rgba(4,22,57,0.36))] px-4 py-4">
          {filteredIcons.length ? (
            <div className="grid grid-cols-4 gap-2.5">
              {filteredIcons.map((option) => {
                const OptionIcon = option.icon;
                const selected = option.key === selectedIconKey;

                return (
                  <button
                    type="button"
                    key={option.key}
                    onClick={() => onSelect?.(option.key)}
                    className={`relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-[18px] border px-1.5 py-2.5 text-center transition active:scale-[0.97] ${
                      selected
                        ? "border-yellow-200/46 bg-[linear-gradient(145deg,rgba(252,209,22,0.13),rgba(0,56,168,0.36))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(252,209,22,0.07)]"
                        : "border-blue-100/[0.10] bg-[linear-gradient(145deg,rgba(18,59,130,0.70),rgba(8,34,84,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-blue-100/20 hover:bg-[linear-gradient(145deg,rgba(24,71,151,0.78),rgba(9,39,96,0.92))]"
                    }`}
                    aria-pressed={selected}
                    aria-label={`Use ${option.label} icon`}
                  >
                    {selected ? (
                      <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-yellow-300 text-[#082A67] shadow-[0_0_10px_rgba(252,209,22,0.22)]">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                    <OptionIcon
                      className={`h-5 w-5 ${selected ? "text-yellow-100" : "text-white/78"}`}
                      strokeWidth={2}
                    />
                    <span className={`line-clamp-2 text-[9px] font-bold leading-[1.15] ${selected ? "text-white/94" : "text-blue-50/66"}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <Search className="h-7 w-7 text-yellow-200/34" />
              <p className="mt-3 text-sm font-black text-white/82">No icon found</p>
              <p className="mt-1 text-[11px] font-semibold text-blue-100/48">Try a simpler search word.</p>
            </div>
          )}
        </div>

        <footer className="relative flex items-center justify-between gap-3 border-t border-blue-100/[0.10] bg-[linear-gradient(90deg,rgba(6,39,95,0.96),rgba(11,42,101,0.98)_64%,rgba(206,17,38,0.08))] px-4 py-3.5">
          <p className="text-[10px] font-semibold text-blue-50/52">Tap an icon to apply it instantly.</p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-yellow-200/28 bg-yellow-300/[0.075] px-3 py-2 text-[9px] font-black uppercase tracking-[0.10em] text-yellow-100 transition hover:border-yellow-200/46 hover:bg-yellow-300/[0.14]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Automatic
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
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
  const inferredIconKey = inferDefaultIconKey(item?.title, isProtected);
  const storageIdentity = getCategoryIdentity(item);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [selectedIconKey, setSelectedIconKey] = useState(() => {
    const recordIconKey = getRecordIconKey(item);
    const storedIconKey = readStoredIconKey(item);
    return recordIconKey || (ICON_BY_KEY[storedIconKey] ? storedIconKey : "") || inferredIconKey;
  });

  useEffect(() => {
    const recordIconKey = getRecordIconKey(item);
    const storedIconKey = readStoredIconKey(item);
    setSelectedIconKey(
      recordIconKey || (ICON_BY_KEY[storedIconKey] ? storedIconKey : "") || inferredIconKey
    );
  }, [inferredIconKey, item, storageIdentity]);

  const Icon = ICON_BY_KEY[selectedIconKey]?.icon || Wallet;
  const progressRgb = health.progressRgb || reserveTone.rgb;
  const displayProgress = Math.min(Math.max(health.ratio * 100, 0), 100);
  const heroAmount = isProtected
    ? categoryRemaining
    : overAmount > 0
      ? overAmount
      : categoryRemaining;
  const heroLabel = isProtected
    ? "To protect"
    : overAmount > 0
      ? "Over budget"
      : "Remaining";
  const heroTone = health.state === "danger"
    ? "text-red-100"
    : "text-white/96";
  const accentRgb = health.state === "danger" ? "206 17 38" : reserveTone.rgb;

  const stopCardInteraction = (event) => {
    event?.stopPropagation?.();
  };

  const selectIcon = (iconKey) => {
    if (!ICON_BY_KEY[iconKey]) return;
    setSelectedIconKey(iconKey);
    writeStoredIconKey(item, iconKey);
    setIconPickerOpen(false);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("clara:budget-icon-updated", {
          detail: {
            categoryId: item?.id || null,
            categoryTitle: item?.title || item?.name || "Budget category",
            iconKey,
          },
        })
      );
    }
  };

  const resetIcon = () => {
    clearStoredIconKey(item);
    setSelectedIconKey(inferredIconKey);
    setIconPickerOpen(false);
  };

  return (
    <>
      <article
        className="relative rounded-[18px] border p-3 pl-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px"
        style={{
          borderColor: `rgb(${accentRgb} / 0.30)`,
          background: "radial-gradient(circle at 10% -8%, rgba(252,209,22,0.11), transparent 32%), radial-gradient(circle at 100% 100%, rgba(206,17,38,0.10), transparent 42%), linear-gradient(145deg, rgba(0,56,168,0.78), rgba(13,53,116,0.89) 54%, rgba(7,39,92,0.96))",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.085), 0 10px 22px rgba(0,0,0,0.18), 0 0 20px rgb(${accentRgb} / 0.055)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div
            className="absolute inset-x-5 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, rgb(${accentRgb} / 0.52), rgba(252,209,22,0.28), transparent)`,
            }}
          />
          <div
            className="absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl"
            style={{ backgroundColor: "rgba(206,17,38,0.10)" }}
          />
        </div>

        <div
          className="pointer-events-none absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full"
          style={{
            backgroundColor: `rgb(${accentRgb})`,
            boxShadow: `0 0 12px rgb(${accentRgb} / 0.34)`,
          }}
        />

        <div className="relative grid grid-cols-[minmax(0,1fr)_76px] items-center gap-x-4">
          <div className="min-w-0 self-center">
            <p className={`truncate text-[20px] font-black leading-none tracking-[-0.045em] ${heroTone}`}>
              {fmt(heroAmount)}
            </p>
            <p className="mt-1.5 truncate text-[9px] font-black uppercase leading-none tracking-[0.14em] text-white/50">
              {heroLabel}
            </p>
          </div>

          <div className="flex w-[76px] flex-col items-center justify-center gap-1.5 justify-self-end">
            <button
              type="button"
              onPointerDown={stopCardInteraction}
              onTouchStart={stopCardInteraction}
              onClick={(event) => {
                stopCardInteraction(event);
                setIconPickerOpen(true);
              }}
              className="group relative grid h-8 w-8 place-items-center rounded-[11px] border transition hover:-translate-y-px active:scale-[0.96]"
              style={{
                color: `rgb(${accentRgb})`,
                borderColor: `rgb(${accentRgb} / 0.30)`,
                backgroundColor: `rgb(${accentRgb} / 0.13)`,
                boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.07), 0 0 14px rgb(${accentRgb} / 0.08)`,
              }}
              aria-label={`Change icon for ${item?.title || "budget category"}`}
              aria-haspopup="dialog"
              aria-expanded={iconPickerOpen}
              data-clara-budget-icon-trigger="true"
            >
              <Icon className="h-4 w-4 transition-transform group-hover:scale-105" strokeWidth={2} />
              <span
                className="pointer-events-none absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-[#0B2F73]"
                style={{ backgroundColor: `rgb(${accentRgb})` }}
              />
            </button>

            <p className="max-h-[24px] w-full overflow-hidden whitespace-normal break-words text-center text-[10px] font-bold leading-[1.15] text-white/80">
              {item?.title || "Budget category"}
            </p>
          </div>
        </div>

        <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full border border-blue-100/[0.09] bg-[#06275F]/[0.82] shadow-[inset_0_1px_2px_rgba(0,0,0,0.28)]">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${displayProgress}%`,
              background: `linear-gradient(90deg, rgb(${progressRgb} / 0.82), rgb(${progressRgb}))`,
              boxShadow: `0 0 10px rgb(${progressRgb} / 0.32)`,
            }}
          />
        </div>
      </article>

      {iconPickerOpen ? (
        <BudgetIconPickerModal
          categoryTitle={item?.title || item?.name || "Budget category"}
          selectedIconKey={selectedIconKey}
          reserveTone={reserveTone}
          onClose={() => setIconPickerOpen(false)}
          onReset={resetIcon}
          onSelect={selectIcon}
        />
      ) : null}
    </>
  );
}
