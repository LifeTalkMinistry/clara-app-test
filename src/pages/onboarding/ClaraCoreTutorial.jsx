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
import "./ClaraCoreTutorial.css";

const TUTORIAL_STEPS = [
  {
    id: "welcome",
    eyebrow: "CLARA CORE TOUR",
    title: "See how CLARA fits into your money decisions.",
    body: "This is a quick guided walkthrough of the core features you will use most. No setup is required here — just see how the pieces work together.",
  },
  {
    id: "orb",
    eyebrow: "01 · ASK BEFORE YOU SPEND",
    title: "Start with the CLARA ORB.",
    body: "When you are about to buy something, ask CLARA first. The goal is to create a pause before money leaves your hands.",
  },
  {
    id: "picture",
    eyebrow: "02 · YOUR FINANCIAL PICTURE",
    title: "CLARA needs context, not just a price tag.",
    body: "Your financial hubs give CLARA the context behind the decision — what is available, what is already committed, and what must stay protected.",
  },
  {
    id: "profile",
    eyebrow: "03 · YOUR REAL LIFE",
    title: "Money advice should understand the person living it.",
    body: "Your Money Profile adds life context such as responsibilities, priorities, goals, and the season you are currently in.",
  },
  {
    id: "habit",
    eyebrow: "04 · DAILY ACCOUNTABILITY",
    title: "The system only works when the habit becomes normal.",
    body: "Daily Money Tips and your streak keep the pause visible so better decisions can become repetition instead of a one-time plan.",
  },
  {
    id: "learn",
    eyebrow: "05 · LEARN WITH CLARA",
    title: "When you want the deeper reason, open the Learning Hub.",
    body: "Use the Learning Hub and Budgeting Masterclass to understand the principles behind the decisions CLARA is helping you make.",
  },
  {
    id: "ready",
    eyebrow: "YOU'RE READY",
    title: "One simple loop ties everything together.",
    body: "Keep your money picture current, pause before spending, ask CLARA, then make the decision with context.",
  },
];

function Wordmark() {
  return (
    <span className="clara-core-tour-wordmark" aria-label="CLARA">
      <span>CL</span><b>A</b><i>RA</i>
    </span>
  );
}

function WelcomeVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-welcome-visual">
      <div className="clara-core-tour-orb-mark">
        <span className="clara-core-tour-orb-halo" aria-hidden="true" />
        <ClaraLogo variant="icon" theme="dark" />
      </div>
      <div className="clara-core-tour-mini-map">
        <span><CircleDollarSign /> Ask</span>
        <i />
        <span><BrainCircuit /> Understand</span>
        <i />
        <span><Target /> Decide</span>
      </div>
    </div>
  );
}

function OrbVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-orb-demo">
      <div className="clara-core-tour-demo-label">A REAL DECISION</div>
      <div className="clara-core-tour-user-bubble">
        <span>I want to spend</span>
        <strong>₱2,500</strong>
      </div>
      <div className="clara-core-tour-check-line">
        <span><WalletCards /> Available money</span>
        <Check />
      </div>
      <div className="clara-core-tour-check-line">
        <span><LayoutDashboard /> Upcoming obligations</span>
        <Check />
      </div>
      <div className="clara-core-tour-check-line">
        <span><ShieldCheck /> Protected money</span>
        <Check />
      </div>
      <div className="clara-core-tour-clara-answer">
        <small>CLARA'S JOB</small>
        <strong>Help you decide before the purchase — not explain it after.</strong>
      </div>
    </div>
  );
}

const MONEY_HUBS = [
  "Income Hub",
  "Wallet",
  "Budget",
  "Emergency Fund",
  "Savings Goals",
  "Debt & Obligations",
];

function PictureVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-picture-demo">
      <div className="clara-core-tour-picture-grid">
        {MONEY_HUBS.map((hub, index) => (
          <div key={hub} className="clara-core-tour-money-tile">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{hub}</strong>
          </div>
        ))}
      </div>
      <p className="clara-core-tour-visual-note">
        These are not separate chores. Together, they tell CLARA what your money can safely do.
      </p>
    </div>
  );
}

function ProfileVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-profile-demo">
      <div className="clara-core-tour-profile-card">
        <span className="clara-core-tour-profile-icon"><Compass /></span>
        <div>
          <small>MONEY PROFILE</small>
          <strong>Your financial life has context.</strong>
        </div>
      </div>
      <div className="clara-core-tour-context-chips">
        <span>Family responsibilities</span>
        <span>Income rhythm</span>
        <span>Current goals</span>
        <span>Life stage</span>
      </div>
      <div className="clara-core-tour-context-result">
        <Sparkles />
        <p>Same purchase. Better answer because CLARA understands more of your reality.</p>
      </div>
    </div>
  );
}

function HabitVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-habit-demo">
      <div className="clara-core-tour-streak-card">
        <small>DAILY MONEY TIP</small>
        <strong>Pause before the small purchase too.</strong>
        <div className="clara-core-tour-streak-row">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`} className={index < 5 ? "is-done" : ""}>{day}</span>
          ))}
        </div>
      </div>
      <p className="clara-core-tour-visual-note">
        The goal is not a perfect streak. The goal is making thoughtful money decisions feel normal.
      </p>
    </div>
  );
}

function LearnVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-learn-demo">
      <div className="clara-core-tour-learning-card clara-core-tour-learning-card--primary">
        <BookOpen />
        <div>
          <small>LEARNING HUB</small>
          <strong>Build your financial understanding.</strong>
        </div>
        <ArrowRight />
      </div>
      <div className="clara-core-tour-learning-card">
        <BrainCircuit />
        <div>
          <small>BUDGETING MASTERCLASS</small>
          <strong>Understand why the system works.</strong>
        </div>
        <ArrowRight />
      </div>
    </div>
  );
}

function ReadyVisual() {
  return (
    <div className="clara-core-tour-visual clara-core-tour-ready-demo">
      <div className="clara-core-tour-loop">
        <span><WalletCards /> Keep context current</span>
        <ArrowRight />
        <span><CircleDollarSign /> Ask before spending</span>
        <ArrowRight />
        <span><Target /> Decide with clarity</span>
      </div>
      <div className="clara-core-tour-ready-rule">
        <small>THE RULE</small>
        <strong>Before you spend, ask <ClaraBrandName />.</strong>
      </div>
    </div>
  );
}

function StepVisual({ stepId }) {
  if (stepId === "orb") return <OrbVisual />;
  if (stepId === "picture") return <PictureVisual />;
  if (stepId === "profile") return <ProfileVisual />;
  if (stepId === "habit") return <HabitVisual />;
  if (stepId === "learn") return <LearnVisual />;
  if (stepId === "ready") return <ReadyVisual />;
  return <WelcomeVisual />;
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
        <section className="clara-core-tour-copy">
          <span className="clara-core-tour-eyebrow">{step.eyebrow}</span>
          <h1>{step.title}</h1>
          <p>{step.body}</p>
        </section>

        <StepVisual stepId={step.id} />
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
          <span>{isLast ? "Start using CLARA" : "Continue"}</span>
          <ArrowRight />
        </button>
      </footer>
    </div>
  );
}
