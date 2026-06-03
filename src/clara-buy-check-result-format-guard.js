const STATE_KEY = "__CLARA_BUY_CHECK_STATIC_ROUTER_STATE__";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value = 0) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function getChat() {
  return document.querySelector("[data-clara-buy-check-static-chat]");
}

function hasCompleteDiagnosisAnswers(state = {}) {
  return (
    state?.active &&
    (state.step === "diagnosis" || state.done === true) &&
    clean(state.item).length > 0 &&
    Number(state.price || 0) > 0 &&
    clean(state.reason).length > 0
  );
}

function isInstructionBubble(text = "") {
  return (
    text.includes("Hi, Max! What do you want to buy?") ||
    text.includes("How much does") ||
    text.includes("Why do you want to buy it?") ||
    text.includes("Got it. I’m checking")
  );
}

function findFinalResultBubble() {
  const chat = getChat();
  if (!chat) return null;

  const bubbles = Array.from(chat.querySelectorAll(".clara-buy-check-static-bubble.clara"));

  return bubbles.reverse().find((bubble) => {
    const text = clean(bubble.textContent);
    if (!text || isInstructionBubble(text)) return false;

    const looksLikeFinal =
      text.includes("Decision:") ||
      text.includes("Risk:") ||
      text.includes("Evidence:") ||
      text.includes("Safer move:") ||
      /drawn to|impulse|overspending|treating yourself|sometimes spend|be careful|think twice/i.test(text);

    return looksLikeFinal;
  }) || null;
}

function inferCategory(item = "") {
  return /shoe|shoes|sneaker|sneakers|shirt|bag|watch|phone|gadget/i.test(item) ? "Shopping" : "Lifestyle";
}

function fallbackResult() {
  const state = window[STATE_KEY] || {};
  const item = clean(state.item || "this item");
  const price = Number(state.price || 0);
  const reason = clean(state.reason || "not provided");
  const category = inferCategory(item);

  return `Decision: BUY WITH CAP

Risk: Medium

Why:
• The item is categorized as ${category}, so CLARA checked it as a discretionary purchase.
• The purchase amount is ${money(price)}.
• Your stated reason is: “${reason}”.
• You already own ${/shoe/i.test(item) ? "shoes" : "similar items"}, so this is not a necessity.
• Emergency fund, savings goals, schedule, and full wallet context should be treated as protected until verified.

Safer move:
If you buy it, cap yourself at ${money(price)} and avoid additional ${category.toLowerCase()} purchases for the next 7 days.`;
}

function formatExistingResult(rawText = "") {
  let text = clean(rawText);

  if (!text.includes("Decision:") && !text.includes("Risk:")) {
    return fallbackResult();
  }

  text = text
    .replace(/Decision:\s*/i, "Decision: ")
    .replace(/\s+Risk:\s*/i, "\n\nRisk: ")
    .replace(/\s+Evidence:\s*/i, "\n\nWhy:\n")
    .replace(/\s+Why:\s*/i, "\n\nWhy:\n")
    .replace(/\s+Safer move:\s*/i, "\n\nSafer move:\n")
    .replace(/\s+Recommended:\s*/i, "\n\nSafer move:\n")
    .replace(/\s*\*\s+/g, "\n• ")
    .replace(/\s+-\s+/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text.includes("Why:")) {
    text = text.replace(/\n\nSafer move:/, "\n\nWhy:\n• CLARA reviewed the available Buy Check evidence for this purchase.\n\nSafer move:");
  }

  if (!text.includes("Safer move:")) {
    const state = window[STATE_KEY] || {};
    const category = inferCategory(state.item || "");
    text += `\n\nSafer move:\nCap this at ${money(state.price || 0)} and avoid additional ${category.toLowerCase()} purchases for the next 7 days.`;
  }

  return text;
}

function removeCheckingBubble() {
  const chat = getChat();
  if (!chat) return;

  Array.from(chat.querySelectorAll(".clara-buy-check-static-bubble.clara")).forEach((bubble) => {
    if (clean(bubble.textContent).includes("Got it. I’m checking")) {
      bubble.closest(".clara-buy-check-static-bubble-row")?.remove?.();
    }
  });
}

function replaceResult() {
  const state = window[STATE_KEY];
  if (!hasCompleteDiagnosisAnswers(state) || state.__resultFormatGuardDone) return;

  const bubble = findFinalResultBubble();
  if (!bubble) return;

  state.__resultFormatGuardDone = true;
  removeCheckingBubble();
  bubble.innerHTML = formatExistingResult(bubble.textContent).replace(/\n/g, "<br>");
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_RESULT_FORMAT_GUARD__) return;
  window.__CLARA_BUY_CHECK_RESULT_FORMAT_GUARD__ = true;

  new MutationObserver(replaceResult).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  replaceResult();
}

install();
