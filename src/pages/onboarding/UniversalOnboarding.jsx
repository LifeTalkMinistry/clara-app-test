import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, Compass, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ClaraCoreTutorial from "./ClaraCoreTutorial";
import { getUniversalOnboardingStyles } from "./UniversalOnboardingStyles";
import {
  AmbientField,
  BiggerVisionScreen,
  ClaraRevealScreen,
  ClaraWordmark,
  CountryScreen,
  JuanChoiceScreen,
  JuanIntroScreen,
  MeasurementScreen,
  MeansScoreScreen,
  MissionRuleScreen,
  QuantifiedFeedbackScreen,
  ScoreMeaningScreen,
  SimulationReadyScreen,
  SCREEN_IDS,
} from "./UniversalOnboardingScreens";

const CLARA_ORB_PATH = "/community?view=orb";
const MISSION_ONBOARDING_COMPLETE_PREFIX = "clara_mission_onboarding_complete_v1";
const CORE_TUTORIAL_STATUS_PREFIX = "clara_core_tutorial_status_v1";
// Keep the tutorial implementation intact while temporarily removing it from onboarding.
// Flip this back on when the guided walkthrough is ready to return.
const CORE_TUTORIAL_ENABLED = false;
const ONBOARDING_SCREEN_IDS = SCREEN_IDS;

function completionKey(user) {
  const identity = user?.id || user?.email || "local";
  return `${MISSION_ONBOARDING_COMPLETE_PREFIX}:${identity}`;
}

function tutorialStatusKey(user) {
  const identity = user?.id || user?.email || "local";
  return `${CORE_TUTORIAL_STATUS_PREFIX}:${identity}`;
}

function rememberCompletion(user) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(completionKey(user), new Date().toISOString());
  } catch {
    // Onboarding should never fail because storage is unavailable.
  }
}

function rememberTutorialStatus(user, status) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      tutorialStatusKey(user),
      JSON.stringify({ status, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Tutorial status is helpful, but never blocks the user from entering CLARA.
  }
}

export default function UniversalOnboarding() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const [screenIndex, setScreenIndex] = useState(0);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [selectedJuanShoe, setSelectedJuanShoe] = useState("");
  const activeScreen = ONBOARDING_SCREEN_IDS[screenIndex];
  const isFirst = screenIndex === 0;
  const isLast = screenIndex === ONBOARDING_SCREEN_IDS.length - 1;
  const choiceNeedsSelection = activeScreen === "juan-choice" && !selectedJuanShoe;

  const goNext = () => {
    if (isLast || choiceNeedsSelection) return;
    setScreenIndex((current) =>
      Math.min(current + 1, ONBOARDING_SCREEN_IDS.length - 1),
    );
  };

  const goBack = () => {
    if (isFirst) return;
    setScreenIndex((current) => Math.max(current - 1, 0));
  };

  const enterClara = () => {
    rememberCompletion(user);
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  const startTutorial = () => {
    rememberCompletion(user);
    rememberTutorialStatus(user, "started");
    setTutorialActive(true);
  };

  const finishTutorial = () => {
    rememberCompletion(user);
    rememberTutorialStatus(user, "completed");
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  const skipTutorial = () => {
    rememberCompletion(user);
    rememberTutorialStatus(user, "skipped");
    navigate(CLARA_ORB_PATH, { replace: true });
  };

  if (CORE_TUTORIAL_ENABLED && tutorialActive) {
    return <ClaraCoreTutorial onFinish={finishTutorial} onSkip={skipTutorial} />;
  }

  const content = (() => {
    if (activeScreen === "country") return <CountryScreen />;
    if (activeScreen === "measurement") return <MeasurementScreen />;
    if (activeScreen === "means-score") return <MeansScoreScreen />;
    if (activeScreen === "score-meaning") return <ScoreMeaningScreen />;
    if (activeScreen === "simulation-ready") return <SimulationReadyScreen />;
    if (activeScreen === "juan-intro") return <JuanIntroScreen />;
    if (activeScreen === "juan-choice") {
      return (
        <JuanChoiceScreen
          selectedOptionId={selectedJuanShoe}
          onSelect={setSelectedJuanShoe}
        />
      );
    }
    if (activeScreen === "quantified-feedback") {
      return <QuantifiedFeedbackScreen selectedOptionId={selectedJuanShoe} />;
    }
    if (activeScreen === "clara-reveal") {
      return <ClaraRevealScreen reduceMotion={reduceMotion} />;
    }
    if (activeScreen === "mission-rule") return <MissionRuleScreen />;
    return <BiggerVisionScreen />;
  })();

  const primaryLabel = (() => {
    if (isLast) return "See My Financial Status";
    if (activeScreen === "simulation-ready") return "Ready";
    if (activeScreen === "juan-intro") return "Yes, help Juan";
    if (activeScreen === "juan-choice") {
      return selectedJuanShoe ? "See the impact" : "Choose a pair";
    }
    if (activeScreen === "quantified-feedback") return "Ask CLARA";
    return "Continue";
  })();

  return (
    <div className="clara-mission-onboarding">
      <style>{`${getUniversalOnboardingStyles(ONBOARDING_SCREEN_IDS.length)}
        .clara-onboarding-transition {
          overflow-y: auto;
          position: relative;
        }

        .clara-onboarding-tour-entry {
          position: absolute;
          z-index: 30;
          left: 50%;
          bottom: 92px;
          width: min(calc(100% - 54px), 392px);
          min-height: 64px;
          transform: translateX(-50%);
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(77, 130, 220, 0.28);
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(16, 35, 70, 0.97), rgba(7, 18, 40, 0.98));
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
          color: #eef5ff;
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .clara-onboarding-tour-entry::before {
          content: "";
          position: absolute;
          inset: -1px;
          z-index: -1;
          border-radius: inherit;
          background: linear-gradient(110deg, rgba(59, 130, 246, 0.22), transparent 42%, rgba(250, 204, 21, 0.08));
          pointer-events: none;
        }

        .clara-onboarding-tour-icon {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(96, 165, 250, 0.3);
          border-radius: 13px;
          background: rgba(37, 99, 235, 0.13);
          color: #75a9ff;
        }

        .clara-onboarding-tour-icon svg {
          width: 19px;
          height: 19px;
        }

        .clara-onboarding-tour-copy {
          display: block;
          min-width: 0;
        }

        .clara-onboarding-tour-kicker {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #6f98d8;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .clara-onboarding-tour-kicker svg {
          width: 10px;
          height: 10px;
          color: #facc15;
        }

        .clara-onboarding-tour-title {
          display: block;
          margin-top: 4px;
          color: #f7fbff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }

        .clara-onboarding-tour-text {
          display: block;
          margin-top: 2px;
          overflow: hidden;
          color: #8295b1;
          font-size: 9px;
          font-weight: 600;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .clara-onboarding-tour-arrow {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.14);
          color: #79aaff;
        }

        .clara-onboarding-tour-arrow svg {
          width: 14px;
          height: 14px;
        }

        .clara-onboarding-simulation-score {
          width: min(100%, 280px);
          margin-top: 26px;
          padding: 17px 18px 15px;
          border: 1px solid rgba(73, 132, 235, 0.24);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(27, 66, 132, 0.12), rgba(8, 20, 49, 0.06));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .clara-onboarding-simulation-score span,
        .clara-onboarding-simulation-scorebar span {
          display: block;
          color: rgba(174, 204, 248, 0.66);
          font-size: 9px;
          font-weight: 760;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .clara-onboarding-simulation-score strong {
          display: block;
          margin-top: 7px;
          color: #f8fbff;
          font-size: 38px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: -0.045em;
          font-variant-numeric: tabular-nums;
        }

        .clara-onboarding-simulation-question {
          max-width: 350px;
          margin-top: 24px;
          line-height: 1.45;
        }

        .clara-onboarding-simulation-choice-screen {
          justify-content: flex-start;
        }

        .clara-onboarding-shoe-options {
          width: 100%;
          max-width: 375px;
          margin-top: 24px;
          display: grid;
          gap: 10px;
        }

        .clara-onboarding-shoe-option {
          width: 100%;
          min-height: 104px;
          padding: 14px 15px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 17px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.016));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
          color: #f4f8ff;
          text-align: left;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .clara-onboarding-shoe-option:active {
          transform: scale(0.985);
        }

        .clara-onboarding-shoe-option.is-selected {
          border-color: rgba(79, 145, 255, 0.52);
          background: linear-gradient(180deg, rgba(40, 103, 222, 0.15), rgba(11, 31, 74, 0.09));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 0 24px rgba(42, 111, 245, 0.08);
        }

        .clara-onboarding-shoe-option-topline,
        .clara-onboarding-shoe-option-impact {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        .clara-onboarding-shoe-option-topline strong {
          font-size: 13px;
          font-weight: 680;
          letter-spacing: -0.015em;
        }

        .clara-onboarding-shoe-option-topline > span {
          color: #f8fbff;
          font-size: 13px;
          font-weight: 720;
          font-variant-numeric: tabular-nums;
        }

        .clara-onboarding-shoe-option-impact {
          margin-top: 11px;
        }

        .clara-onboarding-shoe-option-impact > span {
          color: rgba(213, 226, 246, 0.48);
          font-size: 10px;
          font-weight: 600;
        }

        .clara-onboarding-shoe-option-impact strong {
          color: #8ebcff;
          font-size: 17px;
          font-weight: 720;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
        }

        .clara-onboarding-shoe-option-status {
          display: block;
          margin-top: 7px;
          font-size: 9px;
          font-weight: 760;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .clara-onboarding-shoe-option-status.is-safe { color: #8fc2ff; }
        .clara-onboarding-shoe-option-status.is-line { color: #ffe178; }
        .clara-onboarding-shoe-option-status.is-below { color: #ff9ba3; }

        .clara-onboarding-simulation-scorebar {
          width: 100%;
          max-width: 375px;
          margin-top: 16px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: #f8fbff;
        }

        .clara-onboarding-simulation-scorebar strong {
          font-size: 23px;
          line-height: 1;
          font-weight: 720;
          font-variant-numeric: tabular-nums;
        }

        .clara-onboarding-feedback-result {
          width: min(100%, 315px);
          margin-top: 27px;
          padding: 19px 18px;
          border: 1px solid rgba(77, 136, 239, 0.26);
          border-radius: 19px;
          background: linear-gradient(180deg, rgba(34, 86, 184, 0.11), rgba(8, 24, 60, 0.06));
        }

        .clara-onboarding-feedback-result > strong {
          display: block;
          margin-top: 8px;
          color: #f8fbff;
          font-size: 35px;
          line-height: 1;
          font-weight: 720;
          letter-spacing: -0.045em;
          font-variant-numeric: tabular-nums;
        }

        .clara-onboarding-feedback-result > span:last-child {
          display: block;
          margin-top: 9px;
          color: rgba(220, 231, 247, 0.53);
          font-size: 11px;
          line-height: 1.4;
        }

        .clara-onboarding-continue:disabled {
          opacity: 0.42;
          cursor: not-allowed;
          filter: saturate(0.55);
        }

        @media (max-height: 740px) {
          .clara-onboarding-simulation-choice-screen {
            padding-top: 102px;
            padding-bottom: 102px;
          }

          .clara-onboarding-simulation-choice-screen .clara-onboarding-title {
            margin-top: 18px;
            font-size: clamp(1.72rem, 7.5vw, 2.12rem);
          }

          .clara-onboarding-simulation-choice-screen .clara-onboarding-body {
            margin-top: 13px;
            line-height: 1.5;
          }

          .clara-onboarding-shoe-options {
            margin-top: 16px;
            gap: 8px;
          }

          .clara-onboarding-shoe-option {
            min-height: 92px;
            padding-block: 11px;
          }
        }

        @media (max-height: 700px) {
          .clara-onboarding-tour-entry {
            bottom: 82px;
            min-height: 56px;
            padding-block: 7px;
          }

          .clara-onboarding-tour-icon {
            width: 36px;
            height: 36px;
          }

          .clara-onboarding-tour-text {
            display: none;
          }
        }
      `}</style>

      <AmbientField />

      <header className="clara-onboarding-header">
        <div className="clara-onboarding-header-row">
          <ClaraWordmark />
          <span className="clara-onboarding-counter">
            {String(screenIndex + 1).padStart(2, "0")} / {String(ONBOARDING_SCREEN_IDS.length).padStart(2, "0")}
          </span>
        </div>
        <div className="clara-onboarding-progress" aria-hidden="true">
          {ONBOARDING_SCREEN_IDS.map((screenId, index) => (
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
          transition={{
            duration: reduceMotion ? 0.16 : 0.38,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="clara-onboarding-transition"
        >
          {content}
        </motion.div>
      </AnimatePresence>

      {isLast && CORE_TUTORIAL_ENABLED ? (
        <button
          type="button"
          onClick={startTutorial}
          className="clara-onboarding-tour-entry"
          aria-label="Take the CLARA core feature tour"
        >
          <span className="clara-onboarding-tour-icon">
            <Compass strokeWidth={1.8} />
          </span>
          <span className="clara-onboarding-tour-copy">
            <span className="clara-onboarding-tour-kicker">
              <Sparkles strokeWidth={1.8} /> Optional guided walkthrough
            </span>
            <span className="clara-onboarding-tour-title">Take the CLARA Tour</span>
            <span className="clara-onboarding-tour-text">See the core features before you start.</span>
          </span>
          <span className="clara-onboarding-tour-arrow" aria-hidden="true">
            <ArrowRight />
          </span>
        </button>
      ) : null}

      <footer className="clara-onboarding-footer">
        <div className="clara-onboarding-footer-inner">
          {!isFirst ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="clara-onboarding-back"
            >
              <ChevronLeft />
            </button>
          ) : null}

          <button
            type="button"
            onClick={isLast ? enterClara : goNext}
            className="clara-onboarding-continue"
            disabled={choiceNeedsSelection}
          >
            <span>{primaryLabel}</span>
            <ArrowRight />
          </button>
        </div>
      </footer>
    </div>
  );
}
