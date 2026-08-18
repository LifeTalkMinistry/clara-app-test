import { useEffect, useMemo, useRef, useState } from "react";
import ClaraAiEnvironmentOverlayV2 from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2";

const JUAN_PURCHASE_QUESTION = "CLARA, I want to buy shoes for ₱1,800. Kaya ba?";
const JUAN_PURCHASE_REPLY =
  "You can pay for it, Juan, but I’d wait if the shoes are not urgent. You currently have ₱4,600, but ₱2,200 still needs to cover food and transport until your next payday on August 30.\n\nYou’re also supporting your family and still building your emergency fund. Waiting keeps your essentials and safety buffer stronger.";

const JUAN_INITIAL_USER_MESSAGE = {
  id: "tutorial-juan-buy-shoes",
  role: "user",
  text: JUAN_PURCHASE_QUESTION,
};

const JUAN_INITIAL_ASSISTANT_MESSAGE = {
  id: "tutorial-clara-buy-shoes-response",
  role: "assistant",
  text: JUAN_PURCHASE_REPLY,
};

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

function tutorialState(phase, busy) {
  return {
    sessionId: `clara-tutorial-juan-${phase}`,
    step: "conversation",
    busy,
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
  const interactive = !payoff;
  const [stage, setStage] = useState(interactive ? "ready" : "answered");
  const replyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    };
  }, []);

  const messages = useMemo(() => {
    if (payoff) return JUAN_PAYOFF_MESSAGES;
    if (stage === "ready") return [];
    if (stage === "thinking") {
      return [
        JUAN_INITIAL_USER_MESSAGE,
        {
          id: "tutorial-clara-buy-shoes-thinking",
          role: "assistant",
          text: "",
        },
      ];
    }
    return [JUAN_INITIAL_USER_MESSAGE, JUAN_INITIAL_ASSISTANT_MESSAGE];
  }, [payoff, stage]);

  const handlePreparedSend = (answer) => {
    if (!interactive || stage !== "ready") return;
    if (String(answer || "").trim() !== JUAN_PURCHASE_QUESTION) return;

    setStage("thinking");
    replyTimerRef.current = window.setTimeout(() => {
      setStage("answered");
      replyTimerRef.current = null;
    }, 1250);
  };

  const thinking = interactive && stage === "thinking";
  const showInstruction = interactive && stage === "ready";
  const showContinue = payoff || stage === "answered";

  return (
    <div
      className="clara-tutorial-production-orb-demo"
      data-clara-tutorial-buy-check-stage={payoff ? "payoff" : stage}
    >
      <style>{`
        .clara-tutorial-production-orb-demo {
          position: fixed;
          inset: 0;
          z-index: 1300;
          background: #020714;
        }

        .clara-tutorial-production-orb-demo [data-clara-ai-layout-variant="guide-preview"] {
          z-index: 1;
        }

        .clara-tutorial-chat-guide {
          position: fixed;
          z-index: 6;
          left: 50%;
          bottom: calc(max(env(safe-area-inset-bottom), 14px) + 86px);
          width: min(calc(100% - 28px), 374px);
          transform: translateX(-50%);
          border: 1px solid rgba(96, 165, 250, 0.24);
          border-radius: 18px;
          padding: 12px 14px;
          background: rgba(4, 11, 26, 0.94);
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(18px);
          pointer-events: none;
        }

        .clara-tutorial-chat-guide small {
          display: block;
          color: rgba(255, 216, 74, 0.82);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .clara-tutorial-chat-guide strong {
          display: block;
          margin-top: 5px;
          color: #f8fbff;
          font-size: 14px;
          font-weight: 900;
          line-height: 1.35;
        }

        .clara-tutorial-chat-guide p {
          margin: 5px 0 0;
          color: rgba(210, 224, 246, 0.74);
          font-size: 11px;
          font-weight: 650;
          line-height: 1.5;
        }

        .clara-tutorial-chat-guide span {
          display: block;
          margin-top: 7px;
          color: rgba(125, 174, 255, 0.96);
          font-size: 10px;
          font-weight: 900;
        }

        .clara-tutorial-chat-continue {
          position: fixed;
          z-index: 6;
          left: 50%;
          bottom: calc(max(env(safe-area-inset-bottom), 14px) + 88px);
          width: min(calc(100% - 32px), 360px);
          min-height: 46px;
          transform: translateX(-50%);
          border: 1px solid rgba(96, 165, 250, 0.28);
          border-radius: 999px;
          padding: 0 18px;
          background: linear-gradient(135deg, rgba(23, 105, 255, 0.96), rgba(13, 79, 198, 0.98));
          color: #fff;
          box-shadow: 0 14px 34px rgba(23, 105, 255, 0.28);
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .clara-tutorial-chat-skip {
          position: fixed;
          z-index: 7;
          right: 18px;
          top: calc(max(env(safe-area-inset-top), 10px) + 88px);
          border: 0;
          padding: 6px 8px;
          background: transparent;
          color: rgba(191, 210, 239, 0.44);
          font: inherit;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
        }

        @media (max-height: 640px) {
          .clara-tutorial-chat-guide {
            bottom: calc(max(env(safe-area-inset-bottom), 10px) + 80px);
            padding: 10px 12px;
          }

          .clara-tutorial-chat-guide p {
            line-height: 1.35;
          }

          .clara-tutorial-chat-continue {
            bottom: calc(max(env(safe-area-inset-bottom), 10px) + 82px);
          }
        }
      `}</style>

      <ClaraAiEnvironmentOverlayV2
        isActive
        messages={messages}
        claraAssistantContext={{}}
        buyCheckState={tutorialState(phase, payoff || thinking)}
        onSubmitBuyCheckAnswer={handlePreparedSend}
        onConfirmBuyCheck={() => {}}
        onDeclineBuyCheck={() => {}}
        onAskMoreBuyCheck={() => {}}
        onCheckAnother={() => {}}
        onClose={onBack}
        layoutVariant="guide-preview"
        composerPresetDraft={showInstruction ? JUAN_PURCHASE_QUESTION : ""}
        composerPresetLocked={showInstruction}
      />

      {showInstruction ? (
        <aside className="clara-tutorial-chat-guide" data-clara-tutorial-chat-instruction="true">
          <small>ASK BEFORE YOU SPEND</small>
          <strong>This is Juan&apos;s real CLARA chat.</strong>
          <p>His question is already prepared below. Tap the blue Send arrow to ask CLARA before Juan spends.</p>
          <span>Tap Send ↓</span>
        </aside>
      ) : null}

      {showContinue ? (
        <button type="button" className="clara-tutorial-chat-continue" onClick={onContinue}>
          {payoff ? "Continue the tour" : "Show me where CLARA knew that"}
        </button>
      ) : null}

      <button type="button" className="clara-tutorial-chat-skip" onClick={onSkip}>
        Skip tour
      </button>
    </div>
  );
}
