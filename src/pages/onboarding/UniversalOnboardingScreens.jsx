import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Car,
  HeartHandshake,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";

export const SCREEN_IDS = [
  "country",
  "quiet-spending",
  "spending-impact",
  "money-situation",
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

const SPENDING_IMPACT_TIMEFRAMES = [
  { id: "30d", label: "30 days", period: "Over 30 days", amount: "≈ ₱3,000–₱5,000" },
  { id: "3m", label: "3 months", period: "Over 3 months", amount: "≈ ₱9,000–₱15,000" },
  { id: "6m", label: "6 months", period: "Over 6 months", amount: "≈ ₱18,000–₱30,000" },
  { id: "1y", label: "1 year", period: "Over 1 year", amount: "≈ ₱36,000–₱60,000" },
];

export function firstNameFrom(profile, user) {
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

export function ClaraWordmark({ className = "", animateLetters = false, reduceMotion = false }) {
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

export function AmbientField() {
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

export function CountryScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>Why <ClaraBrandName /> exists</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--country">Filipinos work hard for every peso.</h1>
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

export function QuietSpendingScreen() {
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

export function SpendingImpactScreen({ reduceMotion }) {
  const [timeframeId, setTimeframeId] = useState("30d");
  const activeImpact = SPENDING_IMPACT_TIMEFRAMES.find((item) => item.id === timeframeId) || SPENDING_IMPACT_TIMEFRAMES[0];

  return (
    <ScreenFrame>
      <Eyebrow tone="gold">Did you know?</Eyebrow>
      <div className="clara-onboarding-compare clara-onboarding-impact-compare">
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--muted">
          <p className="clara-onboarding-kicker">Small unplanned spending</p>
          <p className="clara-onboarding-compare-copy">₱100–₱165 a day</p>
        </section>

        <div className="clara-onboarding-impact-selector-wrap">
          <p className="clara-onboarding-impact-prompt">See what it becomes over time</p>
          <div className="clara-onboarding-impact-selector" role="group" aria-label="Choose a spending timeframe">
            {SPENDING_IMPACT_TIMEFRAMES.map((item) => {
              const selected = item.id === timeframeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`clara-onboarding-impact-option ${selected ? "is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setTimeframeId(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <AccentRule />

        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara clara-onboarding-impact-result">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeImpact.id}
              className="clara-onboarding-impact-result-inner"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">{activeImpact.period}</p>
              <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero clara-onboarding-impact-amount">
                {activeImpact.amount}
              </p>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <p className="clara-onboarding-body clara-onboarding-body--narrow clara-onboarding-impact-closing">
        Imagine what that could have become instead.
      </p>
      <p className="clara-onboarding-impact-destinations">Emergency fund <i /> Savings <i /> A goal</p>
    </ScreenFrame>
  );
}

export function BeforeScreen() {
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

export function PersonalScreen({ firstName }) {
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

export function ClaraRevealScreen({ reduceMotion }) {
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

export function MissionScreen() {
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

export function SupportScreen({ onExploreSupport }) {
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

      <button
        type="button"
        onClick={onExploreSupport}
        className="clara-onboarding-support-benefit"
        aria-label="See what supporters receive"
      >
        <span className="clara-onboarding-support-benefit-icon">
          <Sparkles strokeWidth={1.7} />
        </span>
        <span className="clara-onboarding-support-benefit-copy">
          <span className="clara-onboarding-support-benefit-title">See what supporters receive</span>
          <span className="clara-onboarding-support-benefit-text">
            Interested in the extras? Tap here to view everything included for CLARA supporters.
          </span>
        </span>
        <span className="clara-onboarding-support-benefit-arrow" aria-hidden="true">
          →
        </span>
      </button>
    </ScreenFrame>
  );
}

export function RuleScreen() {
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
