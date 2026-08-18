import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import ClaraOrbPage from "@/components/community/ClaraOrbPage";
import ClaraTutorialOrbDemo from "./ClaraTutorialOrbDemo";

export default function ClaraTutorialOrbIntro({ onBack, onContinue, onSkip }) {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <ClaraTutorialOrbDemo
        phase="initial"
        onBack={() => setStarted(false)}
        onContinue={onContinue}
        onSkip={onSkip}
      />
    );
  }

  return (
    <div className="clara-tutorial-orb-intro-screen" data-clara-tutorial-orb-intro="true">
      <style>{`
        .clara-tutorial-orb-intro-screen {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: flex;
          min-height: 100dvh;
          overflow: hidden;
          background: #010217;
        }

        .clara-tutorial-orb-intro-screen > .clara-community-orb-view {
          min-height: 100dvh;
          width: 100%;
          flex: 1 1 auto;
        }

        .clara-tutorial-orb-intro-nav {
          position: fixed;
          z-index: 1310;
          top: max(10px, env(safe-area-inset-top));
          left: 50%;
          display: flex;
          width: min(calc(100% - 24px), 430px);
          transform: translateX(-50%);
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
        }

        .clara-tutorial-orb-intro-nav button {
          pointer-events: auto;
          display: inline-flex;
          min-width: 44px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: rgba(226, 236, 252, 0.48);
          font: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: color 160ms ease, opacity 160ms ease, transform 160ms ease;
        }

        .clara-tutorial-orb-intro-nav button:hover,
        .clara-tutorial-orb-intro-nav button:focus-visible {
          color: rgba(244, 248, 255, 0.88);
        }

        .clara-tutorial-orb-intro-nav button:active {
          transform: scale(0.96);
        }

        .clara-tutorial-orb-intro-back svg {
          width: 18px;
          height: 18px;
        }

        .clara-tutorial-orb-intro-skip {
          gap: 6px;
          padding-inline: 8px;
          font-size: 10px !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em;
        }

        .clara-tutorial-orb-intro-skip svg {
          width: 13px;
          height: 13px;
        }

        @media (max-height: 640px) {
          .clara-tutorial-orb-intro-nav {
            top: max(4px, env(safe-area-inset-top));
          }
        }
      `}</style>

      <ClaraOrbPage
        onActivate={() => setStarted(true)}
        activationDelayMs={360}
      />

      <nav className="clara-tutorial-orb-intro-nav" aria-label="Tutorial controls">
        <button
          type="button"
          className="clara-tutorial-orb-intro-back"
          onClick={onBack}
          aria-label="Back to Juan"
        >
          <ArrowLeft />
        </button>

        <button
          type="button"
          className="clara-tutorial-orb-intro-skip"
          onClick={onSkip}
          aria-label="Skip tutorial"
        >
          <span>Skip tour</span>
          <X />
        </button>
      </nav>
    </div>
  );
}
