import { motion } from "framer-motion";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";

export const SCREEN_IDS = [
  "country",
  "measurement",
  "means-score",
  "score-meaning",
  "simulation-ready",
  "juan-intro",
  "juan-choice",
  "quantified-feedback",
  "clara-reveal",
  "mission-rule",
  "bigger-vision",
];

export const JUAN_SHOE_OPTIONS = [
  {
    id: "premium",
    name: "Premium Work Shoes",
    price: 10000,
    afterScore: 50,
  },
  {
    id: "quality",
    name: "Quality Work Shoes",
    price: 5000,
    afterScore: 100,
  },
  {
    id: "practical",
    name: "Practical Work Shoes",
    price: 2000,
    afterScore: 130,
  },
];

const CLARA_WORDMARK_LETTERS = [
  { char: "C", tone: "blue" },
  { char: "L", tone: "blue" },
  { char: "A", tone: "gold" },
  { char: "R", tone: "red" },
  { char: "A", tone: "red" },
];

function formatPeso(amount) {
  return `₱${amount.toLocaleString("en-PH")}`;
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

function ScreenFrame({ children, className = "" }) {
  return <div className={`clara-onboarding-screen ${className}`.trim()}>{children}</div>;
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
      <Eyebrow tone="gold">So what is the Means Score?</Eyebrow>
      <h1 className="clara-onboarding-title">Remember this number: 100.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        100 means you have exactly enough money to cover what CLARA expects you&apos;ll need for your current cycle.
      </p>
      <div className="clara-onboarding-personal-list">
        <div className="clara-onboarding-personal-line"><span>87 — Living above your means</span></div>
        <div className="clara-onboarding-personal-line clara-onboarding-personal-line--gold"><span>100 — Living within your means</span></div>
        <div className="clara-onboarding-personal-line"><span>126 — Living below your means</span></div>
      </div>
      <p className="clara-onboarding-closing">Keep your Means Score above 100.</p>
    </ScreenFrame>
  );
}

export function SimulationReadyScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">So what&apos;s the point?</Eyebrow>
      <h1 className="clara-onboarding-title">Let&apos;s do a little simulation.</h1>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        You already know what 100 means. Now let&apos;s use the Means Score in a real spending decision.
      </p>
      <AccentRule />
      <p className="clara-onboarding-tagline">Ready?</p>
    </ScreenFrame>
  );
}

export function JuanIntroScreen() {
  return (
    <ScreenFrame>
      <Eyebrow>Meet Juan</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--mission">
        Juan needs new shoes for work.
      </h1>
      <p className="clara-onboarding-body clara-onboarding-body--narrow">
        CLARA already knows his financial situation. His current work shoes are no longer usable, so replacing them is a real need.
      </p>
      <div className="clara-onboarding-simulation-score">
        <span>Juan&apos;s current Means Score</span>
        <strong>150</strong>
      </div>
      <p className="clara-onboarding-tagline clara-onboarding-simulation-question">
        Can you help Juan buy new shoes without bringing his Means Score below 100?
      </p>
    </ScreenFrame>
  );
}

export function JuanChoiceScreen({ selectedOptionId, onSelect }) {
  const selectedOption = JUAN_SHOE_OPTIONS.find((option) => option.id === selectedOptionId);
  const displayedScore = selectedOption?.afterScore ?? 150;

  return (
    <ScreenFrame className="clara-onboarding-screen--dense clara-onboarding-simulation-choice-screen">
      <Eyebrow tone="gold">Choose for Juan</Eyebrow>
      <h1 className="clara-onboarding-title clara-onboarding-title--support">
        Which one would you choose?
      </h1>

      <div className="clara-onboarding-shoe-options" role="group" aria-label="Choose work shoes for Juan">
        {JUAN_SHOE_OPTIONS.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`clara-onboarding-shoe-option ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelect(option.id)}
              aria-pressed={isSelected}
            >
              <span className="clara-onboarding-shoe-option-topline">
                <strong>{option.name}</strong>
                <span>{formatPeso(option.price)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="clara-onboarding-simulation-scorebar" aria-live="polite">
        <span>
          {selectedOption
            ? "Your choice changes Juan's Means Score to"
            : "Juan starts at Means Score"}
        </span>
        <strong>{displayedScore}</strong>
      </div>
    </ScreenFrame>
  );
}

export function QuantifiedFeedbackScreen({ selectedOptionId }) {
  const selectedOption = JUAN_SHOE_OPTIONS.find((option) => option.id === selectedOptionId) || JUAN_SHOE_OPTIONS[2];

  return (
    <ScreenFrame>
      <Eyebrow tone="gold">That&apos;s the point</Eyebrow>
      <h1 className="clara-onboarding-title">You didn&apos;t just see the price.</h1>
      <div className="clara-onboarding-feedback-result">
        <span className="clara-onboarding-kicker">Juan&apos;s Means Score</span>
        <strong>150 → {selectedOption.afterScore}</strong>
        <span>{selectedOption.name} · {formatPeso(selectedOption.price)}</span>
      </div>
      <p className="clara-onboarding-body clara-onboarding-body--lead">
        You saw what the purchase would do to his financial position before he made the decision.
      </p>
      <p className="clara-onboarding-tagline">Psychology calls this quantified feedback.</p>
      <AccentRule />
      <p className="clara-onboarding-closing">
        What if Juan could ask CLARA to show him this impact before he buys?
      </p>
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
      <p className="clara-onboarding-mantra">Ask <i /> See the impact <i /> Decide</p>
    </ScreenFrame>
  );
}

export function BiggerVisionScreen() {
  return (
    <ScreenFrame>
      <Eyebrow tone="gold">The bigger vision</Eyebrow>
      <h1
        className="clara-onboarding-title clara-onboarding-title--mission"
        style={{ maxWidth: 350, marginTop: 28 }}
      >
        <span style={{ display: "block" }}>
          When you join <span style={{ whiteSpace: "nowrap" }}><ClaraBrandName />,</span>
        </span>
        <span style={{ display: "block", marginTop: 4 }}>you&apos;re not only helping yourself.</span>
      </h1>
      <p
        className="clara-onboarding-body clara-onboarding-body--lead"
        style={{ maxWidth: 330, marginTop: 24 }}
      >
        You become part of a growing movement of Filipinos choosing to live within their means, build financial stability, and make better money decisions.
      </p>
      <AccentRule />
      <p
        className="clara-onboarding-kicker clara-onboarding-kicker--blue"
        style={{ marginTop: 26 }}
      >
        The goal is bigger than one person.
      </p>
      <p
        className="clara-onboarding-tagline"
        style={{ maxWidth: 315, marginTop: 18, lineHeight: 1.3 }}
      >
        Normalize healthy money habits in the Philippines.
      </p>
    </ScreenFrame>
  );
}