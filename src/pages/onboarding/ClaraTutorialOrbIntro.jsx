import { ClaraOrbMark } from "@/components/community/ClaraOrbPage";

export default function ClaraTutorialOrbIntro({ onActivate }) {
  return (
    <div className="clara-tour-story-step clara-tour-orb-intro">
      <style>{`
        .clara-tour-orb-intro {
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 0 clamp(28px, 5dvh, 52px);
          text-align: center;
        }

        .clara-tour-orb-intro-copy {
          width: min(100%, 430px);
        }

        .clara-tour-orb-intro-copy small {
          color: #6f9ff0;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .2em;
        }

        .clara-tour-orb-intro-copy h1 {
          margin: 9px 0 0;
          color: #fff;
          font-size: clamp(28px, 7vw, 36px);
          font-weight: 950;
          line-height: 1.03;
          letter-spacing: -.045em;
        }

        .clara-tour-orb-intro-copy p {
          max-width: 390px;
          margin: 9px auto 0;
          color: #91a4bf;
          font-size: 11px;
          font-weight: 580;
          line-height: 1.55;
        }

        .clara-tour-orb-launcher {
          position: relative;
          display: grid;
          width: min(72vw, 37dvh, 300px);
          aspect-ratio: 1;
          margin: 2px auto 0;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          outline: 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .clara-tour-orb-launcher::before {
          content: "";
          position: absolute;
          inset: 13%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 107, 255, .16), rgba(37, 107, 255, 0) 68%);
          filter: blur(18px);
          pointer-events: none;
        }

        .clara-tour-orb-launcher > span {
          width: 100%;
          height: 100%;
          transform-origin: center;
          animation: claraTutorialOrbBreathe 4.2s ease-in-out infinite;
        }

        .clara-tour-orb-launcher:active > span {
          transform: scale(.965);
          animation: none;
        }

        .clara-tour-orb-launcher:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 216, 74, .8), 0 0 0 7px rgba(255, 216, 74, .12);
        }

        .clara-tour-orb-tap-copy {
          margin-top: -7px;
          color: #eef5ff;
          font-size: 12px;
          font-weight: 820;
        }

        .clara-tour-orb-tap-copy span {
          display: block;
          margin-top: 4px;
          color: #657a99;
          font-size: 8px;
          font-weight: 780;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .clara-core-tour-orb-instruction {
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
          .clara-tour-orb-intro {
            justify-content: flex-start;
            gap: 6px;
            padding-bottom: 6px;
          }

          .clara-tour-orb-launcher {
            width: min(60vw, 32dvh, 230px);
          }

          .clara-tour-orb-intro-copy h1 {
            margin-top: 6px;
            font-size: clamp(25px, 6.6vw, 31px);
          }

          .clara-tour-orb-intro-copy p {
            margin-top: 7px;
            line-height: 1.45;
          }
        }

        @media (max-height: 640px) {
          .clara-tour-orb-launcher {
            width: min(52vw, 26dvh, 180px);
          }

          .clara-tour-orb-intro-copy p {
            font-size: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-tour-orb-launcher > span {
            animation: none !important;
          }
        }
      `}</style>

      <section className="clara-tour-orb-intro-copy">
        <small>MEET CLARA</small>
        <h1>This is the CLARA ORB.</h1>
        <p>
          Juan taps CLARA before he spends. From here, you&apos;ll try the same flow in a safe guided simulation.
        </p>
      </section>

      <button
        type="button"
        className="clara-tour-orb-launcher"
        onClick={onActivate}
        aria-label="Tap the CLARA ORB to start the guided Ask Before You Spend simulation"
        data-clara-tutorial-orb-launcher="true"
      >
        <ClaraOrbMark className="h-full w-full" title="CLARA Orb" />
      </button>

      <div className="clara-tour-orb-tap-copy">
        Tap CLARA to start
        <span>Try it yourself</span>
      </div>
    </div>
  );
}
