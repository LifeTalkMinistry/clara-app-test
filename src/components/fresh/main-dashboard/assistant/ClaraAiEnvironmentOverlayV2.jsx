import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ClaraAiEnvironmentOverlayCore from "./ClaraAiEnvironmentOverlayCore.jsx";

const READY_PROMPT = "Ready to chat now?";
const FIRST_GREETING = "Hi! What are you thinking about buying?";

export default function ClaraAiEnvironmentOverlayV2(props) {
  const { isActive = false, layoutVariant = "default" } = props || {};
  const guidePreview = layoutVariant === "guide-preview";
  const rootRef = useRef(null);
  const typingTimerRef = useRef(null);
  const [entryAnimationDone, setEntryAnimationDone] = useState(false);
  const [readyText, setReadyText] = useState("");
  const [chatReady, setChatReady] = useState(guidePreview);
  const [openingBoard, setOpeningBoard] = useState(null);
  const [messageViewport, setMessageViewport] = useState(null);
  const [conversationStarted, setConversationStarted] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setEntryAnimationDone(false);
      setReadyText("");
      setChatReady(guidePreview);
      setOpeningBoard(null);
      setMessageViewport(null);
      setConversationStarted(false);
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [guidePreview, isActive]);

  useEffect(() => {
    if (!isActive || guidePreview) return undefined;

    const scan = () => {
      const root = rootRef.current;
      if (!root) return;
      const board = root.querySelector('[data-clara-buy-check-opening-board="true"]');
      const viewport = root.querySelector('[data-clara-ai-message-viewport="true"]');
      const question = root.querySelector('[data-clara-buy-check-active-question="true"]');
      const stack = root.querySelector('[data-clara-ai-message-stack="true"]');

      setOpeningBoard((current) => current === board ? current : board);
      setMessageViewport((current) => current === viewport ? current : viewport);
      setConversationStarted(Boolean(stack));

      if (!chatReady && question?.className?.includes("opacity-100")) {
        setEntryAnimationDone(true);
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(rootRef.current, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [chatReady, guidePreview, isActive]);

  useEffect(() => {
    if (!entryAnimationDone || chatReady || guidePreview) return undefined;
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);

    let index = 0;
    setReadyText("");
    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setReadyText(READY_PROMPT.slice(0, index));
      if (index >= READY_PROMPT.length) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }, 48);

    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, [chatReady, entryAnimationDone, guidePreview]);

  useEffect(() => {
    if (!chatReady || guidePreview || conversationStarted) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      const input = root?.querySelector('[data-clara-buy-check-react-form="true"] input');
      if (!input) return;
      input.setAttribute("placeholder", "Type the item you want to buy");
      input.setAttribute("aria-label", "Type the item you want to buy");
      input.focus?.({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatReady, conversationStarted, guidePreview]);

  const startChat = () => {
    if (!entryAnimationDone) return;
    setChatReady(true);
    setReadyText(READY_PROMPT);
  };

  const gateVisible = Boolean(
    isActive &&
    !guidePreview &&
    !chatReady &&
    entryAnimationDone &&
    openingBoard,
  );
  const firstGreetingVisible = Boolean(
    isActive &&
    !guidePreview &&
    chatReady &&
    !conversationStarted &&
    messageViewport,
  );

  if (guidePreview) return <ClaraAiEnvironmentOverlayCore {...props} />;

  return (
    <div
      ref={rootRef}
      data-clara-buy-check-ready-gate={chatReady ? "chat" : "intro"}
      className="clara-buy-check-ready-gate"
    >
      <style>{`
        .clara-buy-check-ready-gate[data-clara-buy-check-ready-gate="intro"] [data-clara-buy-check-react-form="true"] {
          display: none !important;
        }
        .clara-buy-check-ready-gate [data-clara-buy-check-active-question="true"] {
          display: none !important;
        }
        .clara-buy-check-ready-gate[data-clara-buy-check-ready-gate="chat"] [data-clara-buy-check-opening-board="true"] {
          display: none !important;
        }
      `}</style>

      <ClaraAiEnvironmentOverlayCore {...props} />

      {gateVisible ? createPortal(
        <div
          data-clara-buy-check-ready-prompt="true"
          className="mx-auto mt-5 max-w-[318px] text-center"
          aria-live="polite"
        >
          <strong className="block min-h-[24px] text-[16px] font-black leading-[1.4] text-white/95">
            {readyText}
            {readyText.length < READY_PROMPT.length ? (
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-cyan-100/75" />
            ) : null}
          </strong>
          <button
            type="button"
            onClick={startChat}
            disabled={readyText.length < READY_PROMPT.length}
            className="mt-4 min-h-11 min-w-[150px] rounded-full border border-blue-300/28 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-6 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition active:scale-[0.98] disabled:opacity-0"
          >
            Ready
          </button>
        </div>,
        openingBoard,
      ) : null}

      {firstGreetingVisible ? createPortal(
        <div
          data-clara-buy-check-first-greeting="true"
          className="flex min-h-full min-w-0 flex-col justify-start gap-3 px-2 pt-1 pb-28"
        >
          <div className="flex min-w-0 w-full justify-start">
            <div className="w-[94%] max-w-[94%] rounded-[26px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
              {FIRST_GREETING}
            </div>
          </div>
        </div>,
        messageViewport,
      ) : null}
    </div>
  );
}
