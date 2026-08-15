import { useEffect } from "react";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";
import ClaraBuyCheckImpactPortal from "./ClaraBuyCheckImpactPortal.jsx";

const NATURAL_INPUT_PROMPT = "Talk to CLARA naturally about the purchase";
const DEFAULT_DAILY_AI_LIMIT = 12;
const DAILY_AI_LIMIT_BY_TIER = Object.freeze({
  free: 12,
  supporter: 30,
  builder: 75,
  champion: 150,
});

function normalizePlanKey(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveDailyUsageLimit(props = {}) {
  const explicitLimit = Number(props?.dailyUsageLimit);
  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    return Math.floor(explicitLimit);
  }

  const plan = props?.claraAssistantContext?.plan;
  const planCandidates = [
    plan?.supportTier,
    plan?.support_tier,
    plan?.tier,
    plan?.key,
    plan?.name,
    plan?.plan,
    typeof plan === "string" ? plan : "",
  ];

  for (const candidate of planCandidates) {
    const key = normalizePlanKey(candidate);
    if (!key) continue;

    for (const [tier, limit] of Object.entries(DAILY_AI_LIMIT_BY_TIER)) {
      if (key === tier || key.includes(tier)) return limit;
    }
  }

  return DEFAULT_DAILY_AI_LIMIT;
}

export default function ClaraAiEnvironmentOverlay(props) {
  const dailyUsageLimit = resolveDailyUsageLimit(props);

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

          let usageBadge = question.querySelector('[data-clara-daily-usage-badge="true"]');
          if (!usageBadge) {
            usageBadge = document.createElement("div");
            usageBadge.setAttribute("data-clara-daily-usage-badge", "true");
            question.insertBefore(usageBadge, title || question.firstChild);
          }

          usageBadge.textContent = `${dailyUsageLimit}/DAY`;
          usageBadge.setAttribute(
            "aria-label",
            `CLARA daily AI usage limit: ${dailyUsageLimit} replies per day`,
          );
          usageBadge.style.position = "absolute";
          usageBadge.style.left = "0";
          usageBadge.style.top = "50%";
          usageBadge.style.transform = "translateY(-50%)";
          usageBadge.style.display = "inline-flex";
          usageBadge.style.alignItems = "center";
          usageBadge.style.justifyContent = "center";
          usageBadge.style.minWidth = "52px";
          usageBadge.style.height = "24px";
          usageBadge.style.padding = "0 8px";
          usageBadge.style.borderRadius = "999px";
          usageBadge.style.border = "1px solid rgba(147, 197, 253, 0.24)";
          usageBadge.style.background = "rgba(7, 21, 45, 0.78)";
          usageBadge.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.05)";
          usageBadge.style.color = "rgba(191, 219, 254, 0.88)";
          usageBadge.style.fontSize = "9px";
          usageBadge.style.fontWeight = "900";
          usageBadge.style.letterSpacing = "0.08em";
          usageBadge.style.lineHeight = "1";
          usageBadge.style.whiteSpace = "nowrap";
          usageBadge.style.pointerEvents = "none";

          question.style.position = "relative";
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
  }, [
    props?.isActive,
    props?.layoutVariant,
    props?.dailyUsageLimit,
    props?.claraAssistantContext?.plan,
    dailyUsageLimit,
  ]);

  return (
    <>
      <ClaraAiEnvironmentOverlayV2 {...props} />
      <ClaraBuyCheckImpactPortal
        isActive={Boolean(props?.isActive)}
        disabled={props?.layoutVariant === "guide-preview"}
      />
    </>
  );
}
