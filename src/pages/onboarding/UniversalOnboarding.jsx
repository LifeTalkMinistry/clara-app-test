import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Car,
  ChevronLeft,
  HeartHandshake,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";
import { useAuth } from "@/context/AuthContext";

const CLARA_ORB_PATH = "/community?view=orb";
const SUPPORT_BUBBLE_EPOCH_KEY = "clara_support_bubble_cycle_epoch_v2";
const OPEN_SUPPORT_AFTER_ONBOARDING_KEY = "clara_open_support_after_onboarding_v1";
const MISSION_ONBOARDING_COMPLETE_PREFIX = "clara_mission_onboarding_complete_v1";

const SCREEN_IDS = [
  "country",
  "quiet-spending",
  "spending-impact",
  "before",
  "personal",
  "clara",
  "mission",
  "support",
  "rule",
];

const CLARA_WORDMARK_LETTERS = [
  { char: "C", tone: "blue" },
  { char: "L", tone: "blue" },
  { char: "A", tone: "gold" },
  { char: "R", tone: "red" },
  { char: "A", tone: "red" },
];

function firstNameFrom(profile, user) {
  const rawName =
    profile?.full_name ||
    profile?.display_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "";

  const firstName = String(rawName).trim().split(/\s+/)[0];
  if (firstName) return firstName;

  const emailPrefix = String(user?.email || "").split("@")[0].trim();
  return emailPrefix || "there";
}

function completionKey(user) {
  const identity = user?.id || user?.email || "local";
  return `${MISSION_ONBOARDING_COMPLETE_PREFIX}:${identity}`;
}

function rememberCompletion(user) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(completionKey(user), new Date().toISOString());
  } catch {
    // Onboarding should never fail because storage is unavailable.
  }
}

function ClaraWordmark({ className = "", animateLetters = false, reduceMotion = false }) {
  const rootClassName = `clara-onboarding-wordmark ${
    animateLetters ? "clara-onboarding-wordmark--animated " : ""
  }${className}`;

  if (!animateLetters) {
    return (
      <div className={rootClassName} aria-label="CLARA">
        <span className="clara-onboarding-wordmark-blue">CL</span>
        <span className="clara-onboarding-wordmark-gold">A</span>
        <span className="clara-onboarding-wordmark-red">RA</span>
      </div>
    );
  }

  return (
    <div className={rootClassName} aria-label="CLARA">
      {CLARA_WORDMARK_LETTERS.map(({ char, tone }, index) => {
        const revealDelay = 0.22 + index * 0.08;
        const floatDelay = 1.28 + index * 0.14;

        return (
          <motion.span
            key={`${char}-${index}`}
            className={`clara-onboarding-wordmark-letter clara-onboarding-wordmark-${tone}`}
            aria-hidden="true"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.965 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.58,
                    delay: revealDelay,
                    ease: [0.16, 1, 0.3, 1],
                  }
            }
          >
            <motion.span
              className="clara-onboarding-wordmark-letter-inner"
              animate={reduceMotion ? undefined : { y: [0, -2, 0, 1.5, 0] }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 3.2,
                      delay: floatDelay,
                      times: [0, 0.22, 0.52, 0.76, 1],
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "loop",
                    }
              }
            >
              {char}
            </motion.span>
          </motion.span>
        );
      })}
    </div>
  );
}

function AmbientField() {
  return (
    <div className="clara-onboarding-ambient" aria-hidden="true">
      <span className="clara-onboarding-ambient-blue" />
      <span className="clara-onboarding-ambient-red" />
      <span className="clara-onboarding-ambient-gold" />
      <span className="clara-onboarding-vignette" />
      <span className="clara-onboarding-grain" />
    </div>
  );
}

function Eyebrow({ children, tone = "blue" }) {
  return (
    <span className={`clara-onboarding-eyebrow clara-onboarding-eyebrow--${tone}`}>
      {children}
    </span>
  );
}

function AccentRule({ tone = "gold" }) {
  return <span className={`clara-onboarding-rule clara-onboarding-rule--${tone}`} aria-hidden="true" />;
}

function ScreenFrame({ children, align = "center", dense = false }) {
  return (
    <div
      className={`clara-onboarding-screen ${
        align === "left" ? "clara-onboarding-screen--left" : ""
      } ${dense ? "clara-onboarding-screen--dense" : ""}`}
    >
      {children}
    </div>
  );
}

function CountryScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>Why <ClaraBrandName /> exists</Eyebrow>
      <h1 className="clara-onboarding-title">Filipinos work hard for every peso.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        But earning money and knowing how to protect it are two different skills.
      </p>
      <AccentRule />
      <p className="clara-onboarding-closing">
        A country that works this hard deserves a better relationship with money.
      </p>
    </ScreenFrame>
  );
}

const QUIET_DECISIONS = [
  { label: "One quick ride", icon: Car },
  { label: "One small checkout", icon: ShoppingBag },
  { label: "One more delivery", icon: Package },
];

function QuietSpendingScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="red">The quiet problem</Eyebrow>
      <h1 className="clara-onboarding-title">Money rarely disappears in one dramatic moment.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        It happens through small decisions that feel harmless on their own — until they become a pattern.
      </p>
      <div className="clara-onboarding-chip-grid">
        {QUIET_DECISIONS.map(({ label, icon: Icon }) => (
          <span key={label} className="clara-onboarding-chip">
            <Icon className="clara-onboarding-chip-icon" strokeWidth={1.7} />
            <span>{label}</span>
          </span>
        ))}
      </div>
      <AccentRule tone="red" />
      <p className="clara-onboarding-payday">Then payday comes again.</p>
    </ScreenFrame>
  );
}

function SpendingImpactScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">Did you know?</Eyebrow>
      <div className="clara-onboarding-compare">
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--muted">
          <p className="clara-onboarding-kicker">Small unplanned spending</p>
          <p className="clara-onboarding-compare-copy">₱100–₱165 a day</p>
        </section>
        <AccentRule />
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara">
          <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">Over 30 days</p>
          <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero">
            ≈ ₱3,000–₱5,000
          </p>
        </section>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Imagine if that money became savings, an emergency fund, or progress toward a goal instead.
      </p>
    </ScreenFrame>
  );
}

function BeforeScreen() {
  return (
    <ScreenFrame>
      <Eyebrow><ClaraBrandName />&apos;s difference</Eyebrow>
      <div className="clara-onboarding-compare">
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--muted">
          <p className="clara-onboarding-kicker">Traditional tracking</p>
          <p className="clara-onboarding-compare-copy">Tells you what happened to your money.</p>
        </section>
        <AccentRule />
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara">
          <p className="clara-onboarding-kicker clara-onboarding-kicker--blue"><ClaraBrandName /></p>
          <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero">
            Helps you before the decision is made.
          </p>
        </section>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Because the most important moment in your budget is often the few seconds before you spend.
      </p>
    </ScreenFrame>
  );
}

function PersonalScreen({ firstName }) {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">Now it becomes personal</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--personal">
        {firstName}, your financial future is built one decision at a time.
      </h1>
      <div className="clara-onboarding-personal-list">
        <div className="clara-onboarding-personal-line">
          <span>Every “yes” matters.</span>
        </div>
        <div className="clara-onboarding-personal-line">
          <span>Every “not now” matters.</span>
        </div>
        <div className="clara-onboarding-personal-line clara-onboarding-personal-line--gold">
          <span>Every pause matters.</span>
        </div>
      </div>
    </ScreenFrame>
  );
}

function ClaraRevealScreen({ reduceMotion }) {
  return (
    <ScreenFrame>
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
        className="clara-onboarding-logo-stage"
      >
        <span className="clara-onboarding-logo-halo" aria-hidden="true" />
        <div className="clara-onboarding-logo-mark">
          <ClaraLogo variant="icon" theme="dark" />
        </div>
      </motion.div>
      <ClaraWordmark
        className="clara-onboarding-wordmark--hero"
        animateLetters
        reduceMotion={reduceMotion}
      />
      <p className="clara-onboarding-tagline">Ask before you spend.</p>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Your financial accountability companion for the moment between wanting something and deciding what is wise.
      </p>
    </ScreenFrame>
  );
}

const MISSION_STEPS = ["One person", "One decision", "One habit"];

function MissionScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">The bigger mission</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--mission">
        Better money decisions should become normal in the Philippines.
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        <ClaraBrandName /> exists to help build a generation of Filipinos who are wiser, more intentional, more disciplined, and better prepared financially.
      </p>
      <div className="clara-onboarding-mission-grid">
        {MISSION_STEPS.map((label, index) => (
          <div key={label} className="clara-onboarding-mission-card">
            <span className="clara-onboarding-mission-number">0{index + 1}</span>
            <span className="clara-onboarding-mission-spark" aria-hidden="true" />
            <span className="clara-onboarding-mission-label">{label}</span>
          </div>
        ))}
      </div>
      <p className="clara-onboarding-movement">Now you&apos;re part of that movement.</p>
    </ScreenFrame>
  );
}

function SupportScreen({ onExploreSupport }) {
  return (
    <ScreenFrame align="left" dense>
      <h1 className="clara-onboarding-title clara-onboarding-title--support clara-onboarding-title--support-clean">
        Your support matters to us.
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--left clara-onboarding-support-intro">
        It helps us make <ClaraBrandName /> better and bring it to more Filipinos.
      </p>

      <div className="clara-onboarding-support-panel">
        <div className="clara-onboarding-support-row">
          <span className="clara-onboarding-support-icon clara-onboarding-support-icon--blue">
            <HeartHandshake strokeWidth={1.7} />
          </span>
          <div>
            <p className="clara-onboarding-support-title">Help the mission grow</p>
            <p className="clara-onboarding-support-copy">
              Your support helps us keep improving <ClaraBrandName /> and reach more people.
            </p>
          </div>
        </div>

        <span className="clara-onboarding-support-divider" aria-hidden="true" />

        <div className="clara-onboarding-support-row">
          <span className="clara-onboarding-support-icon clara-onboarding-support-icon--gold">
            <ShieldCheck strokeWidth={1.7} />
          </span>
          <div>
            <p className="clara-onboarding-support-title">Make it your commitment</p>
            <p className="clara-onboarding-support-copy">
              It can also be your personal way of saying: I&apos;m serious about building better money habits.
            </p>
          </div>
        </div>
      </div>

      <div className="clara-onboarding-support-benefit">
        <span className="clara-onboarding-support-benefit-icon">
          <Sparkles strokeWidth={1.7} />
        </span>
        <div className="clara-onboarding-support-benefit-copy">
          <p className="clara-onboarding-support-benefit-title">A little more for supporters.</p>
          <p className="clara-onboarding-support-benefit-text">
            Supporters also receive thoughtful extras that make the <ClaraBrandName /> experience more personal and rewarding.
          </p>
        </div>
      </div>

      <button type="button" onClick={onExploreSupport} className="clara-onboarding-support-link">
        <span>See supporter benefits</span>
        <ArrowRight />
      </button>
    </ScreenFrame>
  );
}

function RuleScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>One rule to remember</Eyebrow>
      <div className="clara-onboarding-final-mark">
        <span className="clara-onboarding-final-halo" aria-hidden="true" />
        <ClaraLogo variant="icon" theme="dark" />
      </div>
      <h1 className="clara-onboarding-title clara-onboarding-title--final">
        Before you spend,
        <span className="clara-onboarding-final-line">ask <ClaraBrandName />.</span>
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        You don&apos;t need to be perfect with money. Start by creating a pause before the next decision.
      </p>
      <p className="clara-onboarding-mantra">Pause <i /> Think <i /> Decide</p>
    </ScreenFrame>
  );
}

export default function UniversalOnboarding() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user, profile } = useAuth();
  const [screenIndex, setScreenIndex] = useState(0);
  const firstName = useMemo(() => firstNameFrom(profile, user), [profile, user]);
  const activeScreen = SCREEN_IDS[screenIndex];
  const isFirst = screenIndex === 0;
  const isLast = screenIndex === SCREEN_IDS.length - 1;

  const goNext = () => {
    if (isLast) return;
    setScreenIndex((current) => Math.min(current + 1, SCREEN_IDS.length - 1));
  };

  const goBack = () => {
    if (isFirst) return;
    setScreenIndex((current) => Math.max(current - 1, 0));
  };

  const enterClara = () => {
    rememberCompletion(user);
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  const exploreSupport = () => {
    rememberCompletion(user);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(OPEN_SUPPORT_AFTER_ONBOARDING_KEY, "1");
        window.localStorage.setItem(SUPPORT_BUBBLE_EPOCH_KEY, String(Date.now()));
      } catch {
        // The user can still continue into CLARA if storage is restricted.
      }
    }
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  const content = (() => {
    if (activeScreen === "country") return <CountryScreen />;
    if (activeScreen === "quiet-spending") return <QuietSpendingScreen />;
    if (activeScreen === "spending-impact") return <SpendingImpactScreen />;
    if (activeScreen === "before") return <BeforeScreen />;
    if (activeScreen === "personal") return <PersonalScreen firstName={firstName} />;
    if (activeScreen === "clara") return <ClaraRevealScreen reduceMotion={reduceMotion} />;
    if (activeScreen === "mission") return <MissionScreen />;
    if (activeScreen === "support") return <SupportScreen onExploreSupport={exploreSupport} />;
    return <RuleScreen />;
  })();

  return (
    <div className="clara-mission-onboarding">
      <style>{`
        body:has(.clara-mission-onboarding) [data-clara-support-bubble],
        body:has(.clara-mission-onboarding) [data-clara-support-modal] {
          display: none !important;
        }

        .clara-mission-onboarding {
          --clara-blue: #2b75ff;
          --clara-blue-soft: #86b8ff;
          --clara-red: #ff4c55;
          --clara-gold: #ffd34e;
          --clara-ink: #020617;
          --clara-white: #f8fbff;
          position: fixed;
          inset: 0;
          z-index: 500;
          display: flex;
          min-height: 100dvh;
          flex-direction: column;
          overflow: hidden;
          color: var(--clara-white);
          background: #020617 !important;
          font-family: Inter, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
          isolation: isolate;
        }

        .clara-onboarding-ambient,
        .clara-onboarding-ambient > span {
          position: absolute;
          pointer-events: none;
        }

        .clara-onboarding-ambient {
          inset: 0;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% -8%, rgba(35, 94, 255, .18), transparent 38%),
            linear-gradient(180deg, #03091b 0%, #020617 49%, #01030b 100%);
        }

        .clara-onboarding-ambient-blue {
          width: 390px;
          height: 390px;
          left: -250px;
          top: 28%;
          border-radius: 999px;
          background: rgba(32, 102, 255, .12);
          filter: blur(86px);
        }

        .clara-onboarding-ambient-red {
          width: 320px;
          height: 320px;
          right: -235px;
          bottom: 16%;
          border-radius: 999px;
          background: rgba(255, 56, 72, .095);
          filter: blur(92px);
        }

        .clara-onboarding-ambient-gold {
          width: 190px;
          height: 190px;
          left: 50%;
          bottom: -150px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(255, 211, 78, .07);
          filter: blur(70px);
        }

        .clara-onboarding-vignette {
          inset: 0;
          background: radial-gradient(circle at 50% 47%, transparent 0%, transparent 50%, rgba(0, 0, 0, .32) 100%);
        }

        .clara-onboarding-grain {
          inset: 0;
          opacity: .045;
          background-image: radial-gradient(rgba(255, 255, 255, .36) .4px, transparent .45px);
          background-size: 5px 5px;
          mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
        }

        .clara-onboarding-header {
          position: absolute;
          inset: 0 0 auto;
          z-index: 20;
          padding: max(env(safe-area-inset-top), 20px) 24px 0;
        }

        .clara-onboarding-header-row,
        .clara-onboarding-progress,
        .clara-onboarding-footer-inner {
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
        }

        .clara-onboarding-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .clara-onboarding-wordmark {
          font-size: 13px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: .205em;
          text-transform: uppercase;
          filter: drop-shadow(0 0 12px rgba(43, 117, 255, .11));
        }

        .clara-onboarding-wordmark-blue { color: #4d8cff; }
        .clara-onboarding-wordmark-gold { color: #ffd42f; }
        .clara-onboarding-wordmark-red { color: #ff4d55; }

        .clara-onboarding-wordmark-letter,
        .clara-onboarding-wordmark-letter-inner {
          display: inline-block;
        }

        .clara-onboarding-wordmark-letter {
          transform-origin: center 72%;
          will-change: transform, opacity;
        }

        .clara-onboarding-wordmark-letter-inner {
          will-change: transform;
        }

        .clara-onboarding-counter {
          font-size: 10px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: .17em;
          color: rgba(248, 251, 255, .58);
          font-variant-numeric: tabular-nums;
        }

        .clara-onboarding-progress {
          display: grid;
          grid-template-columns: repeat(${SCREEN_IDS.length}, 1fr);
          gap: 7px;
          margin-top: 17px;
        }

        .clara-onboarding-progress-segment {
          position: relative;
          height: 2px;
          overflow: visible;
          border-radius: 999px;
          background: rgba(255, 255, 255, .085);
          transition: background .45s ease, box-shadow .45s ease, transform .45s ease;
        }

        .clara-onboarding-progress-segment.is-active {
          background: linear-gradient(90deg, #2769ff, #52a0ff);
          box-shadow: 0 0 10px rgba(48, 128, 255, .34);
        }

        .clara-onboarding-progress-segment.is-current::after {
          content: "";
          position: absolute;
          right: -1px;
          top: 50%;
          width: 5px;
          height: 5px;
          transform: translateY(-50%);
          border-radius: 50%;
          background: #8fc2ff;
          box-shadow: 0 0 10px rgba(84, 159, 255, .78);
        }

        .clara-onboarding-transition {
          position: relative;
          z-index: 10;
          display: flex;
          min-height: 0;
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
        }

        .clara-onboarding-transition::-webkit-scrollbar { display: none; }

        .clara-onboarding-screen {
          box-sizing: border-box;
          width: 100%;
          max-width: 430px;
          min-height: 100%;
          margin: 0 auto;
          padding: 118px 26px 112px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .clara-onboarding-screen--left {
          align-items: flex-start;
          text-align: left;
        }

        .clara-onboarding-screen--dense { padding-top: 108px; padding-bottom: 106px; }

        .clara-onboarding-screen > * {
          animation: clara-onboarding-item-in .56s cubic-bezier(.16, 1, .3, 1) both;
        }

        .clara-onboarding-screen > .clara-onboarding-wordmark--animated {
          animation: none;
        }

        .clara-onboarding-screen > *:nth-child(2) { animation-delay: 35ms; }
        .clara-onboarding-screen > *:nth-child(3) { animation-delay: 70ms; }
        .clara-onboarding-screen > *:nth-child(4) { animation-delay: 105ms; }
        .clara-onboarding-screen > *:nth-child(5) { animation-delay: 140ms; }

        @keyframes clara-onboarding-item-in {
          from { opacity: 0; transform: translateY(9px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .clara-onboarding-eyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 14px;
          border: 1px solid rgba(83, 145, 255, .31) !important;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(34, 92, 200, .08), rgba(8, 24, 61, .03)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .025), 0 0 22px rgba(41, 105, 255, .055) !important;
          color: #c7dcff;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: .21em;
          text-transform: uppercase;
        }

        .clara-onboarding-eyebrow--gold {
          border-color: rgba(255, 204, 49, .28) !important;
          background: linear-gradient(180deg, rgba(134, 99, 0, .08), rgba(56, 39, 0, .025)) !important;
          color: #ffe48b;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .02), 0 0 22px rgba(255, 202, 36, .045) !important;
        }

        .clara-onboarding-eyebrow--red {
          border-color: rgba(255, 79, 91, .25) !important;
          background: linear-gradient(180deg, rgba(151, 34, 48, .08), rgba(71, 15, 25, .025)) !important;
          color: #ffb6bd;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .02), 0 0 22px rgba(255, 66, 82, .045) !important;
        }

        .clara-onboarding-title {
          max-width: 370px;
          margin: 26px 0 0;
          color: #fbfdff;
          font-size: clamp(2.12rem, 9.25vw, 2.75rem);
          line-height: 1.035;
          font-weight: 680;
          letter-spacing: -.055em;
          text-wrap: balance;
          text-shadow: 0 1px 0 rgba(255, 255, 255, .025), 0 12px 34px rgba(0, 0, 0, .18);
        }

        .clara-onboarding-title--personal { max-width: 375px; }
        .clara-onboarding-title--mission { max-width: 390px; font-size: clamp(2rem, 8.7vw, 2.62rem); }
        .clara-onboarding-title--support { max-width: 385px; font-size: clamp(1.88rem, 8vw, 2.42rem); }
        .clara-onboarding-title--support-clean { margin-top: 0; max-width: 345px; }
        .clara-onboarding-title--final { margin-top: 34px; font-size: clamp(2.35rem, 10vw, 3rem); line-height: .99; }
        .clara-onboarding-title--final > .clara-onboarding-final-line { display: block; margin-top: 6px; color: #8dbbff; }

        .clara-onboarding-body {
          margin: 21px 0 0;
          color: rgba(238, 245, 255, .58);
          font-size: 14px;
          line-height: 1.72;
          font-weight: 420;
          letter-spacing: -.01em;
        }

        .clara-onboarding-body--lead { max-width: 350px; font-size: 15px; line-height: 1.68; }
        .clara-onboarding-body--narrow { max-width: 345px; }
        .clara-onboarding-body--left { max-width: 380px; color: rgba(238, 245, 255, .56); }

        .clara-onboarding-rule {
          position: relative;
          display: block;
          width: 78px;
          height: 1px;
          margin-top: 32px;
          background: linear-gradient(90deg, transparent, rgba(255, 205, 47, .58), transparent);
        }

        .clara-onboarding-rule::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 3px;
          height: 3px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #ffe46d;
          box-shadow: 0 0 10px 2px rgba(255, 209, 48, .28);
        }

        .clara-onboarding-rule--red {
          background: linear-gradient(90deg, transparent, rgba(255, 87, 99, .48), transparent);
        }
        .clara-onboarding-rule--red::after {
          background: #ff7984;
          box-shadow: 0 0 10px 2px rgba(255, 74, 91, .23);
        }

        .clara-onboarding-closing {
          max-width: 330px;
          margin: 25px 0 0;
          color: rgba(240, 246, 255, .47);
          font-size: 13.5px;
          line-height: 1.75;
          font-weight: 450;
          letter-spacing: -.006em;
          text-wrap: balance;
        }

        .clara-onboarding-chip-grid {
          display: flex;
          max-width: 365px;
          margin-top: 28px;
          flex-wrap: wrap;
          justify-content: center;
          gap: 9px;
        }

        .clara-onboarding-chip {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          gap: 8px;
          padding: 0 13px;
          border: 1px solid rgba(255, 255, 255, .085) !important;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,.034), rgba(255,255,255,.018)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035) !important;
          color: rgba(238, 244, 255, .58);
          font-size: 11.5px;
          font-weight: 500;
          white-space: nowrap;
        }

        .clara-onboarding-chip-icon {
          width: 14px;
          height: 14px;
          color: #ff8b94;
          filter: drop-shadow(0 0 6px rgba(255, 71, 88, .16));
        }

        .clara-onboarding-payday {
          margin: 22px 0 0;
          color: rgba(250, 252, 255, .88);
          font-size: 13.5px;
          font-weight: 650;
          letter-spacing: -.012em;
        }

        .clara-onboarding-compare {
          width: 100%;
          max-width: 375px;
          margin-top: 32px;
        }

        .clara-onboarding-compare-block { display: flex; flex-direction: column; align-items: center; }
        .clara-onboarding-compare .clara-onboarding-rule { margin: 28px auto; }

        .clara-onboarding-kicker {
          margin: 0;
          color: rgba(234, 241, 255, .36);
          font-size: 10.5px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: .215em;
          text-transform: uppercase;
        }

        .clara-onboarding-kicker--blue { color: #83b7ff; }

        .clara-onboarding-compare-copy {
          max-width: 350px;
          margin: 12px 0 0;
          color: rgba(247, 250, 255, .68);
          font-size: clamp(1.35rem, 6.2vw, 1.72rem);
          line-height: 1.18;
          font-weight: 560;
          letter-spacing: -.036em;
          text-wrap: balance;
        }

        .clara-onboarding-compare-copy--hero {
          max-width: 370px;
          color: #fbfdff;
          font-size: clamp(1.9rem, 8.3vw, 2.45rem);
          line-height: 1.07;
          font-weight: 675;
          letter-spacing: -.052em;
        }

        .clara-onboarding-personal-list {
          width: 100%;
          max-width: 365px;
          margin-top: 38px;
        }

        .clara-onboarding-personal-line {
          position: relative;
          display: flex;
          min-height: 57px;
          align-items: center;
          justify-content: center;
          color: rgba(249, 251, 255, .78);
          font-size: clamp(1.15rem, 5.5vw, 1.38rem);
          font-weight: 570;
          letter-spacing: -.026em;
        }

        .clara-onboarding-personal-line + .clara-onboarding-personal-line::before {
          content: "";
          position: absolute;
          top: 0;
          left: 12%;
          right: 12%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(84, 145, 255, .20), transparent);
        }

        .clara-onboarding-personal-line + .clara-onboarding-personal-line::after {
          content: "";
          position: absolute;
          top: -1px;
          left: 50%;
          width: 3px;
          height: 3px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: #6da5ff;
          box-shadow: 0 0 8px rgba(65, 136, 255, .68);
        }

        .clara-onboarding-personal-line--gold {
          color: #ffdc66;
          font-weight: 650;
        }

        .clara-onboarding-personal-line--gold::after {
          background: #ffd44e !important;
          box-shadow: 0 0 9px rgba(255, 206, 49, .72) !important;
        }

        .clara-onboarding-logo-stage,
        .clara-onboarding-final-mark {
          position: relative;
          display: grid;
          place-items: center;
        }

        .clara-onboarding-logo-stage { width: 132px; height: 132px; }
        .clara-onboarding-logo-mark { position: relative; transform: scale(1.78); }
        .clara-onboarding-logo-halo,
        .clara-onboarding-final-halo {
          position: absolute;
          inset: 12px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(24, 105, 255, .22), rgba(24, 105, 255, .055) 46%, transparent 72%);
          filter: blur(18px);
        }

        .clara-onboarding-wordmark--hero {
          margin-top: 25px;
          font-size: clamp(1.72rem, 8vw, 2.08rem);
          letter-spacing: .22em;
        }

        .clara-onboarding-tagline {
          margin: 18px 0 0;
          color: #f8fbff;
          font-size: 17px;
          line-height: 1.2;
          font-weight: 620;
          letter-spacing: -.026em;
        }

        .clara-onboarding-mission-grid {
          display: grid;
          width: 100%;
          max-width: 382px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin-top: 28px;
        }

        .clara-onboarding-mission-card {
          min-width: 0;
          min-height: 92px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 5px;
          border: 1px solid rgba(112, 159, 238, .17) !important;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(15, 29, 57, .50), rgba(7, 15, 34, .38)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035), 0 14px 34px rgba(0, 0, 0, .12) !important;
        }

        .clara-onboarding-mission-number {
          color: #80b5ff;
          font-size: 9.5px;
          line-height: 1;
          font-weight: 750;
          letter-spacing: .17em;
        }

        .clara-onboarding-mission-spark {
          position: relative;
          width: 32px;
          height: 1px;
          margin-top: 9px;
          background: linear-gradient(90deg, transparent, rgba(133, 183, 255, .48), transparent);
        }

        .clara-onboarding-mission-spark::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 3px;
          height: 3px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #b7d3ff;
          box-shadow: 0 0 8px rgba(89, 154, 255, .4);
        }

        .clara-onboarding-mission-card:first-child .clara-onboarding-mission-spark::after {
          background: #ffda5e;
          box-shadow: 0 0 8px rgba(255, 206, 61, .42);
        }

        .clara-onboarding-mission-label {
          margin-top: 9px;
          color: rgba(249, 251, 255, .82);
          font-size: 11.5px;
          line-height: 1.2;
          font-weight: 580;
          letter-spacing: -.01em;
        }

        .clara-onboarding-movement {
          margin: 26px 0 0;
          color: rgba(247, 250, 255, .68);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 560;
          letter-spacing: -.012em;
        }

        .clara-onboarding-support-intro {
          margin-top: 15px;
          max-width: 345px;
          font-size: 14.5px;
          line-height: 1.58;
          color: rgba(238, 245, 255, .62);
        }

        .clara-onboarding-support-panel {
          width: 100%;
          max-width: 390px;
          margin-top: 27px;
          padding: 6px 15px;
          border: 1px solid rgba(83, 145, 255, .14) !important;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(24, 56, 115, .075), rgba(6, 18, 43, .035)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 18px 46px rgba(0, 0, 0, .10) !important;
        }

        .clara-onboarding-support-row {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 14px 0;
        }

        .clara-onboarding-support-divider {
          display: block;
          height: 1px;
          margin-left: 50px;
          background: linear-gradient(90deg, rgba(120, 166, 239, .17), rgba(255, 213, 78, .12), transparent);
        }

        .clara-onboarding-support-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          color: rgba(245, 248, 255, .58);
          background: rgba(255,255,255,.02);
        }

        .clara-onboarding-support-icon svg { width: 16px; height: 16px; }
        .clara-onboarding-support-icon--blue { color: #8bbcff; border-color: rgba(79, 143, 255, .16); background: rgba(43, 117, 255, .035); }
        .clara-onboarding-support-icon--gold { color: #ffe084; border-color: rgba(255, 210, 68, .15); background: rgba(255, 211, 78, .025); }

        .clara-onboarding-support-title {
          margin: 1px 0 0;
          color: rgba(250, 252, 255, .91);
          font-size: 12.8px;
          line-height: 1.25;
          font-weight: 650;
          letter-spacing: -.012em;
        }

        .clara-onboarding-support-copy {
          margin: 4px 0 0;
          color: rgba(237, 244, 255, .46);
          font-size: 11px;
          line-height: 1.5;
          font-weight: 430;
        }

        .clara-onboarding-support-benefit {
          width: 100%;
          max-width: 390px;
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          margin-top: 17px;
          padding: 12px 13px;
          border: 1px solid rgba(255, 210, 68, .13) !important;
          border-radius: 17px;
          background: linear-gradient(180deg, rgba(93, 70, 8, .05), rgba(31, 23, 3, .018)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .022) !important;
        }

        .clara-onboarding-support-benefit-icon {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #ffdf73;
          background: rgba(255, 211, 78, .035);
        }

        .clara-onboarding-support-benefit-icon svg { width: 14px; height: 14px; }

        .clara-onboarding-support-benefit-title {
          margin: 0;
          color: rgba(255, 245, 209, .90);
          font-size: 11.8px;
          line-height: 1.3;
          font-weight: 650;
          letter-spacing: -.01em;
        }

        .clara-onboarding-support-benefit-text {
          margin: 3px 0 0;
          color: rgba(239, 243, 251, .42);
          font-size: 10.5px;
          line-height: 1.45;
          font-weight: 430;
        }

        .clara-onboarding-support-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 13px;
          padding: 5px 0;
          border: 0 !important;
          background: none !important;
          box-shadow: none !important;
          color: #9ec6ff;
          font-size: 11.5px;
          line-height: 1.2;
          font-weight: 620;
          letter-spacing: -.008em;
        }

        .clara-onboarding-support-link svg { width: 13px; height: 13px; transition: transform .18s ease; }
        .clara-onboarding-support-link:hover svg { transform: translateX(2px); }

        .clara-onboarding-footnote {
          max-width: 370px;
          margin: 6px 0 0;
          color: rgba(235, 241, 252, .30);
          font-size: 9.8px;
          line-height: 1.5;
          font-weight: 430;
        }

        .clara-onboarding-final-mark {
          width: 104px;
          height: 104px;
          margin-top: 29px;
        }

        .clara-onboarding-final-mark > :last-child { position: relative; transform: scale(1.4); }

        .clara-onboarding-mantra {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 28px 0 0;
          color: rgba(240, 246, 255, .40);
          font-size: 9.5px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: .19em;
          text-transform: uppercase;
        }

        .clara-onboarding-mantra i {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #ffd552;
          box-shadow: 0 0 7px rgba(255, 210, 63, .35);
        }

        .clara-onboarding-footer {
          position: absolute;
          inset: auto 0 0;
          z-index: 20;
          padding: 36px 22px max(env(safe-area-inset-bottom), 18px);
          background: linear-gradient(180deg, transparent 0%, rgba(1,3,11,.78) 42%, #01030b 74%);
        }

        .clara-onboarding-footer-inner {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .clara-onboarding-back,
        .clara-onboarding-continue {
          height: 54px;
          border-radius: 18px;
          outline: none;
          transition: transform .16s ease, filter .16s ease, border-color .16s ease, box-shadow .16s ease;
        }

        .clara-onboarding-back {
          width: 54px;
          flex: 0 0 54px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(125, 160, 213, .18) !important;
          background: linear-gradient(180deg, rgba(10, 22, 44, .76), rgba(5, 12, 27, .82)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035), 0 12px 28px rgba(0, 0, 0, .18) !important;
          color: rgba(238, 245, 255, .61);
        }

        .clara-onboarding-back svg { width: 17px; height: 17px; }

        .clara-onboarding-continue {
          position: relative;
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 20px;
          overflow: hidden;
          border: 1px solid rgba(102, 162, 255, .52) !important;
          background: linear-gradient(112deg, #1854ed 0%, #256bff 48%, #2787ff 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.34),
            inset 0 -1px 0 rgba(0,32,105,.28),
            0 16px 36px rgba(20, 79, 231, .25),
            0 0 0 1px rgba(16, 79, 241, .10) !important;
          color: #fff;
          font-size: 13px;
          line-height: 1;
          font-weight: 680;
          letter-spacing: -.012em;
        }

        .clara-onboarding-continue::before {
          content: "";
          position: absolute;
          left: 12%;
          right: 12%;
          top: -1px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 216, 71, .68), rgba(255,255,255,.46), transparent);
          opacity: .75;
        }

        .clara-onboarding-continue svg { width: 15px; height: 15px; transition: transform .18s ease; }
        .clara-onboarding-continue:hover { filter: brightness(1.05); }
        .clara-onboarding-continue:hover svg { transform: translateX(2px); }
        .clara-onboarding-back:active,
        .clara-onboarding-continue:active { transform: scale(.985); }

        .clara-onboarding-back:focus-visible,
        .clara-onboarding-continue:focus-visible,
        .clara-onboarding-support-link:focus-visible {
          box-shadow: 0 0 0 3px rgba(88, 153, 255, .22) !important;
        }

        @media (max-height: 760px) {
          .clara-onboarding-screen { padding-top: 105px; padding-bottom: 96px; }
          .clara-onboarding-screen--dense { justify-content: flex-start; padding-top: 103px; }
          .clara-onboarding-title { margin-top: 21px; font-size: clamp(1.9rem, 8.4vw, 2.35rem); }
          .clara-onboarding-title--support-clean { margin-top: 0; }
          .clara-onboarding-body { margin-top: 16px; }
          .clara-onboarding-support-intro { margin-top: 13px; }
          .clara-onboarding-chip-grid,
          .clara-onboarding-mission-grid { margin-top: 21px; }
          .clara-onboarding-personal-list { margin-top: 28px; }
          .clara-onboarding-support-panel { margin-top: 20px; }
          .clara-onboarding-support-row { padding: 11px 0; }
          .clara-onboarding-support-benefit { margin-top: 12px; padding-top: 10px; padding-bottom: 10px; }
          .clara-onboarding-footer { padding-top: 28px; }
        }

        @media (min-width: 640px) {
          .clara-onboarding-header { padding-left: 28px; padding-right: 28px; }
          .clara-onboarding-screen { padding-left: 30px; padding-right: 30px; }
          .clara-onboarding-footer { padding-left: 28px; padding-right: 28px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-onboarding-screen > *,
          .clara-onboarding-progress-segment,
          .clara-onboarding-continue svg,
          .clara-onboarding-support-link svg {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <AmbientField />

      <header className="clara-onboarding-header">
        <div className="clara-onboarding-header-row">
          <ClaraWordmark />
          <span className="clara-onboarding-counter">
            {String(screenIndex + 1).padStart(2, "0")} / {String(SCREEN_IDS.length).padStart(2, "0")}
          </span>
        </div>
        <div className="clara-onboarding-progress" aria-hidden="true">
          {SCREEN_IDS.map((screenId, index) => (
            <span
              key={screenId}
              className={`clara-onboarding-progress-segment ${
                index <= screenIndex ? "is-active" : ""
              } ${index === screenIndex ? "is-current" : ""}`}
            />
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeScreen}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0.16 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="clara-onboarding-transition"
        >
          {content}
        </motion.div>
      </AnimatePresence>

      <footer className="clara-onboarding-footer">
        <div className="clara-onboarding-footer-inner">
          {!isFirst ? (
            <button type="button" onClick={goBack} aria-label="Go back" className="clara-onboarding-back">
              <ChevronLeft />
            </button>
          ) : null}

          <button
            type="button"
            onClick={isLast ? enterClara : goNext}
            className="clara-onboarding-continue"
          >
            <span>
              {isLast ? (
                <>Start with <ClaraBrandName /></>
              ) : (
                "Continue"
              )}
            </span>
            <ArrowRight />
          </button>
        </div>
      </footer>
    </div>
  );
}