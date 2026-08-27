import { motion } from "framer-motion";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";

export const SCREEN_IDS = [
  "country",
  "measurement",
  "means-score",
  "decision-impact",
  "awareness",
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
      <h1 className="clara-onboarding-title">What you can see, you can manage.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        Progress becomes easier to understand when it is visible and measurable.
      </p>
      <div className="clara-onboarding-personal-list">
        <div className="clara-onboarding-personal-line">
          <span>Weight has kilograms.</span>
        </div>
        <div className="clara-onboarding-personal-line">
          <span>Running has distance and pace.</span>
        </div>
        <div className="clara-onboarding-personal-line clara-onboarding-personal-line--gold">
          <span>Your financial position needs a signal too.</span>
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
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--muted">
          <p className="clara-onboarding-kicker">Example Means Score</p>
          <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero">87</p>
        </section>
        <AccentRule />
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara">
          <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">Above Your Means</p>
          <p className="clara-onboarding-compare-copy">
            Your financial pressure becomes visible instead of being something you only feel.
          </p>
        </section>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Your Means Score compares the financial resources available to you with what you currently need until the next relevant income point.
      </p>
      <p className="clara-onboarding-impact-destinations">Under 100 <i /> 100 = covered <i /> Over 100 = more room</p>
    </ScreenFrame>
  );
}

export function DecisionImpactScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">Before the decision</Eyebrow>
      <h1 className="clara-onboarding-title">See the impact before you spend.</h1>
      <div className="clara-onboarding-compare">
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--muted">
          <p className="clara-onboarding-kicker">Example Means Score</p>
          <p className="clara-onboarding-compare-copy">126</p>
        </section>
        <AccentRule />
        <section className="clara-onboarding-compare-block clara-onboarding-compare-block--clara">
          <p className="clara-onboarding-kicker clara-onboarding-kicker--blue">After a ₱850 purchase</p>
          <p className="clara-onboarding-compare-copy clara-onboarding-compare-copy--hero">111</p>
        </section>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        Ask <ClaraBrandName /> before you spend and see how a decision could change your financial position before it becomes a transaction.
      </p>
      <p className="clara-onboarding-mantra">Pause <i /> See the impact <i /> Decide</p>
    </ScreenFrame>
  );
}

export function AwarenessScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>The habit</Eyebrow>
      <h1 className="clara-onboarding-title">Stay aware of where you stand.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        Your score changes as your money changes. <ClaraBrandName /> keeps the signal practical.
      </p>
      <div className="clara-onboarding-personal-list">
        <div className="clara-onboarding-personal-line">
          <span>Check your Means Score.</span>
        </div>
        <div className="clara-onboarding-personal-line">
          <span>Ask before you spend.</span>
        </div>
        <div className="clara-onboarding-personal-line clara-onboarding-personal-line--gold">
          <span>Decide with awareness.</span>
        </div>
      </div>
    </ScreenFrame>
  );
}

export function MissionRuleScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">The bigger mission</Eyebrow>
      <div className="clara-onboarding-final-mark">
        <span className="clara-onboarding-final-halo" aria-hidden="true" />
        <ClaraLogo variant="icon" theme="dark" />
      </div>
      <h1 className="clara-onboarding-title clara-onboarding-title--mission">
        Better financial awareness should become normal in the Philippines.
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        <ClaraBrandName /> exists to help build a generation of Filipinos who can see their financial position and make wiser decisions with it.
      </p>
      <AccentRule />
      <p className="clara-onboarding-tagline">Before you spend, ask <ClaraBrandName />.</p>
      <p className="clara-onboarding-mantra">See <i /> Ask <i /> Decide</p>
    </ScreenFrame>
  );
}
