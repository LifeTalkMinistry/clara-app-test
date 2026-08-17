import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";
import { useAuth } from "@/context/AuthContext";
import MoneySituationScreen from "./MoneySituationScreen";
import { getUniversalOnboardingStyles } from "./UniversalOnboardingStyles";
import {
  AmbientField,
  BeforeScreen,
  ClaraRevealScreen,
  ClaraWordmark,
  CountryScreen,
  MissionScreen,
  PersonalScreen,
  QuietSpendingScreen,
  RuleScreen,
  SCREEN_IDS,
  SpendingImpactScreen,
  SupportScreen,
  firstNameFrom,
} from "./UniversalOnboardingScreens";

const CLARA_ORB_PATH = "/community?view=orb";
const SUPPORT_BUBBLE_EPOCH_KEY = "clara_support_bubble_cycle_epoch_v2";
const OPEN_SUPPORT_AFTER_ONBOARDING_KEY = "clara_open_support_after_onboarding_v1";
const MISSION_ONBOARDING_COMPLETE_PREFIX = "clara_mission_onboarding_complete_v1";

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
    if (activeScreen === "spending-impact") {
      return <SpendingImpactScreen reduceMotion={reduceMotion} />;
    }
    if (activeScreen === "money-situation") return <MoneySituationScreen />;
    if (activeScreen === "before") return <BeforeScreen />;
    if (activeScreen === "personal") return <PersonalScreen firstName={firstName} />;
    if (activeScreen === "clara") {
      return <ClaraRevealScreen reduceMotion={reduceMotion} />;
    }
    if (activeScreen === "mission") return <MissionScreen />;
    if (activeScreen === "support") {
      return <SupportScreen onExploreSupport={exploreSupport} />;
    }
    return <RuleScreen />;
  })();

  return (
    <div className="clara-mission-onboarding">
      <style>{`${getUniversalOnboardingStyles(SCREEN_IDS.length)}
        .clara-onboarding-transition {
          overflow-y: auto;
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
          transition={{
            duration: reduceMotion ? 0.16 : 0.38,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="clara-onboarding-transition"
        >
          {content}
        </motion.div>
      </AnimatePresence>

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
