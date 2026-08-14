import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";
import { useAuth } from "@/context/AuthContext";

const BETA_WELCOME_COMPLETE_PREFIX = "clara_founding_beta_welcome_complete_v1";

const BETA_BEATS = [
  {
    eyebrow: "A note before we begin",
    title: (
      <>
        You&apos;re one of the <span>very first.</span>
      </>
    ),
    body: (
      <>
        Before <ClaraBrandName /> reaches more people, you&apos;re among the first real users invited to experience it.
      </>
    ),
    closing: "That means more to our team than you may realize.",
  },
  {
    eyebrow: <>From the <ClaraBrandName /> team</>,
    title: <>Thank you for giving <ClaraBrandName /> a real chance.</>,
    body: (
      <>
        Until now, <ClaraBrandName /> has been something we&apos;ve imagined, designed, rebuilt, tested, and believed in.
      </>
    ),
    secondary: (
      <>
        But nothing replaces a real person using it in real life. You may never know how much it means to our team to finally have people experiencing what we&apos;ve spent so long building.
      </>
    ),
  },
  {
    eyebrow: "You're part of the beginning",
    title: (
      <>
        You&apos;re helping shape what <span><ClaraBrandName /> becomes.</span>
      </>
    ),
    body: (
      <>
        Every moment that helps you, surprises you, feels confusing, or makes you think differently about money teaches us something no internal test can.
      </>
    ),
    closing: <>What you experience here may help shape the <ClaraBrandName /> that thousands of Filipinos use someday.</>,
  },
];

function completionKey(user) {
  const identity = user?.id || user?.email || "local";
  return `${BETA_WELCOME_COMPLETE_PREFIX}:${identity}`;
}

function rememberCompletion(user) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(completionKey(user), new Date().toISOString());
  } catch {
    // Storage restrictions must never block the official onboarding.
  }
}

function ClaraWordmark() {
  return (
    <div className="clara-beta-wordmark" aria-label="CLARA">
      <span className="clara-beta-blue">CL</span>
      <span className="clara-beta-gold">A</span>
      <span className="clara-beta-red">RA</span>
    </div>
  );
}

export default function FoundingBetaWelcome() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const [beatIndex, setBeatIndex] = useState(0);
  const beat = BETA_BEATS[beatIndex];
  const isLast = beatIndex === BETA_BEATS.length - 1;

  const continueWelcome = () => {
    if (!isLast) {
      setBeatIndex((current) => Math.min(current + 1, BETA_BEATS.length - 1));
      return;
    }

    rememberCompletion(user);
    navigate("/onboarding", { replace: true });
  };

  return (
    <div className="clara-founding-beta-welcome">
      <style>{`
        body:has(.clara-founding-beta-welcome) [data-clara-support-bubble],
        body:has(.clara-founding-beta-welcome) [data-clara-support-modal] {
          display: none !important;
        }

        .clara-founding-beta-welcome {
          position: fixed;
          inset: 0;
          z-index: 500;
          min-height: 100dvh;
          overflow: hidden;
          isolation: isolate;
          color: #f8fbff;
          background:
            radial-gradient(circle at 50% -10%, rgba(43,117,255,.20), transparent 38%),
            radial-gradient(circle at -12% 47%, rgba(43,117,255,.12), transparent 30%),
            radial-gradient(circle at 112% 72%, rgba(255,76,85,.08), transparent 27%),
            linear-gradient(180deg, #03091b 0%, #020617 50%, #01030b 100%);
          font-family: Inter, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        .clara-founding-beta-welcome::before,
        .clara-founding-beta-welcome::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .clara-founding-beta-welcome::before {
          z-index: -2;
          background: radial-gradient(circle at 50% 46%, transparent 0 48%, rgba(0,0,0,.34) 100%);
        }

        .clara-founding-beta-welcome::after {
          z-index: -1;
          opacity: .04;
          background-image: radial-gradient(rgba(255,255,255,.34) .4px, transparent .45px);
          background-size: 5px 5px;
          mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
        }

        .clara-beta-header {
          position: absolute;
          inset: 0 0 auto;
          z-index: 20;
          padding: max(env(safe-area-inset-top), 20px) 24px 0;
        }

        .clara-beta-header-inner,
        .clara-beta-footer-inner {
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
        }

        .clara-beta-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .clara-beta-wordmark {
          font-size: 13px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: .205em;
          text-transform: uppercase;
          filter: drop-shadow(0 0 12px rgba(43,117,255,.11));
        }

        .clara-beta-blue { color: #4d8cff; }
        .clara-beta-gold { color: #ffd42f; }
        .clara-beta-red { color: #ff4d55; }

        .clara-beta-counter {
          color: rgba(248,251,255,.58);
          font-size: 10px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: .17em;
          font-variant-numeric: tabular-nums;
        }

        .clara-beta-stage {
          position: relative;
          z-index: 10;
          display: flex;
          min-height: 100dvh;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
        }

        .clara-beta-stage::-webkit-scrollbar { display: none; }

        .clara-beta-screen {
          box-sizing: border-box;
          width: 100%;
          max-width: 430px;
          min-height: 100dvh;
          margin: 0 auto;
          padding: 106px 26px 116px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .clara-beta-logo-stage {
          position: relative;
          width: 118px;
          height: 118px;
          display: grid;
          place-items: center;
          margin-bottom: 27px;
        }

        .clara-beta-logo-halo {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(36,112,255,.22), rgba(36,112,255,.05) 47%, transparent 72%);
          filter: blur(18px);
        }

        .clara-beta-logo-mark {
          position: relative;
          transform: scale(1.58);
        }

        .clara-beta-eyebrow {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border: 1px solid rgba(255,210,70,.24);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(114,84,8,.075), rgba(44,31,4,.02));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025), 0 0 22px rgba(255,206,44,.04);
          color: #ffe28a;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: .20em;
          text-transform: uppercase;
        }

        .clara-beta-title {
          max-width: 385px;
          margin: 26px 0 0;
          color: #fbfdff;
          font-size: clamp(2.1rem, 9.1vw, 2.72rem);
          line-height: 1.035;
          font-weight: 680;
          letter-spacing: -.055em;
          text-wrap: balance;
          text-shadow: 0 12px 34px rgba(0,0,0,.18);
        }

        .clara-beta-title span { color: #8dbbff; }

        .clara-beta-body,
        .clara-beta-secondary,
        .clara-beta-closing {
          max-width: 355px;
          margin: 20px 0 0;
          color: rgba(238,245,255,.57);
          font-size: 14px;
          line-height: 1.72;
          font-weight: 420;
          letter-spacing: -.01em;
          text-wrap: balance;
        }

        .clara-beta-secondary {
          margin-top: 13px;
          color: rgba(238,245,255,.46);
          font-size: 13.5px;
        }

        .clara-beta-closing {
          position: relative;
          max-width: 340px;
          margin-top: 31px;
          padding-top: 27px;
          color: rgba(249,251,255,.82);
          font-size: 13.5px;
          line-height: 1.62;
          font-weight: 590;
        }

        .clara-beta-closing::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          width: 78px;
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(255,210,66,.58), transparent);
        }

        .clara-beta-closing::after {
          content: "";
          position: absolute;
          left: 50%;
          top: -1px;
          width: 3px;
          height: 3px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #ffe16b;
          box-shadow: 0 0 9px rgba(255,207,53,.48);
        }

        .clara-beta-beat-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 29px;
        }

        .clara-beta-beat-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255,255,255,.13);
          transition: width .32s ease, background .32s ease, box-shadow .32s ease;
        }

        .clara-beta-beat-dot.is-active {
          width: 20px;
          background: linear-gradient(90deg, #357cff, #79adff);
          box-shadow: 0 0 10px rgba(52,126,255,.28);
        }

        .clara-beta-footer {
          position: absolute;
          inset: auto 0 0;
          z-index: 20;
          padding: 36px 22px max(env(safe-area-inset-bottom), 18px);
          background: linear-gradient(180deg, transparent 0%, rgba(1,3,11,.78) 42%, #01030b 74%);
        }

        .clara-beta-continue {
          position: relative;
          width: 100%;
          height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          overflow: hidden;
          border: 1px solid rgba(102,162,255,.52);
          border-radius: 18px;
          outline: none;
          background: linear-gradient(112deg, #1854ed 0%, #256bff 48%, #2787ff 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.34), inset 0 -1px 0 rgba(0,32,105,.28), 0 16px 36px rgba(20,79,231,.25);
          color: #fff;
          font-size: 13px;
          font-weight: 680;
          letter-spacing: -.012em;
          transition: transform .16s ease, filter .16s ease, box-shadow .16s ease;
        }

        .clara-beta-continue::before {
          content: "";
          position: absolute;
          left: 12%;
          right: 12%;
          top: -1px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,216,71,.68), rgba(255,255,255,.46), transparent);
          opacity: .75;
        }

        .clara-beta-continue svg {
          width: 15px;
          height: 15px;
          transition: transform .18s ease;
        }

        .clara-beta-continue:hover { filter: brightness(1.05); }
        .clara-beta-continue:hover svg { transform: translateX(2px); }
        .clara-beta-continue:active { transform: scale(.985); }
        .clara-beta-continue:focus-visible {
          box-shadow: 0 0 0 3px rgba(88,153,255,.22), 0 16px 36px rgba(20,79,231,.25);
        }

        @media (max-height: 760px) {
          .clara-beta-screen { padding-top: 96px; padding-bottom: 102px; }
          .clara-beta-logo-stage { width: 92px; height: 92px; margin-bottom: 18px; }
          .clara-beta-logo-mark { transform: scale(1.32); }
          .clara-beta-title { margin-top: 21px; font-size: clamp(1.88rem, 8.3vw, 2.34rem); }
          .clara-beta-body { margin-top: 16px; }
          .clara-beta-closing { margin-top: 23px; padding-top: 21px; }
          .clara-beta-beat-progress { margin-top: 22px; }
          .clara-beta-footer { padding-top: 28px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-beta-beat-dot,
          .clara-beta-continue,
          .clara-beta-continue svg {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <header className="clara-beta-header">
        <div className="clara-beta-header-inner">
          <ClaraWordmark />
          <span className="clara-beta-counter">00 / 08</span>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={beatIndex}
          className="clara-beta-stage"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 9 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0.14 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <section className="clara-beta-screen">
            {beatIndex === 0 ? (
              <motion.div
                className="clara-beta-logo-stage"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.64, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="clara-beta-logo-halo" aria-hidden="true" />
                <div className="clara-beta-logo-mark">
                  <ClaraLogo variant="icon" theme="dark" />
                </div>
              </motion.div>
            ) : null}

            <span className="clara-beta-eyebrow">{beat.eyebrow}</span>
            <h1 className="clara-beta-title">{beat.title}</h1>
            <p className="clara-beta-body">{beat.body}</p>
            {beat.secondary ? <p className="clara-beta-secondary">{beat.secondary}</p> : null}
            {beat.closing ? <p className="clara-beta-closing">{beat.closing}</p> : null}

            <div
              className="clara-beta-beat-progress"
              aria-label={`Welcome message ${beatIndex + 1} of ${BETA_BEATS.length}`}
            >
              {BETA_BEATS.map((_, index) => (
                <span
                  key={index}
                  className={`clara-beta-beat-dot ${index === beatIndex ? "is-active" : ""}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </section>
        </motion.main>
      </AnimatePresence>

      <footer className="clara-beta-footer">
        <div className="clara-beta-footer-inner">
          <button type="button" onClick={continueWelcome} className="clara-beta-continue">
            <span>{isLast ? "Let’s begin" : "Continue"}</span>
            <ArrowRight />
          </button>
        </div>
      </footer>
    </div>
  );
}
