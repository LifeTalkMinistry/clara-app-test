import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import ClaraAiEnvironmentOverlayCore from "./ClaraAiEnvironmentOverlayCore.jsx";

const READY_PROMPT = "Ready to chat now?";
const FIRST_GREETING = "Hi! What exact item are you thinking about buying? Type the exact name of the item.";
const GENERIC_MEANS_FAILURE = "I have the amount, but I can’t verify the Means impact right now.";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function currentMeansSnapshot() {
  if (typeof window === "undefined") return null;
  const snapshot = window.__claraCanonicalMeansSnapshot__;
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

function financialSetupIsMissing() {
  const snapshot = currentMeansSnapshot();
  if (!snapshot || !Object.keys(snapshot).length) return true;
  const anchor = Number(snapshot.cycle100Anchor ?? snapshot.requiredRunway ?? 0);
  const hasCycle = Boolean(snapshot.cycleStartDate || snapshot.cycleEndDate || snapshot.horizonDate);
  const hasScore = snapshot.score != null && Number.isFinite(Number(snapshot.score));
  return !(anchor > 0) || !hasCycle || !hasScore;
}

function classifyInteraction(text = "") {
  const source = clean(text);
  if (!source) return "text";

  if (source.includes(GENERIC_MEANS_FAILURE) && financialSetupIsMissing()) {
    return "setup";
  }

  if (
    /reply yes or no/i.test(source) ||
    /please reply yes or no/i.test(source) ||
    /is that the exact item\?/i.test(source) ||
    /would you (?:mind telling|like to tell) me why/i.test(source) ||
    /is that correct\?/i.test(source)
  ) {
    return "binary";
  }

  if (/how much will you actually pay/i.test(source)) return "numeric";
  return "text";
}

function placeholderForConversation(text = "", mode = "text", conversationStarted = false) {
  const source = clean(text);
  if (!conversationStarted) return "Type the exact item name";
  if (mode === "numeric") return "Enter amount";
  if (/why do you want or need/i.test(source)) return "Type your reason";
  if (/type the exact item again/i.test(source)) return "Type the exact item name";
  if (/payment structure/i.test(source)) return "Type the payment structure";
  return "Type your answer";
}

function setNativeInputValue(input, value) {
  if (!input) return false;
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  const setter = descriptor?.set;
  if (typeof setter === "function") setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

function isSilentBinaryUserRow(entry) {
  if (!(entry instanceof HTMLElement)) return false;
  const text = clean(entry.textContent);
  const isUserBubble = String(entry.className || "").includes("justify-end");
  return isUserBubble && /^(yes|no)$/i.test(text);
}

function isBuyCheckUiCard(entry) {
  return entry instanceof HTMLElement && entry.hasAttribute("data-clara-buy-check-ui-card");
}

function syncIntroComposerGate(root, introActive) {
  const form = root?.querySelector?.('[data-clara-buy-check-react-form="true"]');
  if (!(form instanceof HTMLElement)) return;

  if (introActive) {
    form.dataset.claraBuyCheckIntroSuppressed = "true";
    form.style.setProperty("display", "none", "important");
    form.setAttribute("aria-hidden", "true");
    form.setAttribute("inert", "");
    const input = form.querySelector("input");
    input?.blur?.();
    return;
  }

  if (form.dataset.claraBuyCheckIntroSuppressed === "true") {
    delete form.dataset.claraBuyCheckIntroSuppressed;
    form.style.removeProperty("display");
    form.removeAttribute("aria-hidden");
    form.removeAttribute("inert");
  }
}

export default function ClaraAiEnvironmentOverlayV2(props) {
  const { isActive = false, layoutVariant = "default" } = props || {};
  const guidePreview = layoutVariant === "guide-preview";
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const typingTimerRef = useRef(null);
  const interactionTimerRef = useRef(null);
  const [entryAnimationDone, setEntryAnimationDone] = useState(false);
  const [readyText, setReadyText] = useState("");
  const [chatReady, setChatReady] = useState(guidePreview);
  const [openingBoard, setOpeningBoard] = useState(null);
  const [messageViewport, setMessageViewport] = useState(null);
  const [messageStack, setMessageStack] = useState(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [observedAssistantText, setObservedAssistantText] = useState("");
  const [settledAssistantText, setSettledAssistantText] = useState("");
  const [interactionMode, setInteractionMode] = useState("text");
  const [binarySubmitting, setBinarySubmitting] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setEntryAnimationDone(false);
      setReadyText("");
      setChatReady(guidePreview);
      setOpeningBoard(null);
      setMessageViewport(null);
      setMessageStack(null);
      setConversationStarted(false);
      setObservedAssistantText("");
      setSettledAssistantText("");
      setInteractionMode("text");
      setBinarySubmitting(false);
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
      typingTimerRef.current = null;
      interactionTimerRef.current = null;
    }
  }, [guidePreview, isActive]);

  useLayoutEffect(() => {
    if (!isActive || guidePreview) return undefined;
    syncIntroComposerGate(rootRef.current, !chatReady);
    return undefined;
  }, [chatReady, guidePreview, isActive]);

  useEffect(() => {
    if (!isActive || guidePreview) return undefined;

    const scan = () => {
      const root = rootRef.current;
      if (!root) return;
      syncIntroComposerGate(root, !chatReady);
      const board = root.querySelector('[data-clara-buy-check-opening-board="true"]');
      const viewport = root.querySelector('[data-clara-ai-message-viewport="true"]');
      const question = root.querySelector('[data-clara-buy-check-active-question="true"]');
      const stack = root.querySelector('[data-clara-ai-message-stack="true"]');
      const stackChildren = stack ? Array.from(stack.children) : [];

      stackChildren.forEach((entry) => {
        if (!(entry instanceof HTMLElement) || isBuyCheckUiCard(entry)) return;
        if (isSilentBinaryUserRow(entry)) {
          entry.setAttribute("data-clara-buy-check-silent-binary-choice", "true");
        } else {
          entry.removeAttribute("data-clara-buy-check-silent-binary-choice");
        }
      });

      const lastMessageRow = [...stackChildren].reverse().find((entry) => {
        if (!(entry instanceof HTMLElement)) return false;
        if (isBuyCheckUiCard(entry)) return false;
        if (entry.hasAttribute("data-clara-buy-check-result-focus")) return false;
        if (isSilentBinaryUserRow(entry)) return false;
        return Boolean(clean(entry.textContent));
      });

      setOpeningBoard((current) => current === board ? current : board);
      setMessageViewport((current) => current === viewport ? current : viewport);
      setMessageStack((current) => current === stack ? current : stack);
      setConversationStarted(Boolean(stack));
      setObservedAssistantText(clean(lastMessageRow?.textContent || ""));

      if (!chatReady && question?.className?.includes("opacity-100")) {
        setEntryAnimationDone(true);
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(rootRef.current, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [chatReady, guidePreview, isActive]);

  useEffect(() => {
    if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = window.setTimeout(() => {
      const nextMode = classifyInteraction(observedAssistantText);
      setSettledAssistantText(observedAssistantText);
      setInteractionMode(nextMode);
      setBinarySubmitting(false);
      interactionTimerRef.current = null;
    }, observedAssistantText ? 320 : 0);

    return () => {
      if (interactionTimerRef.current) window.clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    };
  }, [observedAssistantText]);

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
    if (!chatReady || guidePreview) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      const input = root?.querySelector('[data-clara-buy-check-react-form="true"] input');
      if (!input) return;

      const placeholder = placeholderForConversation(
        settledAssistantText,
        interactionMode,
        conversationStarted,
      );
      input.setAttribute("placeholder", placeholder);
      input.setAttribute("aria-label", placeholder);

      if (interactionMode === "numeric") {
        input.setAttribute("inputmode", "decimal");
        input.setAttribute("pattern", "[0-9.,]*");
      } else {
        input.setAttribute("inputmode", "text");
        input.removeAttribute("pattern");
      }

      if (interactionMode === "binary" || interactionMode === "setup") {
        input.blur?.();
      } else if (!conversationStarted || interactionMode === "numeric") {
        input.focus?.({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatReady, conversationStarted, guidePreview, interactionMode, settledAssistantText]);

  useEffect(() => {
    if (!chatReady || guidePreview || interactionMode !== "numeric") return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const blockLetters = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.closest('[data-clara-buy-check-react-form="true"]')) return;
      if (event.type === "beforeinput") {
        const data = String(event.data || "");
        if (data && !/^[0-9.,]+$/.test(data)) event.preventDefault();
      }
      if (event.type === "paste") {
        const pasted = String(event.clipboardData?.getData("text") || "");
        if (pasted && !/^[0-9.,\s₱]+$/.test(pasted)) event.preventDefault();
      }
    };

    root.addEventListener("beforeinput", blockLetters, true);
    root.addEventListener("paste", blockLetters, true);
    return () => {
      root.removeEventListener("beforeinput", blockLetters, true);
      root.removeEventListener("paste", blockLetters, true);
    };
  }, [chatReady, guidePreview, interactionMode]);

  useEffect(() => {
    if (interactionMode !== "setup") return undefined;
    const root = rootRef.current;
    const stack = root?.querySelector('[data-clara-ai-message-stack="true"]');
    if (!stack) return undefined;
    const row = [...stack.children].reverse().find((entry) =>
      entry instanceof HTMLElement &&
      !isBuyCheckUiCard(entry) &&
      clean(entry.textContent).includes(GENERIC_MEANS_FAILURE)
    );
    row?.setAttribute("data-clara-buy-check-setup-replaced", "true");
    return () => row?.removeAttribute("data-clara-buy-check-setup-replaced");
  }, [interactionMode, settledAssistantText]);

  const startChat = () => {
    if (!entryAnimationDone) return;
    setChatReady(true);
    setReadyText(READY_PROMPT);
  };

  const submitChoice = (answer) => {
    if (interactionMode !== "binary" || binarySubmitting) return;
    const root = rootRef.current;
    const form = root?.querySelector('[data-clara-buy-check-react-form="true"]');
    const input = form?.querySelector("input");
    if (!form || !input) return;
    setBinarySubmitting(true);
    setNativeInputValue(input, answer);
    window.requestAnimationFrame(() => form.requestSubmit?.());
  };

  const openIncomeHub = () => {
    props?.onClose?.();
    navigate("/community?view=home");

    let attempts = 0;
    const locateAndOpen = () => {
      const slide = document.querySelector('[data-card-key="investmentFund"]');
      if (slide instanceof HTMLElement) {
        slide.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "center" });
        if (slide.getAttribute("data-expanded") !== "true") {
          const toggle = slide.querySelector('[data-clara-finance-expand-toggle="true"]');
          if (toggle instanceof HTMLElement) toggle.click();
        }
        return;
      }

      attempts += 1;
      if (attempts < 16) window.setTimeout(locateAndOpen, 150);
    };

    window.setTimeout(locateAndOpen, 120);
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
  const binaryControlsVisible = Boolean(
    isActive && !guidePreview && chatReady && conversationStarted && interactionMode === "binary" && !binarySubmitting && messageViewport,
  );
  const setupPromptVisible = Boolean(
    isActive && !guidePreview && chatReady && conversationStarted && interactionMode === "setup" && messageViewport && messageStack,
  );

  useLayoutEffect(() => {
    if (!setupPromptVisible || !(messageViewport instanceof HTMLElement)) return undefined;

    const frame = window.requestAnimationFrame(() => {
      messageViewport.scrollTo?.({
        top: messageViewport.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messageViewport, setupPromptVisible]);

  if (guidePreview) return <ClaraAiEnvironmentOverlayCore {...props} />;

  return (
    <div
      ref={rootRef}
      data-clara-buy-check-ready-gate={chatReady ? "chat" : "intro"}
      data-clara-buy-check-interaction-mode={interactionMode}
      data-clara-buy-check-runtime="v2-hard-intro-gate"
      className="clara-buy-check-ready-gate"
    >
      <style>{`
        .clara-buy-check-ready-gate[data-clara-buy-check-ready-gate="intro"] [data-clara-buy-check-react-form="true"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .clara-buy-check-ready-gate [data-clara-buy-check-active-question="true"] {
          display: none !important;
        }
        .clara-buy-check-ready-gate[data-clara-buy-check-ready-gate="chat"] [data-clara-buy-check-opening-board="true"] {
          display: none !important;
        }
        .clara-buy-check-ready-gate[data-clara-buy-check-interaction-mode="binary"] [data-clara-buy-check-react-form="true"],
        .clara-buy-check-ready-gate[data-clara-buy-check-interaction-mode="setup"] [data-clara-buy-check-react-form="true"] {
          display: none !important;
        }
        .clara-buy-check-ready-gate [data-clara-buy-check-setup-replaced="true"],
        .clara-buy-check-ready-gate [data-clara-buy-check-silent-binary-choice="true"] {
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

      {binaryControlsVisible ? createPortal(
        <div
          data-clara-buy-check-binary-controls="true"
          className="sticky bottom-2 z-50 mx-2 mt-4 grid grid-cols-2 gap-3 rounded-[24px] border border-blue-200/14 bg-[#040b1a]/96 p-3 shadow-[0_16px_44px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
          aria-label="Choose Yes or No"
        >
          <button
            type="button"
            onClick={() => submitChoice("Yes")}
            disabled={binarySubmitting}
            className="min-h-12 rounded-full border border-blue-300/28 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-5 text-[13px] font-black text-white shadow-[0_10px_26px_rgba(23,105,255,0.24)] active:scale-[0.98] disabled:opacity-55"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => submitChoice("No")}
            disabled={binarySubmitting}
            className="min-h-12 rounded-full border border-white/14 bg-white/[0.055] px-5 text-[13px] font-black text-white/92 active:scale-[0.98] disabled:opacity-55"
          >
            No
          </button>
        </div>,
        messageViewport,
      ) : null}

      {setupPromptVisible ? createPortal(
        <div
          data-clara-buy-check-ui-card="financial-setup"
          data-clara-buy-check-financial-setup-prompt="true"
          className="mx-2 mt-3 rounded-[26px] border border-blue-200/18 border-l-2 border-l-[#ffd84a]/55 bg-[#07152d]/96 px-5 py-5 text-left shadow-[0_18px_48px_rgba(0,0,0,0.40)] backdrop-blur-2xl"
          aria-live="polite"
        >
          <p className="text-[14px] font-bold leading-6 text-white/92">
            Before I can calculate how this purchase affects your Means Score, we need to set up your financial picture first.
          </p>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-blue-100/70">
            Let’s start with Income Hub. Add your income source first, then continue your financial setup from there.
          </p>
          <button
            type="button"
            onClick={openIncomeHub}
            className="mt-4 min-h-12 w-full rounded-full border border-blue-300/28 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-5 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] active:scale-[0.99]"
          >
            Start financial setup
          </button>
        </div>,
        messageStack,
      ) : null}
    </div>
  );
}
