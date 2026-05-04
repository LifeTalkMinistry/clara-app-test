import { PiggyBank, ReceiptText, TrendingUp } from "lucide-react";
import EmergencyFundCard from "../EmergencyFundCard";
import BudgetCard from "../BudgetCard";
import SavingsCard from "../SavingsCard";
import useFinancialCarouselLogic from "./hooks/useFinancialCarouselLogic";

const comingSoonIconMap = {
  investmentFund: TrendingUp,
  debtObligations: ReceiptText,
};

const getFinanceSlideShellClass = (cardKey, theme = null, scale = null) => {
  const toneClassMap = {
    budget:
      theme?.tokens?.financeBudgetShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),linear-gradient(135deg,rgba(4,25,24,0.96),rgba(3,19,18,0.98))] shadow-[0_28px_85px_rgba(16,185,129,0.16)]",
    emergencyFund:
      theme?.tokens?.financeEmergencyShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(4,17,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.16)]",
    savingsGoals:
      theme?.tokens?.financeSavingsShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_34%),linear-gradient(135deg,rgba(8,18,52,0.96),rgba(7,15,38,0.98))] shadow-[0_28px_85px_rgba(59,130,246,0.16)]",
    investmentFund:
      theme?.tokens?.financeInvestmentShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_34%),linear-gradient(135deg,rgba(29,18,8,0.96),rgba(18,11,8,0.98))] shadow-[0_28px_85px_rgba(245,158,11,0.16)]",
    debtObligations:
      theme?.tokens?.financeDebtShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.16),transparent_34%),linear-gradient(135deg,rgba(40,12,18,0.96),rgba(18,8,14,0.98))] shadow-[0_28px_85px_rgba(244,63,94,0.13)]",
  };

  return [
    "relative w-full overflow-hidden border backdrop-blur-2xl",
    scale?.financeSlide || "min-h-[286px] rounded-[28px] [&>*]:min-h-[284px] [&>*]:rounded-[27px]",
    toneClassMap[cardKey] || toneClassMap.budget,
  ].join(" ");
};

const getComingSoonShellClass = (tone = "emerald") => {
  const toneMap = {
    emerald:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_36%),linear-gradient(135deg,rgba(4,25,24,0.94),rgba(3,14,24,0.98))]",
    teal:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_36%),linear-gradient(135deg,rgba(4,23,30,0.94),rgba(3,14,24,0.98))]",
    blue:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_36%),linear-gradient(135deg,rgba(8,18,52,0.94),rgba(3,14,24,0.98))]",
    gold:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_36%),linear-gradient(135deg,rgba(29,18,8,0.94),rgba(3,14,24,0.98))]",
    rose:
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.15),transparent_36%),linear-gradient(135deg,rgba(40,12,18,0.94),rgba(3,14,24,0.98))]",
  };

  return toneMap[tone] || toneMap.emerald;
};

const ComingSoonCard = ({ item }) => {
  const Icon = comingSoonIconMap[item?.key] || PiggyBank;
  const data = item?.data || {};

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col justify-between overflow-hidden rounded-[inherit] border p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl ${getComingSoonShellClass(item?.tone)}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
          {data.ctaLabel || "Coming soon"}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              CLARA Financial Carousel
            </p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
              {data.title || item?.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {data.subtitle || "This card is ready for future finance data."}
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-white/80 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 rounded-3xl border border-white/12 bg-white/[0.055] p-4">
        <p className="text-sm leading-6 text-white/64">
          {data.description ||
            "Future edits for this card now live inside src/components/financial-carousel only."}
        </p>
      </div>
    </div>
  );
};

const CarouselItemCard = (props) => {
  const { item } = props;

  if (!item) return null;

  if (item.type === "emergencyFund") {
    return <EmergencyFundCard {...props} {...item.data} />;
  }

  if (item.type === "budget") {
    return <BudgetCard {...props} {...item.data} />;
  }

  if (item.type === "savingsGoals") {
    return <SavingsCard {...props} {...item.data} />;
  }

  return <ComingSoonCard item={item} />;
};

export default function FinancialCarousel(props) {
  const {
    items,
    activeIndex,
    carouselRef,
    handleScroll,
    scrollToIndex,
  } = useFinancialCarouselLogic(props);

  if (!items.length) return null;

  return (
    <>
      <div className={`overflow-hidden ${props.dashboardScale?.financeClip || "rounded-[28px]"}`}>
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex touch-pan-x items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.key} className="flex w-full min-w-full shrink-0 snap-center">
              <div className={getFinanceSlideShellClass(item.key, props.selectedDashboardTheme, props.dashboardScale)}>
                <CarouselItemCard {...props} item={item} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex items-center justify-center ${props.dashboardScale?.dots || "gap-1.5 pt-1.5 pb-3"}`}>
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to ${item.label} card`}
            className={`h-2 rounded-full transition-all duration-200 ${
              activeIndex === index
                ? `w-5 ${props.selectedDashboardTheme?.indicatorActive || "bg-emerald-400"}`
                : `w-2 ${props.themeInactiveDotClass || "bg-white/20"}`
            }`}
          />
        ))}
      </div>
    </>
  );
}
