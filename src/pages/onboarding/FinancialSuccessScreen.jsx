import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
} from "@/lib/incomeHubRepository";

const FRAMEWORK = [
  { label: "Recognize", icon: CircleDot },
  { label: "Protect", icon: ShieldCheck },
  { label: "Direct", icon: ArrowRight },
  { label: "Grow", icon: TrendingUp },
];

const SLIDE_COUNT = 3;

function toPositiveNumber(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function firstPositive(...values) {
  for (const value of values) {
    const number = toPositiveNumber(value);
    if (number > 0) return number;
  }
  return 0;
}

function knownMonthlyIncomeFromProfile(profile, user) {
  return firstPositive(
    profile?.monthlyIncome,
    profile?.monthly_income,
    profile?.expectedMonthlyIncome,
    profile?.expected_monthly_income,
    user?.user_metadata?.monthlyIncome,
    user?.user_metadata?.monthly_income,
    user?.user_metadata?.expectedMonthlyIncome,
    user?.user_metadata?.expected_monthly_income,
  );
}

function monthlyIncomeFromSource(source = {}) {
  const explicitMonthlyAmount = firstPositive(
    source.expectedMonthlyIncome,
    source.expected_monthly_income,
    source.monthlyAmount,
    source.monthly_amount,
  );
  if (explicitMonthlyAmount > 0) return explicitMonthlyAmount;

  const expectedPaydayAmount = firstPositive(
    source.minimumStableIncome,
    source.minimum_stable_income,
    source.minimumExpectedIncome,
    source.minimum_expected_income,
    source.expectedAmount,
    source.expected_amount,
  );
  if (expectedPaydayAmount <= 0) return 0;

  const recurrence =
    source.incomeRecurrence ||
    source.income_recurrence ||
    source.recurrenceRule ||
    source.recurrence_rule ||
    {};
  const type = String(
    recurrence.type || recurrence.recurrence || recurrence.frequency || "",
  )
    .trim()
    .toLowerCase();

  if (type === "monthly") return expectedPaydayAmount;
  if (type === "twice_monthly") return expectedPaydayAmount * 2;
  if (type === "weekly") return expectedPaydayAmount * (52 / 12);
  if (type === "biweekly") return expectedPaydayAmount * (26 / 12);
  return 0;
}

function formatMonthlyIncome(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function ReflectionSlide() {
  return (
    <div className="clara-financial-success-slide-content">
      <h1 className="clara-financial-success-title clara-financial-success-title--question clara-financial-success-title--reflection-only">
        What really defines financial success?
      </h1>
    </div>
  );
}

function ComparisonSlide({ knownMonthlyIncome }) {
  const hasKnownMonthlyIncome = knownMonthlyIncome > 0;

  return (
    <div className="clara-financial-success-slide-content">
      <span className="clara-financial-success-kicker clara-financial-success-kicker--soft-red">
        02 · The pressure we absorb
      </span>

      <h1 className="clara-financial-success-title">
        Sometimes success quietly turns into comparison.
      </h1>

      <p className="clara-financial-success-copy">
        We see someone earning more, owning more, or living differently — and what we have can suddenly feel small.
      </p>

      <div className="clara-financial-success-comparison" aria-label="Your income compared with someone who has more">
        <div className="clara-financial-success-comparison-side is-you">
          <span>Your income</span>
          <strong>{hasKnownMonthlyIncome ? formatMonthlyIncome(knownMonthlyIncome) : "What you earn"}</strong>
        </div>
        <div className="clara-financial-success-comparison-vs">vs.</div>
        <div className="clara-financial-success-comparison-side is-other">
          <span>Someone else</span>
          <strong>More</strong>
        </div>
      </div>

      <p className="clara-financial-success-comparison-truth">
        Nothing about what you worked for became less valuable.
        <strong>Only the comparison got louder.</strong>
      </p>

      <p className="clara-financial-success-note">
        Wanting to grow isn&apos;t the problem. Letting someone else&apos;s life decide whether yours already matters is.
      </p>
    </div>
  );
}

function ClaraBeliefSlide({ knownMonthlyIncome }) {
  const hasKnownMonthlyIncome = knownMonthlyIncome > 0;

  return (
    <div className="clara-financial-success-slide-content">
      <span className="clara-financial-success-kicker">
        <Sparkles strokeWidth={1.8} /> 03 · What <ClaraBrandName /> believes
      </span>

      <h1 className="clara-financial-success-title clara-financial-success-title--clara">
        {hasKnownMonthlyIncome
          ? `${formatMonthlyIncome(knownMonthlyIncome)} already matters.`
          : "What you have already matters."}
      </h1>

      <p className="clara-financial-success-copy clara-financial-success-copy--clara">
        <ClaraBrandName /> doesn&apos;t teach that success starts once you have more. It teaches you to recognize what you have, protect it, direct it intentionally, and grow from there.
      </p>

      <div className="clara-financial-success-framework" aria-label="Recognize, Protect, Direct, Grow">
        {FRAMEWORK.map(({ label, icon: Icon }) => (
          <div key={label} className="clara-financial-success-step">
            <Icon strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="clara-financial-success-closing">
        <strong>Growth still matters.</strong>
        But comparison is no longer the definition of success.
      </p>
    </div>
  );
}

export default function FinancialSuccessScreen({ user, profile }) {
  const reduceMotion = useReducedMotion();
  const profileMonthlyIncome = useMemo(
    () => knownMonthlyIncomeFromProfile(profile, user),
    [profile, user],
  );
  const [knownMonthlyIncome, setKnownMonthlyIncome] = useState(profileMonthlyIncome);
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const localUserId = getIncomeHubLocalUserId(user);

    const readKnownIncome = async () => {
      if (profileMonthlyIncome > 0) {
        if (!cancelled) setKnownMonthlyIncome(profileMonthlyIncome);
        return;
      }

      try {
        const sources = await getIncomeSources(localUserId);
        const monthlyTotal = (Array.isArray(sources) ? sources : [])
          .filter(
            (source) =>
              !source?.isArchived &&
              !source?.is_archived &&
              !source?.deletedAt &&
              !source?.deleted_at,
          )
          .reduce((sum, source) => sum + monthlyIncomeFromSource(source), 0);

        if (!cancelled) setKnownMonthlyIncome(monthlyTotal > 0 ? monthlyTotal : 0);
      } catch {
        if (!cancelled) setKnownMonthlyIncome(0);
      }
    };

    void readKnownIncome();

    const handleIncomeUpdate = () => void readKnownIncome();
    if (typeof window !== "undefined") {
      window.addEventListener("clara-income-hub-updated", handleIncomeUpdate);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("clara-income-hub-updated", handleIncomeUpdate);
      }
    };
  }, [profileMonthlyIncome, user]);

  const goToSlide = (nextIndex) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, SLIDE_COUNT - 1));
    if (boundedIndex === slideIndex) return;
    setDirection(boundedIndex > slideIndex ? 1 : -1);
    setSlideIndex(boundedIndex);
  };

  const renderSlide = () => {
    if (slideIndex === 0) return <ReflectionSlide />;
    if (slideIndex === 1) {
      return <ComparisonSlide knownMonthlyIncome={knownMonthlyIncome} />;
    }
    return <ClaraBeliefSlide knownMonthlyIncome={knownMonthlyIncome} />;
  };

  const navLabel =
    slideIndex === 0
      ? "Swipe when you're ready"
      : slideIndex === 1
        ? "One more idea"
        : "CLARA's way";

  return (
    <div
      className="clara-onboarding-screen clara-financial-success-screen"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") goToSlide(slideIndex - 1);
        if (event.key === "ArrowRight") goToSlide(slideIndex + 1);
      }}
    >
      <style>{`
        .clara-financial-success-screen {
          justify-content: center;
          outline: none;
        }

        .clara-financial-success-viewport {
          width: min(100%, 410px);
          min-height: 420px;
          display: flex;
          align-items: center;
          overflow: hidden;
          touch-action: pan-y;
        }

        .clara-financial-success-slide {
          width: 100%;
          flex: 0 0 100%;
          cursor: grab;
        }

        .clara-financial-success-slide:active {
          cursor: grabbing;
        }

        .clara-financial-success-slide-content {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .clara-financial-success-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(250, 204, 21, .82);
          font-size: 9px;
          font-weight: 930;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .clara-financial-success-kicker--muted {
          color: rgba(144, 181, 239, .72);
        }

        .clara-financial-success-kicker--soft-red {
          color: rgba(248, 148, 148, .74);
        }

        .clara-financial-success-kicker svg {
          width: 13px;
          height: 13px;
        }

        .clara-financial-success-title {
          max-width: 390px;
          margin-top: 16px;
          color: #f8fbff;
          font-size: clamp(1.8rem, 7.8vw, 2.38rem);
          font-weight: 950;
          line-height: 1.02;
          letter-spacing: -.043em;
          text-wrap: balance;
        }

        .clara-financial-success-title--question {
          max-width: 360px;
          font-size: clamp(2.02rem, 8.6vw, 2.62rem);
          line-height: .99;
        }

        .clara-financial-success-title--reflection-only {
          margin-top: 0;
        }

        .clara-financial-success-title--clara {
          font-size: clamp(2rem, 8.4vw, 2.58rem);
        }

        .clara-financial-success-copy {
          max-width: 360px;
          margin-top: 15px;
          color: rgba(205, 220, 242, .66);
          font-size: 12.5px;
          font-weight: 620;
          line-height: 1.58;
          text-wrap: balance;
        }

        .clara-financial-success-copy--lead {
          max-width: 345px;
          color: rgba(218, 230, 248, .72);
          font-size: 13px;
          line-height: 1.62;
        }

        .clara-financial-success-copy--clara {
          color: rgba(214, 226, 244, .72);
          font-size: 13px;
        }

        .clara-financial-success-reflection-words {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 7px 10px;
          margin-top: 24px;
          color: rgba(151, 190, 244, .66);
          font-size: 10px;
          font-weight: 840;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .clara-financial-success-reflection-words span {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .clara-financial-success-reflection-words i {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: rgba(103, 161, 242, .34);
        }

        .clara-financial-success-reflection-note {
          max-width: 335px;
          margin-top: 25px;
          padding-top: 16px;
          border-top: 1px solid rgba(111, 157, 222, .11);
          color: rgba(183, 204, 233, .52);
          font-size: 10.5px;
          font-weight: 620;
          line-height: 1.58;
          text-wrap: balance;
        }

        .clara-financial-success-comparison {
          width: min(100%, 370px);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 34px minmax(0, 1fr);
          align-items: stretch;
          gap: 7px;
          margin-top: 20px;
        }

        .clara-financial-success-comparison-side {
          display: flex;
          min-width: 0;
          min-height: 80px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 8px;
          border: 1px solid rgba(105, 151, 219, .14);
          border-radius: 17px;
          background: rgba(12, 29, 57, .38);
        }

        .clara-financial-success-comparison-side.is-other {
          border-color: rgba(248, 148, 148, .13);
          background: rgba(55, 23, 34, .18);
        }

        .clara-financial-success-comparison-side span {
          color: rgba(169, 192, 226, .56);
          font-size: 8px;
          font-weight: 840;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .clara-financial-success-comparison-side strong {
          overflow: hidden;
          max-width: 100%;
          color: #f5f8ff;
          font-size: 14px;
          font-weight: 920;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .clara-financial-success-comparison-side.is-other strong {
          color: rgba(255, 185, 185, .9);
        }

        .clara-financial-success-comparison-vs {
          display: grid;
          place-items: center;
          color: rgba(168, 190, 223, .4);
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .clara-financial-success-comparison-truth {
          max-width: 345px;
          margin-top: 17px;
          color: rgba(220, 231, 247, .66);
          font-size: 11.5px;
          font-weight: 660;
          line-height: 1.52;
          text-wrap: balance;
        }

        .clara-financial-success-comparison-truth strong {
          display: block;
          margin-top: 2px;
          color: #f7fbff;
          font-size: 12.5px;
          font-weight: 900;
        }

        .clara-financial-success-note {
          max-width: 355px;
          margin-top: 17px;
          padding-top: 14px;
          border-top: 1px solid rgba(113, 157, 222, .11);
          color: rgba(190, 209, 235, .54);
          font-size: 10.25px;
          font-weight: 620;
          line-height: 1.55;
          text-wrap: balance;
        }

        .clara-financial-success-framework {
          width: min(100%, 390px);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-top: 21px;
        }

        .clara-financial-success-step {
          min-width: 0;
          display: grid;
          justify-items: center;
          gap: 7px;
          padding: 11px 5px 10px;
          border: 1px solid rgba(96, 165, 250, .15);
          border-radius: 15px;
          background: linear-gradient(180deg, rgba(25, 49, 88, .34), rgba(8, 20, 43, .46));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .028);
        }

        .clara-financial-success-step svg {
          width: 15px;
          height: 15px;
          color: rgba(117, 169, 255, .86);
        }

        .clara-financial-success-step:nth-child(2) svg {
          color: rgba(250, 204, 21, .86);
        }

        .clara-financial-success-step:nth-child(4) svg {
          color: rgba(248, 113, 113, .82);
        }

        .clara-financial-success-step span {
          overflow: hidden;
          color: rgba(235, 243, 255, .78);
          font-size: 9px;
          font-weight: 850;
          text-overflow: ellipsis;
        }

        .clara-financial-success-closing {
          max-width: 350px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid rgba(121, 170, 255, .14);
          color: rgba(225, 235, 249, .62);
          font-size: 11px;
          font-weight: 650;
          line-height: 1.5;
          text-wrap: balance;
        }

        .clara-financial-success-closing strong {
          display: block;
          margin-bottom: 3px;
          color: #f6f9ff;
          font-size: 13px;
          font-weight: 880;
        }

        .clara-financial-success-mini-nav {
          width: min(100%, 390px);
          display: grid;
          grid-template-columns: 34px 1fr 34px;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }

        .clara-financial-success-mini-arrow {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(112, 161, 230, .16);
          border-radius: 999px;
          background: rgba(17, 38, 72, .34);
          color: rgba(185, 211, 247, .7);
          transition: opacity .2s ease, background .2s ease, transform .2s ease;
        }

        .clara-financial-success-mini-arrow:disabled {
          opacity: .18;
        }

        .clara-financial-success-mini-arrow:not(:disabled):active {
          transform: scale(.94);
        }

        .clara-financial-success-mini-arrow svg {
          width: 14px;
          height: 14px;
        }

        .clara-financial-success-mini-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
        }

        .clara-financial-success-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .clara-financial-success-dot {
          width: 6px;
          height: 6px;
          border: 0;
          border-radius: 999px;
          background: rgba(120, 151, 198, .27);
          transition: width .25s ease, background .25s ease, box-shadow .25s ease;
        }

        .clara-financial-success-dot.is-active {
          width: 22px;
          background: #69a5ff;
          box-shadow: 0 0 12px rgba(76, 147, 255, .38);
        }

        .clara-financial-success-nav-label {
          color: rgba(145, 172, 211, .45);
          font-size: 8px;
          font-weight: 780;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        @media (max-height: 760px) {
          .clara-financial-success-viewport { min-height: 385px; }
          .clara-financial-success-title { margin-top: 12px; font-size: clamp(1.62rem, 7vw, 2.08rem); }
          .clara-financial-success-title--question { font-size: clamp(1.82rem, 7.8vw, 2.28rem); }
          .clara-financial-success-title--reflection-only { margin-top: 0; }
          .clara-financial-success-copy { margin-top: 10px; line-height: 1.45; }
          .clara-financial-success-reflection-words { margin-top: 18px; }
          .clara-financial-success-reflection-note { margin-top: 19px; padding-top: 12px; }
          .clara-financial-success-comparison { margin-top: 14px; }
          .clara-financial-success-comparison-side { min-height: 70px; }
          .clara-financial-success-comparison-truth { margin-top: 12px; }
          .clara-financial-success-note { margin-top: 12px; padding-top: 10px; }
          .clara-financial-success-framework { margin-top: 14px; }
          .clara-financial-success-closing { margin-top: 13px; padding-top: 10px; }
        }
      `}</style>

      <div className="clara-financial-success-viewport" aria-live="polite">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={slideIndex}
            custom={direction}
            className="clara-financial-success-slide"
            drag={reduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (info.offset.x <= -48) goToSlide(slideIndex + 1);
              if (info.offset.x >= 48) goToSlide(slideIndex - 1);
            }}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction > 0 ? 34 : -34 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction > 0 ? -24 : 24 }
            }
            transition={{
              duration: reduceMotion ? 0.14 : 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="clara-financial-success-mini-nav" aria-label="Financial success belief slides">
        <button
          type="button"
          className="clara-financial-success-mini-arrow"
          onClick={() => goToSlide(slideIndex - 1)}
          disabled={slideIndex === 0}
          aria-label="Previous idea"
        >
          <ArrowLeft />
        </button>

        <div className="clara-financial-success-mini-center">
          <div className="clara-financial-success-dots">
            {Array.from({ length: SLIDE_COUNT }, (_, index) => (
              <button
                key={index}
                type="button"
                className={`clara-financial-success-dot ${index === slideIndex ? "is-active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Show idea ${index + 1} of ${SLIDE_COUNT}`}
                aria-current={index === slideIndex ? "step" : undefined}
              />
            ))}
          </div>
          <span className="clara-financial-success-nav-label">{navLabel}</span>
        </div>

        <button
          type="button"
          className="clara-financial-success-mini-arrow"
          onClick={() => goToSlide(slideIndex + 1)}
          disabled={slideIndex === SLIDE_COUNT - 1}
          aria-label="Next idea"
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}
