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

function isQuestionBubble(text = "") {
  return (
    text.includes("Hi, Max! What do you want to buy?") ||
    text.includes("How much does") ||
    text.includes("Why do you want to buy it?") ||
    text.includes("Got it. I’m checking")
  );
}

function getFinalBubble() {
  const chat = getChat();
  if (!chat) return null;

  const bubbles = Array.from(chat.querySelectorAll(".clara-buy-check-static-bubble.clara"));
  return bubbles.find((bubble) => {
    const text = clean(bubble.textContent);
    if (!text || isQuestionBubble(text)) return false;
    return text.includes("Decision:") || text.includes("Risk:") || text.includes("Evidence:");
  });
}

function hasEnoughAnswers() {
  const state = window[STATE_KEY] || {};
  return clean(state.item).length > 0 && Number(state.price || 0) > 0 && clean(state.reason).length > 0;
}

function inferDecision(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("buy with cap")) return "BUY WITH CAP";
  if (lower.includes("reduce")) return "REDUCE";
  if (lower.includes("wait")) return "WAIT";
  if (lower.includes("pause")) return "PAUSE";
  if (lower.includes("buy")) return "BUY";
  return "BUY WITH CAP";
}

function inferRisk(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("high")) return "High";
  if (lower.includes("low")) return "Low";
  return "Medium";
}

function extractEvidence(raw = "") {
  const normalized = clean(raw)
    .replace(/Decision:[\s\S]*?Risk:[\s\S]*?(Evidence:|Why:)/i, "")
    .replace(/Safer move:[\s\S]*$/i, "")
    .replace(/\*/g, "•")
    .trim();

  const points = normalized
    .split(/(?:•|-|\n)/)
    .map(clean)
    .filter(Boolean)
    .filter((item) => !/^wallet:?$/i.test(item) && !/^budget:?$/i.test(item));

  return points.slice(0, 5);
}

function buildFallbackPoints() {
  const state = window[STATE_KEY] || {};
  const item = clean(state.item || "this item");
  const price = Number(state.price || 0);
  const reason = clean(state.reason || "not provided");
  const isShoes = /shoe/i.test(item);

  return [
    `The purchase amount is ${money(price)}.`,
    `Your stated reason is: “${reason}”.`,
    `${isShoes ? "You already own shoes" : "This looks discretionary"}, so this is not a strict necessity.`,
    "Wallet, budget, goals, emergency fund, memory, and schedule should remain protected while checking this purchase.",
    "This should be treated as a capped purchase, not an open shopping decision.",
  ];
}

function saferMove(decision = "") {
  const state = window[STATE_KEY] || {};
  const item = clean(state.item || "purchase");
  const price = Number(state.price || 0);
  const lowerItem = /shoe/i.test(item) ? "shopping" : "lifestyle";

  if (decision === "WAIT" || decision === "PAUSE") {
    return `Wait 24 hours before buying. If you still want it, re-check the budget first.`;
  }

  if (decision === "REDUCE") {
    return `Look for a cheaper option below ${money(price)} and keep the difference protected.`;
  }

  return `If you buy it, cap yourself at ${money(price)} and avoid additional ${lowerItem} purchases for the next 7 days.`;
}

function formatFinalBubble() {
  if (!hasEnoughAnswers()) return;

  const bubble = getFinalBubble();
  if (!bubble || bubble.dataset.claraHardFormatted === "true") return;

  const raw = bubble.textContent || "";
  const decision = inferDecision(raw);
  const risk = inferRisk(raw);
  const evidence = extractEvidence(raw);
  const points = evidence.length ? evidence : buildFallbackPoints();

  bubble.dataset.claraHardFormatted = "true";
  bubble.innerHTML = [
    `Decision: ${decision}`,
    "",
    `Risk: ${risk}`,
    "",
    "Why:",
    ...points.map((point) => `• ${point}`),
    "",
    "Safer move:",
    saferMove(decision),
  ].join("\n").replace(/\n/g, "<br>");
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_HARD_FINAL_FORMAT__) return;
  window.__CLARA_BUY_CHECK_HARD_FINAL_FORMAT__ = true;

  new MutationObserver(formatFinalBubble).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  formatFinalBubble();
}

install();
