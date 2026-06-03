import "./clara-buy-check-result-format-guard";

function formatBuyCheckOpeningBubble() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".clara-buy-check-static-bubble.clara").forEach((bubble) => {
    const text = String(bubble.textContent || "").replace(/\s+/g, " ").trim();

    if (text !== "Hi, Max! What do you want to buy? Type the exact item first. Example: Running shoes") return;
    if (bubble.dataset.claraBuyCheckFormatted === "true") return;

    bubble.dataset.claraBuyCheckFormatted = "true";
    bubble.innerHTML = `<div class="clara-buy-check-message-title">Hi, Max! What do you want to buy?</div><div class="clara-buy-check-message-sub">Type the exact item first.</div><div class="clara-buy-check-message-example">Example: Running shoes</div>`;
  });
}

function installBuyCheckMessageHierarchy() {
  if (typeof window === "undefined" || window.__CLARA_BUY_CHECK_MESSAGE_HIERARCHY_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_MESSAGE_HIERARCHY_INSTALLED__ = true;

  const style = document.createElement("style");
  style.textContent = `
    .clara-buy-check-static-bubble[data-clara-buy-check-formatted="true"] {
      white-space: normal !important;
      padding-top: 14px !important;
      padding-bottom: 14px !important;
    }

    .clara-buy-check-message-title {
      font-weight: 950;
      line-height: 1.35;
      color: rgba(255,255,255,.95);
    }

    .clara-buy-check-message-sub {
      margin-top: 5px;
      color: rgba(226,232,240,.76);
      font-weight: 750;
      line-height: 1.35;
    }

    .clara-buy-check-message-example {
      margin-top: 4px;
      color: rgba(110,231,183,.92);
      font-weight: 900;
      line-height: 1.35;
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(formatBuyCheckOpeningBubble);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  formatBuyCheckOpeningBubble();
}

installBuyCheckMessageHierarchy();
