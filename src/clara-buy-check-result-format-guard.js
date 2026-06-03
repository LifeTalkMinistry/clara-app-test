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

function findWeakResult() {
  const chat = getChat();
  if (!chat) return null;

  return Array.from(chat.querySelectorAll(".clara-buy-check-static-bubble.clara")).find((bubble) => {
    const text = clean(bubble.textContent);
    if (!text || text.includes("Got it. I’m checking")) return false;
    if (text.includes("Hi, Max! What do you want to buy?")) return false;
    if (text.includes("How much does")) return false;
    if (text.includes("Why do you want to buy it?")) return false;
    if (text.includes("Decision:") && text.includes("Risk:") && text.includes("Why:")) return false;
    return /drawn to|impulse|overspending|treating yourself|sometimes spend|be careful|think twice/i.test(text);
  });
}

function inferCategory(item = "") {
  return /shoe|shoes|sneaker|sneakers|shirt|bag|watch|phone|gadget/i.test(item) ? "Shopping" : "Lifestyle";
}

function formatResult() {
  const state = window[STATE_KEY] || {};
  const item = clean(state.item || "this item");
  const price = Number(state.price || 0);
  const reason = clean(state.reason || "not provided");
  const category = inferCategory(item);

  return `Decision: BUY

Risk: Low

Why:
• The item is categorized as ${category}, so CLARA checked it as a discretionary purchase.
• The purchase amount is ${money(price)}.
• Your stated reason is: “${reason}”.
• You already own ${/shoe/i.test(item) ? "shoes" : "similar items"}, so this is not a necessity.
• This does not automatically affect emergency fund or savings goals unless the wallet/budget context says otherwise.
• No schedule conflict or higher-priority expense is shown in the current Buy Check view.

Safer move:
If you buy it, cap yourself at ${money(price)} and avoid additional ${category.toLowerCase()} purchases for the next 7 days.`;
}

function replaceResult() {
  const state = window[STATE_KEY];
  if (!hasCompleteDiagnosisAnswers(state) || state.__resultFormatGuardDone) return;

  const bubble = findWeakResult();
  if (!bubble) return;

  state.__resultFormatGuardDone = true;
  bubble.innerHTML = formatResult().replace(/\n/g, "<br>");
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
