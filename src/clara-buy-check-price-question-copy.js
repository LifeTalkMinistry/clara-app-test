function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function rewritePriceQuestionBubble() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".clara-buy-check-static-bubble.clara").forEach((bubble) => {
    if (bubble.dataset.claraPriceQuestionCopyFixed === "true") return;

    const text = clean(bubble.textContent || "");
    if (!/^How much does .+ cost\? Type the amount only if you can\. Example: ₱3,500$/i.test(text)) return;

    bubble.dataset.claraPriceQuestionCopyFixed = "true";
    bubble.innerHTML = "I see, how much does it cost?<br><br>Type the amount only if you can. Example: ₱3,500";
  });
}

function installBuyCheckPriceQuestionCopy() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_PRICE_QUESTION_COPY_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_PRICE_QUESTION_COPY_INSTALLED__ = true;

  const observer = new MutationObserver(rewritePriceQuestionBubble);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  rewritePriceQuestionBubble();
}

installBuyCheckPriceQuestionCopy();
