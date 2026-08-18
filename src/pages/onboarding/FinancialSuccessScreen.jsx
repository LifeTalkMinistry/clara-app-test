import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";

const SLIDE_COUNT = 7;

function FinancialSuccessCard({ slideNumber, children }) {
  return (
    <section
      className={`clara-financial-success-card is-slide-${slideNumber}`}
      aria-label={`CLARA financial success idea ${slideNumber} of ${SLIDE_COUNT}`}
    >
      <div className="clara-financial-success-card-header">
        <span className="clara-financial-success-card-brand">
          <ClaraBrandName />
        </span>
        <span className="clara-financial-success-card-index">
          {String(slideNumber).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
        </span>
      </div>
      <div className="clara-financial-success-card-body">{children}</div>
    </section>
  );
}

function ReflectionSlide() {
  return (
    <FinancialSuccessCard slideNumber={1}>
      <div className="clara-financial-success-slide-content">
        <h1 className="clara-financial-success-title clara-financial-success-title--question clara-financial-success-title--flush">
          What really defines financial success?
        </h1>
      </div>
    </FinancialSuccessCard>
  );
}

function PressureSlide() {
  return (
    <FinancialSuccessCard slideNumber={2}>
      <div className="clara-financial-success-slide-content">
        <span className="clara-financial-success-kicker clara-financial-success-kicker--soft-red">
          The pressure we absorb
        </span>
        <h1 className="clara-financial-success-title">
          Sometimes success quietly turns into comparison.
        </h1>
        <p className="clara-financial-success-copy">
          We see someone earning or owning more — and suddenly what we have feels smaller.
        </p>
      </div>
    </FinancialSuccessCard>
  );
}

function WorthSlide() {
  return (
    <FinancialSuccessCard slideNumber={3}>
      <div className="clara-financial-success-slide-content">
        <h1 className="clara-financial-success-title clara-financial-success-title--statement clara-financial-success-title--flush">
          Someone having more doesn&apos;t make what you have worth less.
        </h1>
        <p className="clara-financial-success-copy clara-financial-success-copy--emphasis">
          Whatever your income is, it already matters.
        </p>
      </div>
    </FinancialSuccessCard>
  );
}

function BeliefSlide() {
  return (
    <FinancialSuccessCard slideNumber={4}>
      <div className="clara-financial-success-slide-content">
        <span className="clara-financial-success-kicker">
          What <ClaraBrandName /> believes
        </span>
        <h1 className="clara-financial-success-title clara-financial-success-title--belief">
          What you have already matters.
        </h1>
        <p className="clara-financial-success-copy">
          Financial success doesn&apos;t begin when you finally have more.
        </p>
      </div>
    </FinancialSuccessCard>
  );
}

function RecognizeSlide() {
  return (
    <FinancialSuccessCard slideNumber={5}>
      <div className="clara-financial-success-slide-content">
        <h1 className="clara-financial-success-title clara-financial-success-title--statement clara-financial-success-title--flush">
          Recognize what you already have.
        </h1>
        <p className="clara-financial-success-copy">
          What you worked for deserves to be acknowledged.
        </p>
      </div>
    </FinancialSuccessCard>
  );
}

function FrameworkSlide() {
  return (
    <FinancialSuccessCard slideNumber={6}>
      <div className="clara-financial-success-slide-content">
        <h1 className="clara-financial-success-title clara-financial-success-title--statement clara-financial-success-title--framework clara-financial-success-title--flush">
          Protect it. Direct it. Grow from there.
        </h1>
      </div>
    </FinancialSuccessCard>
  );
}

function GrowthSlide() {
  return (
    <FinancialSuccessCard slideNumber={7}>
      <div className="clara-financial-success-slide-content">
        <h1 className="clara-financial-success-title clara-financial-success-title--statement clara-financial-success-title--flush">
          Growth still matters.
        </h1>
        <p className="clara-financial-success-copy clara-financial-success-copy--closing">
          But comparison is no longer the definition of success.
        </p>
        <p
          className="clara-financial-success-path clara-financial-success-path--full"
          aria-label="Recognize, Protect, Direct, Grow"
        >
          Recognize <span aria-hidden="true">→</span> Protect <span aria-hidden="true">→</span> Direct <span aria-hidden="true">→</span> Grow
        </p>
      </div>
    </FinancialSuccessCard>
  );
}

export default function FinancialSuccessScreen() {
  const reduceMotion = useReducedMotion();
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goToSlide = (nextIndex) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, SLIDE_COUNT - 1));
    if (boundedIndex === slideIndex) return;
    setDirection(boundedIndex > slideIndex ? 1 : -1);
    setSlideIndex(boundedIndex);
  };

  const renderSlide = () => {
    switch (slideIndex) {
      case 0:
        return <ReflectionSlide />;
      case 1:
        return <PressureSlide />;
      case 2:
        return <WorthSlide />;
      case 3:
        return <BeliefSlide />;
      case 4:
        return <RecognizeSlide />;
      case 5:
        return <FrameworkSlide />;
      default:
        return <GrowthSlide />;
    }
  };

  const navLabels = [
    "Swipe to continue",
    "Keep exploring",
    "Keep exploring",
    "CLARA's belief",
    "Recognize",
    "CLARA's framework",
    "Continue",
  ];
  const navLabel = navLabels[slideIndex];

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
          width: min(100%, 420px);
          min-height: 455px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          touch-action: pan-y;
        }

        .clara-financial-success-slide {
          width: 100%;
          flex: 0 0 100%;
          display: flex;
          justify-content: center;
          cursor: grab;
        }

        .clara-financial-success-slide:active {
          cursor: grabbing;
        }

        .clara-financial-success-card {
          position: relative;
          width: min(calc(100% - 24px), 386px);
          min-height: 390px;
          overflow: hidden;
          border: 1px solid rgba(93, 153, 238, .22);
          border-radius: 28px;
          background:
            radial-gradient(circle at 86% 0%, rgba(57, 125, 232, .12), transparent 32%),
            linear-gradient(155deg, rgba(13, 31, 62, .94), rgba(5, 14, 32, .985) 62%, rgba(7, 18, 39, .97));
          box-shadow:
            0 28px 68px rgba(0, 0, 0, .34),
            inset 0 1px 0 rgba(255, 255, 255, .045),
            0 0 0 1px rgba(45, 103, 190, .04);
          isolation: isolate;
        }

        .clara-financial-success-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, .95),
            rgba(96, 165, 250, .8) 42%,
            rgba(250, 204, 21, .74) 70%,
            rgba(248, 113, 113, .72)
          );
          opacity: .72;
          pointer-events: none;
        }

        .clara-financial-success-card::after {
          content: "";
          position: absolute;
          z-index: -1;
          width: 210px;
          height: 210px;
          right: -115px;
          top: -110px;
          border-radius: 999px;
          background: rgba(59, 130, 246, .1);
          filter: blur(34px);
          pointer-events: none;
        }

        .clara-financial-success-card-header {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 15px 18px 12px;
          border-bottom: 1px solid rgba(106, 155, 225, .1);
        }

        .clara-financial-success-card-brand {
          display: inline-flex;
          align-items: center;
          color: rgba(236, 244, 255, .92);
          font-size: 10px;
          font-weight: 920;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .clara-financial-success-card-index {
          color: rgba(151, 183, 228, .55);
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .12em;
        }

        .clara-financial-success-card-body {
          min-height: 340px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 26px 22px 30px;
        }

        .clara-financial-success-slide-content {
          width: 100%;
          min-height: 245px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .clara-financial-success-kicker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: rgba(250, 204, 21, .82);
          font-size: 8.5px;
          font-weight: 930;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .clara-financial-success-kicker--soft-red {
          color: rgba(248, 148, 148, .74);
        }

        .clara-financial-success-title {
          max-width: 345px;
          margin-top: 15px;
          color: #f8fbff;
          font-size: clamp(1.72rem, 7vw, 2.18rem);
          font-weight: 950;
          line-height: 1.02;
          letter-spacing: -.043em;
          text-wrap: balance;
        }

        .clara-financial-success-title--question {
          max-width: 330px;
          font-size: clamp(2rem, 8.35vw, 2.5rem);
          line-height: .99;
        }

        .clara-financial-success-title--statement {
          max-width: 340px;
          font-size: clamp(1.95rem, 8vw, 2.42rem);
          line-height: 1;
        }

        .clara-financial-success-title--belief {
          max-width: 340px;
          font-size: clamp(2rem, 8.2vw, 2.52rem);
          line-height: .98;
        }

        .clara-financial-success-title--framework {
          max-width: 325px;
        }

        .clara-financial-success-title--flush {
          margin-top: 0;
        }

        .clara-financial-success-copy {
          max-width: 330px;
          margin-top: 15px;
          color: rgba(205, 220, 242, .66);
          font-size: 12px;
          font-weight: 620;
          line-height: 1.55;
          text-wrap: balance;
        }

        .clara-financial-success-copy--emphasis {
          max-width: 290px;
          color: rgba(229, 238, 251, .78);
          font-size: 13px;
          font-weight: 720;
        }

        .clara-financial-success-copy--closing {
          max-width: 310px;
          font-size: 12.5px;
        }

        .clara-financial-success-path {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 7px;
          max-width: 330px;
          margin-top: 21px;
          color: rgba(190, 209, 235, .58);
          font-size: 11.5px;
          font-weight: 680;
          line-height: 1.4;
        }

        .clara-financial-success-path span {
          color: rgba(105, 165, 255, .72);
        }

        .clara-financial-success-path--full {
          margin-top: 22px;
          font-size: 9.5px;
        }

        .clara-financial-success-mini-nav {
          width: min(calc(100% - 24px), 386px);
          display: grid;
          grid-template-columns: 34px 1fr 34px;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }

        .clara-financial-success-mini-arrow {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(112, 161, 230, .18);
          border-radius: 999px;
          background: rgba(17, 38, 72, .38);
          color: rgba(185, 211, 247, .76);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025);
          transition: opacity .2s ease, background .2s ease, transform .2s ease;
        }

        .clara-financial-success-mini-arrow:disabled {
          opacity: .16;
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
          min-width: 0;
          flex-direction: column;
          align-items: center;
          gap: 7px;
        }

        .clara-financial-success-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .clara-financial-success-dot {
          width: 5px;
          height: 5px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(120, 151, 198, .27);
          transition: width .25s ease, background .25s ease, box-shadow .25s ease;
        }

        .clara-financial-success-dot.is-active {
          width: 18px;
          background: #69a5ff;
          box-shadow: 0 0 12px rgba(76, 147, 255, .38);
        }

        .clara-financial-success-nav-label {
          max-width: 100%;
          overflow: hidden;
          color: rgba(155, 184, 225, .5);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .11em;
          text-align: center;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }

        @media (max-width: 360px) {
          .clara-financial-success-card,
          .clara-financial-success-mini-nav {
            width: min(calc(100% - 16px), 386px);
          }

          .clara-financial-success-card-body {
            padding-inline: 17px;
          }

          .clara-financial-success-title--statement {
            font-size: clamp(1.78rem, 7.7vw, 2.2rem);
          }
        }

        @media (max-height: 760px) {
          .clara-financial-success-viewport { min-height: 405px; }
          .clara-financial-success-card { min-height: 350px; border-radius: 24px; }
          .clara-financial-success-card-header { min-height: 43px; padding: 12px 16px 10px; }
          .clara-financial-success-card-body { min-height: 305px; padding: 20px 18px 23px; }
          .clara-financial-success-slide-content { min-height: 215px; }
          .clara-financial-success-title { margin-top: 11px; font-size: clamp(1.55rem, 6.8vw, 1.98rem); }
          .clara-financial-success-title--question { font-size: clamp(1.82rem, 7.7vw, 2.22rem); }
          .clara-financial-success-title--statement { font-size: clamp(1.72rem, 7.2vw, 2.08rem); }
          .clara-financial-success-title--belief { font-size: clamp(1.8rem, 7.4vw, 2.2rem); }
          .clara-financial-success-title--flush { margin-top: 0; }
          .clara-financial-success-copy { margin-top: 10px; line-height: 1.45; }
          .clara-financial-success-path { margin-top: 16px; }
          .clara-financial-success-path--full { margin-top: 17px; }
          .clara-financial-success-mini-nav { margin-top: 8px; }
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

      <div
        className="clara-financial-success-mini-nav"
        aria-label="Financial success belief slides"
      >
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
