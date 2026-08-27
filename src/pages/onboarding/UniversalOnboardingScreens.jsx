import { motion } from "framer-motion";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";

export const SCREEN_IDS = [
  "country",
  "measurement",
  "means-score",
  "score-meaning",
  "decision-impact",
  "clara-reveal",
  "mission-rule",
];

const CLARA_WORDMARK_LETTERS = [
  { char: "C", tone: "blue" },
  { char: "L", tone: "blue" },
  { char: "A", tone: "gold" },
  { char: "R", tone: "red" },
  { char: "A", tone: "red" },
];

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

function ScreenFrame({ children }) {
  return <div className="clara-onboarding-screen">{children}</div>;
}

export function CountryScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>Why <ClaraBrandName /> exists</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--country">
        Filipinos work hard for every peso.
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        But most of us still make money decisions without one clear way to see where we actually stand.
      </p>
      <AccentRule />
      <p className="clara-onboarding-closing">
        If your financial position is hard to see, it is harder to protect.
      </p>
    </ScreenFrame>
  );
}

export function MeasurementScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">The power of measurement</Eyebrow>
      <h1 className="clara-onboarding-title">You can&apos;t manage what you don&apos;t measure.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        Almost everything we want to improve gives us a way to know where we stand.
      </p>
      <div className="clara-onboarding-personal-list">
        <div className="clara-onboarding-personal-line"><span>Weight has kilograms.</span></div>
        <div className="clara-onboarding-personal-line"><span>Running has distance and pace.</span></div>
        <div className="clara-onboarding-personal-line clara-onboarding-personal-line--gold">
          <span>So how do you measure your financial position?</span>
        </div>
      </div>
    </ScreenFrame>
  );
}

export function MeansScoreScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>Your financial status</Eyebrow>
      <h1 className="clara-onboarding-title">Meet your Means Score.</h1>
      <div className="clara-onboarding-compare">
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara">
          <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">One practical number</p>
          <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero">87</p>
        </section>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        One practical number that makes your financial position visible.
      </p>
    </ScreenFrame>
  );
}

export function ScoreMeaningScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">What the score means</Eyebrow>
      <h1 className="clara-onboarding-title">100 is the line.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        Below it means financial pressure. Above it means more financial room.
      </p>
      <div className="clara-onboarding-personal-list">
        <div className="clara-onboarding-personal-line"><span>87 — Financial pressure</span></div>
        <div className="clara-onboarding-personal-line clara-onboarding-personal-line--gold"><span>100 — Exactly covered</span></div>
        <div className="clara-onboarding-personal-line"><span>126 — More financial room</span></div>
      </div>
    </ScreenFrame>
  );
}

export function DecisionImpactScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">Now it becomes practical</Eyebrow>
      <h1 className="clara-onboarding-title">Before you spend, see what it changes.</h1>
      <div className="clara-onboarding-compare">
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--muted">
          <p className="clara-onboarding-kicker">Before purchase</p>
          <p className="clara-onboarding-compare-copy">126</p>
        </section>
        <AccentRule />
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara">
          <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">After a ₱850 purchase</p>
          <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero">111</p>
        </section>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        How do you see the impact before you spend?
      </p>
      <p className="clara-onboarding-tagline">By asking <ClaraBrandName />.</p>
    </ScreenFrame>
  );
}

export function ClaraRevealScreen({ reduceMotion }) {
  return (
    <ScreenFrame>
      <Eyebrow>Meet <ClaraBrandName /></Eyebrow>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.68, ease: [0.16, 1, 0.3, 1] }}
        className="clara-onboarding-logo-stage"
      >
        <span className="clara-onboarding-logo-halo" aria-hidden="true" />
        <div className="clara-onboarding-logo-mark"><ClaraLogo variant="icon" theme="dark" /></div>
      </motion.div>
      <ClaraWordmark className="clara-onboarding-wordmark--hero" animateLetters reduceMotion={reduceMotion} />
      <p className="clara-onboarding-tagline">Your financial accountability companion.</p>
      <AccentRule />
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Before you spend, ask <ClaraBrandName />.
      </p>
    </ScreenFrame>
  );
}

export function MissionRuleScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>How <ClaraBrandName /> works</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--mission">
        <ClaraBrandName /> understands your financial position.
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Your Means Score shows where you currently stand.
      </p>
      <p className="clara-onboarding-tagline">Before you spend, ask <ClaraBrandName />.</p>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        <ClaraBrandName /> checks the decision against your financial status and helps you protect your Means Score — so you can stay within your means and build more financial room over time.
      </p>
      <AccentRule />
      <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">The bigger vision</p>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        When you join <ClaraBrandName />, you&apos;re not only helping yourself. You become part of a growing movement of Filipinos choosing financial stability and better money habits.
      </p>
      <p className="clara-onboarding-tagline">Normalize healthy money habits in the Philippines.</p>
    </ScreenFrame>
  );
}
