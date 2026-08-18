import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { ClaraOrbMark } from "@/components/community/ClaraOrbPage";
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
    <div className="clara-tutorial-orb-intro-screen">
      <style>{`
        .clara-tutorial-orb-intro-screen {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          min-height: 100dvh;
          overflow: hidden;
          color: #f8fbff;
          background:
            radial-gradient(circle at 50% 34%, rgba(29, 91, 220, .13), transparent 34%),
            linear-gradient(180deg, #030919 0%, #020617 52%, #01030b 100%);
          font-family: Inter, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .clara-tutorial-orb-intro-screen * { box-sizing: border-box; }

        .clara-tutorial-orb-intro-header,
        .clara-tutorial-orb-intro-main,
        .clara-tutorial-orb-intro-footer {
          position: relative;
          z-index: 2;
          width: min(100%, 600px);
          margin-inline: auto;
        }

        .clara-tutorial-orb-intro-header {
          padding: max(18px, env(safe-area-inset-top)) 22px 0;
        }

        .clara-tutorial-orb-intro-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .clara-tutorial-orb-intro-wordmark {
          display: inline-flex;
          align-items: center;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: .19em;
          line-height: 1;
        }

        .clara-tutorial-orb-intro-wordmark > span { color: #4f8cff; }
        .clara-tutorial-orb-intro-wordmark > b { color: #ffd34e; font: inherit; }
        .clara-tutorial-orb-intro-wordmark > i { color: #ff4c55; font: inherit; }

        .clara-tutorial-orb-intro-skip {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          gap: 7px;
          padding: 0 11px 0 13px;
          border: 1px solid rgba(137, 164, 204, .15);
          border-radius: 999px;
          background: rgba(12, 24, 47, .56);
          color: #8fa1bc;
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .04em;
          cursor: pointer;
        }

        .clara-tutorial-orb-intro-skip svg { width: 13px; height: 13px; }

        .clara-tutorial-orb-intro-progress {
          height: 3px;
          margin-top: 16px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(70, 91, 126, .2);
        }

        .clara-tutorial-orb-intro-progress > span {
          display: block;
          width: 15%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #2b75ff 0%, #60a5fa 74%, #ffd34e 100%);
          box-shadow: 0 0 14px rgba(58, 137, 255, .32);
        }

        .clara-tutorial-orb-intro-counter {
          margin-top: 7px;
          color: #58708f;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: .19em;
          text-align: right;
        }

        .clara-tutorial-orb-intro-main {
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 24px 16px;
          text-align: center;
        }

        .clara-tutorial-orb-intro-composition {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-bottom: clamp(22px, 5dvh, 48px);
        }

        .clara-tutorial-orb-intro-copy {
          width: min(100%, 430px);
        }

        .clara-tutorial-orb-intro-copy small {
          color: #6f9ff0;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .2em;
        }

        .clara-tutorial-orb-intro-copy h1 {
          margin: 9px 0 0;
          color: #fff;
          font-size: clamp(28px, 7vw, 36px);
          font-weight: 950;
          line-height: 1.03;
          letter-spacing: -.045em;
        }

        .clara-tutorial-orb-intro-copy p {
          max-width: 390px;
          margin: 9px auto 0;
          color: #91a4bf;
          font-size: 11px;
          font-weight: 580;
          line-height: 1.55;
        }

        .clara-tutorial-orb-launcher {
          position: relative;
          display: grid;
          width: min(74vw, 38dvh, 310px);
          aspect-ratio: 1;
          margin: 4px auto 0;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          outline: 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .clara-tutorial-orb-launcher::before {
          content: "";
          position: absolute;
          inset: 10%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 107, 255, .18), rgba(37, 107, 255, 0) 70%);
          filter: blur(18px);
          pointer-events: none;
        }

        .clara-tutorial-orb-launcher > span {
          width: 100%;
          height: 100%;
          transform-origin: center;
          animation: claraTutorialOrbBreathe 4.2s ease-in-out infinite;
        }

        .clara-tutorial-orb-launcher:active > span {
          transform: scale(.965);
          animation: none;
        }

        .clara-tutorial-orb-launcher:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 216, 74, .8), 0 0 0 7px rgba(255, 216, 74, .12);
        }

        .clara-tutorial-orb-tap-copy {
          margin-top: -8px;
          color: #eef5ff;
          font-size: 12px;
          font-weight: 820;
        }

        .clara-tutorial-orb-tap-copy span {
          display: block;
          margin-top: 4px;
          color: #657a99;
          font-size: 8px;
          font-weight: 780;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .clara-tutorial-orb-intro-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 22px max(18px, env(safe-area-inset-bottom));
          background: linear-gradient(180deg, transparent, rgba(1, 3, 11, .86) 35%, #01030b 72%);
        }

        .clara-tutorial-orb-intro-back {
          width: 52px;
          min-height: 52px;
          flex: 0 0 52px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(112, 147, 197, .17);
          border-radius: 17px;
          background: linear-gradient(180deg, rgba(10, 22, 44, .76), rgba(5, 12, 27, .84));
          color: #7d8ea8;
          cursor: pointer;
        }

        .clara-tutorial-orb-intro-back svg { width: 16px; height: 16px; }

        .clara-tutorial-orb-intro-hint {
          min-height: 52px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 1px solid rgba(96, 165, 250, .12);
          border-radius: 17px;
          background: rgba(7, 18, 39, .5);
          color: #6880a3;
          font-size: 9px;
          font-weight: 820;
          letter-spacing: .04em;
          text-align: center;
        }

        @keyframes claraTutorialOrbBreathe {
          0%, 100% { transform: scale(.992); }
          50% { transform: scale(1.012); }
        }

        @media (max-height: 760px) {
          .clara-tutorial-orb-intro-main {
            align-items: flex-start;
            padding-top: 8px;
          }

          .clara-tutorial-orb-intro-composition {
            padding-bottom: 0;
          }

          .clara-tutorial-orb-launcher {
            width: min(62vw, 31dvh, 230px);
          }

          .clara-tutorial-orb-intro-copy h1 {
            margin-top: 6px;
            font-size: clamp(25px, 6.6vw, 31px);
          }

          .clara-tutorial-orb-intro-copy p {
            margin-top: 7px;
            line-height: 1.45;
          }

          .clara-tutorial-orb-intro-footer { padding-top: 12px; }
        }

        @media (max-height: 640px) {
          .clara-tutorial-orb-launcher {
            width: min(52vw, 25dvh, 175px);
          }

          .clara-tutorial-orb-intro-copy p {
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-tutorial-orb-launcher > span {
            animation: none !important;
          }
        }
      `}</style>

      <header className="clara-tutorial-orb-intro-header">
        <div className="clara-tutorial-orb-intro-header-row">
          <span className="clara-tutorial-orb-intro-wordmark" aria-label="CLARA">
            <span>CL</span><b>A</b><i>RA</i>
          </span>
          <button type="button" onClick={onSkip} className="clara-tutorial-orb-intro-skip">
            Skip tour <X />
          </button>
        </div>
        <div className="clara-tutorial-orb-intro-progress" aria-label="Tutorial progress 15%">
          <span />
        </div>
        <div className="clara-tutorial-orb-intro-counter">02 / 13</div>
      </header>

      <main className="clara-tutorial-orb-intro-main">
        <div className="clara-tutorial-orb-intro-composition">
          <section className="clara-tutorial-orb-intro-copy">
            <small>MEET CLARA</small>
            <h1>This is the CLARA ORB.</h1>
            <p>
              Juan taps CLARA before he spends. Tap the ORB and try his next decision in a safe, controlled version of the real app.
            </p>
          </section>

          <button
            type="button"
            className="clara-tutorial-orb-launcher"
            onClick={() => setStarted(true)}
            aria-label="Tap the CLARA ORB to start the guided Ask Before You Spend simulation"
            data-clara-tutorial-orb-launcher="true"
          >
            <ClaraOrbMark className="h-full w-full" title="CLARA Orb" />
          </button>

          <div className="clara-tutorial-orb-tap-copy">
            Tap CLARA to start
            <span>Try it yourself</span>
          </div>
        </div>
      </main>

      <footer className="clara-tutorial-orb-intro-footer">
        <button type="button" className="clara-tutorial-orb-intro-back" onClick={onBack} aria-label="Back to Juan">
          <ArrowLeft />
        </button>
        <div className="clara-tutorial-orb-intro-hint">Tap the ORB above to continue</div>
      </footer>
    </div>
  );
}
