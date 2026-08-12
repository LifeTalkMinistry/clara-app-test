import { useEffect, useRef } from "react";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";

const SPEECH_DELAY_MS = 90;

function cleanSpeechText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/ASK BEFORE YOU SPEND/gi, "Ask Before You Spend")
    .trim();
}

function pickClaraVoice(synthesis) {
  const voices = synthesis?.getVoices?.() || [];
  return (
    voices.find((voice) => /^en-PH$/i.test(voice.lang)) ||
    voices.find((voice) => /^en-(US|GB|AU|CA)$/i.test(voice.lang)) ||
    voices.find((voice) => /^en/i.test(voice.lang)) ||
    null
  );
}

function getDecisionSpeech(overlay) {
  const finalPanel = overlay?.querySelector?.("[data-clara-buy-check-final-decision-panel]");
  if (finalPanel) {
    const title = cleanSpeechText(finalPanel.querySelector("h3")?.textContent);
    const body = cleanSpeechText(finalPanel.querySelector("p:not([class*='uppercase'])")?.textContent);
    return cleanSpeechText([title, body].filter(Boolean).join(". "));
  }

  const decisionCard = overlay?.querySelector?.('[data-clara-buy-check-decision-card="true"]');
  if (decisionCard) {
    const verdict = cleanSpeechText(
      decisionCard.querySelector('[data-clara-buy-check-summary-verdict="true"]')?.textContent,
    );
    const paragraphs = Array.from(decisionCard.querySelectorAll("p"))
      .map((node) => cleanSpeechText(node.textContent))
      .filter(Boolean)
      .filter((text) => !/^Ask Before You Spend$/i.test(text));
    const explanation = paragraphs.find(
      (text) => !/^(Purchase impact|Why this result\?|Decision saved)$/i.test(text),
    );
    return cleanSpeechText([verdict, explanation].filter(Boolean).join(". "));
  }

  return "";
}

function getLatestClaraMessageSpeech(overlay) {
  const stack = overlay?.querySelector?.('[data-clara-ai-message-stack="true"]');
  if (!stack) return "";

  const children = Array.from(stack.children || []);
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const row = children[index];
    if (!row?.classList?.contains("justify-start")) continue;
    const text = cleanSpeechText(row.textContent);
    if (text) return text;
  }
  return "";
}

function getCurrentClaraSpeech(overlay) {
  const decisionSpeech = getDecisionSpeech(overlay);
  if (decisionSpeech) return decisionSpeech;

  const messageSpeech = getLatestClaraMessageSpeech(overlay);
  if (messageSpeech) return messageSpeech;

  if (overlay?.querySelector?.('[data-clara-pause-entry-board="true"]')) {
    return "Ask Before You Spend. What do you want to buy?";
  }

  return "";
}

function useClaraBuyCheckSpeech({ isActive, layoutVariant }) {
  const lastSpokenRef = useRef("");

  useEffect(() => {
    if (!isActive || layoutVariant === "guide-preview") return undefined;
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const synthesis = window.speechSynthesis;
    const SpeechUtterance = window.SpeechSynthesisUtterance;
    if (!synthesis || typeof SpeechUtterance !== "function") return undefined;

    let observer = null;
    let timerId = 0;
    let disposed = false;

    const speakLatest = () => {
      if (disposed) return;

      const overlay = document.querySelector(
        '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]',
      );
      if (!overlay) return;

      const text = getCurrentClaraSpeech(overlay);
      if (!text || text === lastSpokenRef.current) return;

      lastSpokenRef.current = text;
      synthesis.cancel();

      const utterance = new SpeechUtterance(text);
      utterance.lang = "en-PH";
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = pickClaraVoice(synthesis);
      if (voice) utterance.voice = voice;

      synthesis.speak(utterance);
    };

    const scheduleSpeech = () => {
      if (timerId) window.clearTimeout(timerId);
      timerId = window.setTimeout(speakLatest, SPEECH_DELAY_MS);
    };

    scheduleSpeech();

    observer = new MutationObserver(scheduleSpeech);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      disposed = true;
      if (timerId) window.clearTimeout(timerId);
      observer?.disconnect?.();
      synthesis.cancel();
      lastSpokenRef.current = "";
    };
  }, [isActive, layoutVariant]);
}

export default function ClaraAiEnvironmentOverlay(props) {
  useClaraBuyCheckSpeech({
    isActive: Boolean(props?.isActive),
    layoutVariant: props?.layoutVariant || "default",
  });

  return <ClaraAiEnvironmentOverlayV2 {...props} />;
}
