import ClaraAiEnvironmentOverlayV2 from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2";

const JUAN_INITIAL_MESSAGES = [
  {
    id: "tutorial-juan-buy-shoes",
    role: "user",
    text: "CLARA, I want to buy shoes for ₱1,800. Kaya ba?",
  },
  {
    id: "tutorial-clara-buy-shoes-response",
    role: "assistant",
    text:
      "You can pay for it, Juan, but I’d wait if the shoes are not urgent. You currently have ₱4,600, but ₱2,200 still needs to cover food and transport until your next payday on August 30.\n\nYou’re also supporting your family and still building your emergency fund. Waiting keeps your essentials and safety buffer stronger.",
  },
];

const JUAN_PAYOFF_MESSAGES = [
  {
    id: "tutorial-juan-wallet-question",
    role: "user",
    text:
      "So even if I technically have ₱4,600, that doesn’t mean all ₱4,600 is safe to spend?",
  },
  {
    id: "tutorial-clara-wallet-answer",
    role: "assistant",
    text:
      "Exactly. Your Wallet tells me what exists. Your Budget, obligations, emergency fund, goals, income timing, and Money Profile tell me what that money still needs to protect.",
  },
];

function tutorialState(phase) {
  return {
    sessionId: `clara-tutorial-juan-${phase}`,
    step: "conversation",
    busy: true,
    item: "Running shoes",
    finalDecision: null,
    walletOptions: [],
  };
}

export default function ClaraTutorialOrbDemo({
  phase = "initial",
  onBack,
  onContinue,
  onSkip,
}) {
  const payoff = phase === "payoff";
  const messages = payoff ? JUAN_PAYOFF_MESSAGES : JUAN_INITIAL_MESSAGES;

  return (
    <div className="clara-tutorial-production-orb-demo">
      <style>{`
        .clara-tutorial-production-orb-demo {
          position: fixed;
          inset: 0;
          z-index: 1300;
          background: #020714;
        }

        .clara-tutorial-production-orb-demo [data-clara-ai-layout-variant="guide-preview"] {
          z-index: 1 !important;
          padding-bottom: 104px !important;
        }

        .clara-tutorial-production-orb-demo [data-clara-ai-layout-variant="guide-preview"] [data-clara-buy-check-react-form="true"] {
          display: none !important;
        }

        .clara-tutorial-production-orb-demo [data-clara-ai-layout-variant="guide-preview"] [data-clara-ai-message-stack="true"] {
          padding-bottom: 28px !important;
        }

        /* Controlled preview uses the real production message component. Restore
           production bubble dimensions so the tutorial looks exactly like live ORB chat. */
        .clara-tutorial-production-orb-demo [data-clara-ai-layout-variant="guide-preview"] [data-clara-ai-message-stack="true"] > .justify-end > div {
          width: auto !important;
          max-width: 86% !important;
          border-radius: 24px !important;
          padding: 12px 16px !important;
        }

        .clara-tutorial-production-orb-demo [data-clara-ai-layout-variant="guide-preview"] [data-clara-ai-message-stack="true"] > .justify-start > div {
          width: 94% !important;
          max-width: 94% !important;
          border-radius: 26px !important;
          padding: 16px !important;
          line-height: 1.5rem !important;
        }

        .clara-tutorial-orb-controls {
          position: fixed;
          z-index: 4;
          left: 50%;
          bottom: max(env(safe-area-inset-bottom), 12px);
          width: min(calc(100% - 20px), 410px);
          transform: translateX(-50%);
          padding: 11px;
          border: 1px solid rgba(96, 165, 250, 0.18);
          border-radius: 24px;
          background: rgba(4, 11, 26, 0.97);
          box-shadow: 0 -18px 52px rgba(0, 0, 0, 0.46), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(18px);
        }

        .clara-tutorial-orb-controls-main {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 9px;
        }

        .clara-tutorial-orb-back,
        .clara-tutorial-orb-next {
          min-height: 48px;
          border-radius: 17px;
          border: 1px solid rgba(96, 165, 250, 0.18);
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .clara-tutorial-orb-back {
          background: #07152d;
          color: rgba(255, 255, 255, 0.72);
        }

        .clara-tutorial-orb-next {
          padding: 0 16px;
          background: linear-gradient(135deg, #1769ff, #0d4fc6);
          color: #fff;
          box-shadow: 0 12px 30px rgba(23, 105, 255, 0.24);
        }

        .clara-tutorial-orb-skip {
          display: block;
          margin: 8px auto 0;
          border: 0;
          background: transparent;
          color: rgba(191, 210, 239, 0.52);
          font: inherit;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }
      `}</style>

      <ClaraAiEnvironmentOverlayV2
        isActive
        messages={messages}
        claraAssistantContext={{}}
        buyCheckState={tutorialState(phase)}
        onSubmitBuyCheckAnswer={() => {}}
        onConfirmBuyCheck={() => {}}
        onDeclineBuyCheck={() => {}}
        onAskMoreBuyCheck={() => {}}
        onCheckAnother={() => {}}
        onClose={onBack}
        layoutVariant="guide-preview"
      />

      <div className="clara-tutorial-orb-controls" aria-label="CLARA tutorial controls">
        <div className="clara-tutorial-orb-controls-main">
          <button type="button" className="clara-tutorial-orb-back" onClick={onBack} aria-label="Back">
            ‹
          </button>
          <button type="button" className="clara-tutorial-orb-next" onClick={onContinue}>
            {payoff ? "Continue the tour" : "Show me where CLARA knew that"}
          </button>
        </div>
        <button type="button" className="clara-tutorial-orb-skip" onClick={onSkip}>
          Skip tutorial
        </button>
      </div>
    </div>
  );
}
