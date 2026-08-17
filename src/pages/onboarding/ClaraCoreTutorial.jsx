import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CircleDollarSign,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import ClaraLogo from "@/components/ClaraLogo";
import ClaraBrandName from "@/components/ClaraBrandName";
import ClaraTutorialOrbDemo from "./ClaraTutorialOrbDemo";
import "./ClaraCoreTutorial.css";

const JUAN = {
  income: "₱22,000 / month",
  payday: "15th & 30th",
  nextPayday: "August 30",
  wallet: "₱4,600",
  protectedBudget: "₱2,200",
  emergencyFund: "₱3,000 of ₱8,000",
  savingsGoal: "Laptop · ₱6,500 of ₱18,000",
  obligation: "Phone installment · ₱900 due Aug 24",
};

const FEATURE_STEPS = {
  profile: {
    eyebrow: "MONEY PROFILE",
    title: "Remember CLARA considered Juan's family responsibilities?",
    callback:
      "CLARA knew Juan supports his family because Juan added that life context to his Money Profile.",
    intro:
      "Before we return to the chat, here is how Juan set up the personal context behind his money decisions.",
    icon: Compass,
    setup: [
      ["01", "Open Money Profile", "Juan starts from his personal money profile."],
      ["02", "Choose his current life stage", "Full-time earner."],
      ["03", "Add responsibilities", "He marks that he supports his family financially."],
      ["04", "Set what matters now", "Protect essentials and build more financial stability."],
    ],
    resultLabel: "WHAT CLARA NOW UNDERSTANDS",
    result:
      "Juan is not just an income number. CLARA knows he is a full-time earner supporting family while trying to strengthen his own financial position.",
    source: "Profile",
  },
  income: {
    eyebrow: "INCOME HUB",
    title: "Remember CLARA knew Juan's next payday?",
    callback: `CLARA knew Juan's next expected income is ${JUAN.nextPayday}.`,
    intro:
      "Before we go back to the conversation, let me show you how Juan set up his salary in Income Hub.",
    icon: CircleDollarSign,
    setup: [
      ["01", "Open Income Hub", "Juan taps Add Income."],
      ["02", "Choose the source", "Salary."],
      ["03", "Enter the amount", JUAN.income],
      ["04", "Set the income schedule", `Paydays: ${JUAN.payday}.`],
    ],
    resultLabel: "WHY THIS MATTERS",
    result:
      "Income Hub gives CLARA a timeline. CLARA can consider not only how much Juan earns, but when new money is expected to arrive.",
    source: "Income Hub",
  },
  wallet: {
    eyebrow: "WALLET",
    title: `Remember CLARA knew Juan currently had ${JUAN.wallet}?`,
    callback: `That amount came from Juan's Wallet — the money he has available right now.`,
    intro:
      "Juan keeps this simple. He updates the money currently available to him so CLARA is not deciding from an old balance.",
    icon: WalletCards,
    setup: [
      ["01", "Open Wallet", "Juan checks the current amount."],
      ["02", "Update available money", JUAN.wallet],
      ["03", "Keep it current", "When money moves in or out, Juan updates the Wallet."],
    ],
    resultLabel: "WHAT CLARA NOW KNOWS",
    result:
      "CLARA can separate 'I earn ₱22,000' from 'I only have ₱4,600 available today.' Those are very different spending situations.",
    source: "Wallet",
  },
  budget: {
    eyebrow: "BUDGET",
    title: `Remember CLARA protected ${JUAN.protectedBudget} for food and transport?`,
    callback:
      "That money looked available in Juan's Wallet, but his Budget told CLARA it still had a job to do.",
    intro:
      "Here is how Juan told CLARA what part of his money should not be casually spent.",
    icon: LayoutDashboard,
    setup: [
      ["01", "Open Budget", "Juan creates the spending areas that matter before payday."],
      ["02", "Add essentials", "Food and transportation."],
      ["03", "Assign the amount", JUAN.protectedBudget],
      ["04", "Use it as a boundary", `This amount needs to last until ${JUAN.nextPayday}.`],
    ],
    resultLabel: "THE IMPORTANT DIFFERENCE",
    result:
      "Wallet tells CLARA what exists. Budget tells CLARA what that money still needs to accomplish.",
    source: "Budget",
  },
  emergency: {
    eyebrow: "EMERGENCY FUND",
    title: "Remember CLARA said Juan was protecting his emergency fund?",
    callback: `Juan has ${JUAN.emergencyFund} saved for emergencies.`,
    intro:
      "Before CLARA recommends using protected money for a want, it can see the emergency buffer Juan is still building.",
    icon: ShieldCheck,
    setup: [
      ["01", "Open Emergency Fund", "Juan starts a dedicated safety buffer."],
      ["02", "Set the target", "₱8,000."],
      ["03", "Record current progress", "₱3,000 saved."],
      ["04", "Keep it protected", "Juan only treats it as spendable when the situation is genuinely an emergency."],
    ],
    resultLabel: "WHY CLARA PROTECTS IT",
    result:
      "A purchase may be technically possible while still weakening Juan's safety. CLARA can make that tradeoff visible before he spends.",
    source: "Emergency Fund",
  },
  savings: {
    eyebrow: "SAVINGS GOAL",
    title: "What if Juan is saving for something important too?",
    callback: `Juan is saving for a laptop: ${JUAN.savingsGoal}.`,
    intro:
      "Savings Goals let CLARA connect today's small decision with something Juan already decided matters more.",
    icon: Target,
    setup: [
      ["01", "Open Savings Goal", "Juan taps Create Goal."],
      ["02", "Name the goal", "New laptop."],
      ["03", "Set the target", "₱18,000."],
      ["04", "Track progress", "₱6,500 already saved."],
    ],
    resultLabel: "WHAT CHANGES IN THE CHAT",
    result:
      "CLARA can now say more than 'you can afford it.' It can also show what the purchase could delay or compete with.",
    source: "Savings Goal",
  },
  debt: {
    eyebrow: "DEBT & OBLIGATIONS",
    title: "What about money Juan already promised somewhere else?",
    callback: JUAN.obligation,
    intro:
      "An upcoming payment should be visible before Juan commits the same money to another purchase.",
    icon: BrainCircuit,
    setup: [
      ["01", "Open Debt & Obligations", "Juan adds a payment he is responsible for."],
      ["02", "Enter the amount", "₱900 phone installment."],
      ["03", "Add the due date", "August 24."],
      ["04", "Keep it visible", "CLARA can now consider the payment before recommending discretionary spending."],
    ],
    resultLabel: "THE RESULT",
    result:
      "CLARA sees money that is already spoken for, even if the payment has not left Juan's Wallet yet.",
    source: "Debt & Obligations",
  },
};

const TUTORIAL_STEPS = [
  { id: "meet", type: "meet" },
  { id: "orb", type: "orb" },
  { id: "profile", type: "feature", feature: "profile" },
  { id: "income", type: "feature", feature: "income" },
  { id: "wallet", type: "feature", feature: "wallet" },
  { id: "budget", type: "feature", feature: "budget" },
  { id: "emergency", type: "feature", feature: "emergency" },
  { id: "savings", type: "feature", feature: "savings" },
  { id: "debt", type: "feature", feature: "debt" },
  { id: "payoff", type: "payoff" },
  { id: "habit", type: "habit" },
  { id: "learn", type: "learn" },
  { id: "ready", type: "ready" },
];

function Wordmark() {
  return (
    <span className="clara-core-tour-wordmark" aria-label="CLARA">
      <span>CL</span>
      <b>A</b>
      <i>RA</i>
    </span>
  );
}

function JuanHeader({ compact = false }) {
  return (
    <div className={`clara-tour-juan ${compact ? "is-compact" : ""}`}>
      <div className="clara-tour-juan-avatar">J</div>
      <div className="clara-tour-juan-copy">
        <small>OUR EXAMPLE USER</small>
        <strong>Juan</strong>
        <span>Full-time earner · {JUAN.income}</span>
      </div>
    </div>
  );
}

function TutorialEntranceRhythm() {
  const steps = [
    ["01", "WATCH", "Juan uses CLARA"],
    ["02", "REVEAL", "See what CLARA knew"],
    ["03", "LEARN", "Walk through the feature"],
  ];

  return (
    <div
      aria-label="How the CLARA guided tour works"
      style={{
        width: "min(100%, 440px)",
        margin: "0 auto",
        padding: "17px 16px 16px",
        border: "1px solid rgba(76, 132, 224, 0.22)",
        borderRadius: "22px",
        background:
          "radial-gradient(circle at 50% 0%, rgba(38, 103, 255, 0.15), transparent 48%), linear-gradient(180deg, rgba(10, 28, 61, 0.88), rgba(4, 13, 31, 0.9))",
        boxShadow: "0 24px 58px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.035)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            color: "#ffd34e",
            fontSize: "8px",
            fontWeight: 950,
            letterSpacing: ".2em",
          }}
        >
          CLARA GUIDED TOUR
        </span>
        <strong
          style={{
            display: "block",
            marginTop: "7px",
            color: "#f7fbff",
            fontSize: "15px",
            fontWeight: 900,
            letterSpacing: "-.018em",
          }}
        >
          One story. Every core feature, in context.
        </strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          marginTop: "15px",
        }}
      >
        {steps.map(([number, label, detail]) => (
          <div
            key={number}
            style={{
              minWidth: 0,
              padding: "11px 7px 10px",
              border: "1px solid rgba(85, 126, 188, 0.14)",
              borderRadius: "14px",
              background: "rgba(3, 13, 31, 0.64)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "block",
                color: "#5f8ed8",
                fontSize: "7px",
                fontWeight: 950,
                letterSpacing: ".12em",
              }}
            >
              {number}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                color: "#dceaff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: ".08em",
              }}
            >
              {label}
            </strong>
            <span
              style={{
                display: "block",
                marginTop: "4px",
                color: "#7187a7",
                fontSize: "7.5px",
                fontWeight: 650,
                lineHeight: 1.35,
              }}
            >
              {detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetStep() {
  return (
    <div className="clara-tour-story-step">
      <TutorialEntranceRhythm />

      <section className="clara-tour-copy-block">
        <span className="clara-tour-eyebrow">MEET JUAN</span>
        <h1>This is Juan.</h1>
        <p>
          Juan is a full-time earner making ₱22,000 a month. Follow him and see how he uses CLARA in real life.
        </p>
      </section>
    </div>
  );
}

function ConversationPaused({ feature }) {
  return (
    <div className="clara-tour-paused-chat">
      <div className="clara-tour-paused-label">
        <span /> Conversation paused
      </div>
      <div className="clara-tour-paused-message">
        <small>CLARA USED THIS INFORMATION</small>
        <p>{feature.callback}</p>
      </div>
    </div>
  );
}

function FeatureStep({ featureKey }) {
  const feature = FEATURE_STEPS[featureKey];
  const Icon = feature.icon;

  return (
    <div className="clara-tour-feature-step">
      <ConversationPaused feature={feature} />

      <section className="clara-tour-copy-block clara-tour-copy-block--left">
        <span className="clara-tour-eyebrow">{feature.eyebrow}</span>
        <h1>{feature.title}</h1>
        <p>{feature.intro}</p>
      </section>

      <div className="clara-tour-feature-panel">
        <div className="clara-tour-feature-titlebar">
          <div className="clara-tour-feature-icon"><Icon /></div>
          <div>
            <small>HOW JUAN SET IT UP</small>
            <strong>{feature.source}</strong>
          </div>
        </div>

        <div className="clara-tour-setup-list">
          {feature.setup.map(([number, title, detail]) => (
            <div className="clara-tour-setup-row" key={`${featureKey}-${number}`}>
              <span className="clara-tour-setup-number">{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
              <Check />
            </div>
          ))}
        </div>

        <div className="clara-tour-feature-result">
          <small>{feature.resultLabel}</small>
          <p>{feature.result}</p>
        </div>
      </div>

      <div className="clara-tour-return-note">
        <ArrowLeft />
        <span>Next, we return to Juan&apos;s conversation and uncover the next piece CLARA used.</span>
      </div>
    </div>
  );
}

function HabitStep() {
  return (
    <div className="clara-tour-story-step">
      <section className="clara-tour-copy-block">
        <span className="clara-tour-eyebrow">DAILY ACCOUNTABILITY</span>
        <h1>But CLARA only helps if Juan remembers to pause.</h1>
        <p>The Daily Money Tip and streak keep that behavior visible. The goal is not perfection — it is repetition.</p>
      </section>

      <div className="clara-tour-habit-card">
        <div className="clara-tour-habit-top">
          <small>JUAN&apos;S DAILY CHECK-IN</small>
          <strong>Pause before the small purchase too.</strong>
          <p>A ₱150 decision still deserves context when it becomes a daily pattern.</p>
        </div>
        <div className="clara-tour-streak-row">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`} className={index < 5 ? "is-done" : ""}>{day}</span>
          ))}
        </div>
        <div className="clara-tour-habit-bottom">
          <Sparkles />
          <span>Juan is not being trained to never spend. He is being trained to stop deciding blindly.</span>
        </div>
      </div>
    </div>
  );
}

function LearnStep() {
  return (
    <div className="clara-tour-story-step">
      <section className="clara-tour-copy-block">
        <span className="clara-tour-eyebrow">LEARN WITH CLARA</span>
        <h1>Sometimes Juan wants to understand the “why” behind the advice.</h1>
        <p>That is where the Learning Hub and Budgeting Masterclass come in. The ORB helps in the moment; the Learning Hub builds Juan&apos;s understanding over time.</p>
      </section>

      <div className="clara-tour-learning-stack">
        <div className="clara-tour-learning-card is-primary">
          <BookOpen />
          <div>
            <small>LEARNING HUB</small>
            <strong>Explore money concepts in one place.</strong>
            <p>Short explanations, guided lessons, and practical financial learning.</p>
          </div>
          <ArrowRight />
        </div>
        <div className="clara-tour-learning-card">
          <BrainCircuit />
          <div>
            <small>BUDGETING MASTERCLASS</small>
            <strong>Understand why the system works.</strong>
            <p>Go deeper when Juan — or you — wants more than a quick answer.</p>
          </div>
          <ArrowRight />
        </div>
      </div>
    </div>
  );
}

function ReadyStep() {
  return (
    <div className="clara-tour-story-step">
      <section className="clara-tour-copy-block">
        <span className="clara-tour-eyebrow">THE WHOLE SYSTEM</span>
        <h1>That&apos;s how Juan lives with CLARA.</h1>
        <p>He sets up his financial picture, keeps it current, pauses before spending, asks CLARA, and makes the decision with context.</p>
      </section>

      <div className="clara-tour-ready-card">
        <JuanHeader compact />
        <div className="clara-tour-ready-flow">
          <div><span>01</span><strong>Keep context current</strong><p>Profile + financial cards</p></div>
          <ArrowRight />
          <div><span>02</span><strong>Pause</strong><p>Before money leaves</p></div>
          <ArrowRight />
          <div><span>03</span><strong>Ask CLARA</strong><p>Use the ORB</p></div>
          <ArrowRight />
          <div><span>04</span><strong>Decide</strong><p>With the full picture</p></div>
        </div>
        <div className="clara-tour-final-rule">
          <ClaraLogo variant="icon" theme="dark" />
          <div>
            <small>NOW IT&apos;S YOUR TURN</small>
            <strong>Before you spend, ask <ClaraBrandName />.</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepContent({ step }) {
  if (step.type === "meet") return <MeetStep />;
  if (step.type === "feature") return <FeatureStep featureKey={step.feature} />;
  if (step.type === "habit") return <HabitStep />;
  if (step.type === "learn") return <LearnStep />;
  return <ReadyStep />;
}

function nextLabelFor(step, isLast) {
  if (isLast) return "Start using CLARA";
  if (step.type === "meet") return "See Juan use CLARA";
  if (step.type === "feature") return "Back to Juan";
  return "Continue";
}

export default function ClaraCoreTutorial({ onFinish, onSkip }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / TUTORIAL_STEPS.length) * 100),
    [stepIndex]
  );

  const next = () => {
    if (isLast) {
      onFinish?.();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, TUTORIAL_STEPS.length - 1));
  };

  const back = () => {
    if (isFirst) return;
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  if (step.type === "orb" || step.type === "payoff") {
    return (
      <ClaraTutorialOrbDemo
        phase={step.type === "payoff" ? "payoff" : "initial"}
        onBack={back}
        onContinue={next}
        onSkip={onSkip}
      />
    );
  }

  return (
    <div className="clara-core-tour">
      <div className="clara-core-tour-ambient" aria-hidden="true" />

      <header className="clara-core-tour-header">
        <div className="clara-core-tour-header-row">
          <Wordmark />
          <button type="button" onClick={onSkip} className="clara-core-tour-skip">
            Skip tour <X />
          </button>
        </div>
        <div className="clara-core-tour-progress" aria-label={`Tutorial progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="clara-core-tour-counter">
          {String(stepIndex + 1).padStart(2, "0")} / {String(TUTORIAL_STEPS.length).padStart(2, "0")}
        </div>
      </header>

      <main className="clara-core-tour-main" key={step.id}>
        <StepContent step={step} />
      </main>

      <footer className="clara-core-tour-footer">
        <button
          type="button"
          onClick={back}
          className="clara-core-tour-back"
          disabled={isFirst}
          aria-label="Previous tutorial step"
        >
          <ArrowLeft />
        </button>
        <button type="button" onClick={next} className="clara-core-tour-next">
          <span>{nextLabelFor(step, isLast)}</span>
          <ArrowRight />
        </button>
      </footer>
    </div>
  );
}
