import { useEffect } from "react";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";

const NATURAL_INPUT_PROMPT = "Talk to CLARA naturally about the purchase";

export default function ClaraAiEnvironmentOverlay(props) {
  useEffect(() => {
    if (!props?.isActive || props?.layoutVariant === "guide-preview") return undefined;

    let applying = false;
    const applyNaturalConversationCopy = () => {
      if (applying) return;
      applying = true;
      try {
        const form = document.querySelector('[data-clara-buy-check-react-form="true"]');
        const input = form?.querySelector("input");
        if (input && !input.disabled) {
          if (input.getAttribute("placeholder") !== NATURAL_INPUT_PROMPT) {
            input.setAttribute("placeholder", NATURAL_INPUT_PROMPT);
          }
          if (input.getAttribute("aria-label") !== NATURAL_INPUT_PROMPT) {
            input.setAttribute("aria-label", NATURAL_INPUT_PROMPT);
          }
        }

        const board = document.querySelector('[data-clara-pause-entry-board="true"]');
        const question = board?.querySelector('[data-clara-buy-check-active-question="true"]');
        if (question) {
          const title = question.querySelector("strong");
          const details = question.querySelectorAll("span");

          if (title && title.textContent !== "Ask before you spend.") {
            title.textContent = "Ask before you spend.";
          }

          if (title) {
            title.style.fontSize = "21px";
            title.style.lineHeight = "1.2";
            title.style.fontWeight = "900";
            title.style.letterSpacing = "-0.035em";
            title.style.color = "rgba(255, 255, 255, 0.98)";
          }

          details.forEach((detail) => {
            detail.style.display = "none";
          });

          question.style.marginTop = "22px";
        }
      } finally {
        applying = false;
      }
    };

    applyNaturalConversationCopy();
    const observer = new MutationObserver(applyNaturalConversationCopy);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "disabled"],
    });

    return () => observer.disconnect();
  }, [props?.isActive, props?.layoutVariant]);

  return <ClaraAiEnvironmentOverlayV2 {...props} />;
}
