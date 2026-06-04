function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const PRICE_QUESTION_COPY = "I see, how much does it cost?<br><br>Type the amount only if you can. Example: ₱3,500";

function isRawPriceQuestion(text = "") {
  const normalized = clean(text);
  return (
    normalized.startsWith("How much does ") &&
    normalized.includes(" cost?") &&
    normalized.includes("Type the amount only if you can") &&
    normalized.includes("Example")
  );
}

function rewriteNode(node) {
  if (!node || node.dataset?.claraPriceQuestionCopyFixed === "true") return false;

  const text = clean(node.textContent || "");
  if (!isRawPriceQuestion(text)) return false;

  node.dataset.claraPriceQuestionCopyFixed = "true";
  node.innerHTML = PRICE_QUESTION_COPY;
  return true;
}

function rewritePriceQuestionBubble() {
  if (typeof document === "undefined") return;

  const directBubbles = Array.from(document.querySelectorAll(".clara-buy-check-static-bubble.clara"));
  let changed = directBubbles.some((bubble) => rewriteNode(bubble));

  if (changed) return;

  // Fallback scan: some Buy Check flows render the same message from a different file.
  // Only touch leaf nodes so we do not accidentally replace the whole chat container.
  Array.from(document.querySelectorAll("div, p, span")).forEach((node) => {
    if (node.childElementCount > 0) return;
    rewriteNode(node);
  });
}

function scheduleRewrite() {
  rewritePriceQuestionBubble();
  requestAnimationFrame(rewritePriceQuestionBubble);
  window.setTimeout(rewritePriceQuestionBubble, 80);
  window.setTimeout(rewritePriceQuestionBubble, 250);
  window.setTimeout(rewritePriceQuestionBubble, 600);
}

function installBuyCheckPriceQuestionCopy() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_PRICE_QUESTION_COPY_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_PRICE_QUESTION_COPY_INSTALLED__ = true;

  const observer = new MutationObserver(scheduleRewrite);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scheduleRewrite();

  window.setInterval(rewritePriceQuestionBubble, 900);
}

installBuyCheckPriceQuestionCopy();
