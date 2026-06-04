import "./clara-buy-check-result-format-guard";
import "./clara-buy-check-hard-final-format";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeItemName(value = "") {
  const raw = clean(value);
  const cleaned = raw
    .replace(/^i\s*(?:want|wanna|would like|like|need|plan|am planning|was thinking)\s*(?:to)?\s*buy\s+/i, "")
    .replace(/^i\s*(?:want|wanna|would like|like|need|plan|am planning|was thinking)\s+/i, "")
    .replace(/^buy\s+/i, "")
    .replace(/^to\s+buy\s+/i, "")
    .trim();

  return cleaned || raw || "this item";
}

function reasonMeaning(reason = "") {
  const text = clean(reason).toLowerCase();
  if (!text) return "I don’t see a clear reason yet, so I’ll check this carefully.";
  if (/reward|treat|deserve|celebrate|birthday|gift/.test(text)) return "I’m reading this as a reward for yourself, not just a random purchase.";
  if (/work|job|business|client|office|school|study|career|productivity/.test(text)) return "I’m reading this as connected to work, responsibility, or productivity.";
  if (/replace|replacement|broken|old|damaged|lost|repair/.test(text)) return "I’m reading this as a replacement or practical need.";
  if (/health|medical|medicine|doctor|wellness|fitness|pain/.test(text)) return "I’m reading this as connected to your health or wellbeing.";
  if (/hobby|sport|sports|basketball|music|creative|content|church|ministry/.test(text)) return "I’m reading this as connected to a hobby, growth, or personal commitment.";
  if (/want|like|style|fashion|nice|cool/.test(text)) return "I’m reading this as something you personally want, so I’ll be honest about timing.";
  return `I’m reading your reason as “${reason}.”`;
}

function formatBuyCheckOpeningBubble() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".clara-buy-check-static-bubble.clara").forEach((bubble) => {
    const text = clean(bubble.textContent || "");

    if (text !== "Hi, Max! What do you want to buy? Type the exact item first. Example: Running shoes") return;
    if (bubble.dataset.claraBuyCheckFormatted === "true") return;

    bubble.dataset.claraBuyCheckFormatted = "true";
    bubble.innerHTML = `<div class="clara-buy-check-message-title">Hi, Max! What do you want to buy?</div><div class="clara-buy-check-message-sub">Type the exact item first.</div><div class="clara-buy-check-message-example">Example: Running shoes</div>`;
  });
}

function formatConfirmationCard() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".clara-buy-check-confirm-card").forEach((card) => {
    if (card.dataset.claraConfirmNatural === "true") return;

    const strongValues = Array.from(card.querySelectorAll("strong")).map((node) =>
      clean(node.textContent).replace(/^“|”$/g, "")
    );

    const item = normalizeItemName(strongValues[0] || "this item");
    const price = strongValues[1] || "the entered amount";
    const reason = strongValues[2] || "";
    const reasonLine = reasonMeaning(reason);

    card.dataset.claraConfirmNatural = "true";
    card.innerHTML = `
      <div class="clara-buy-check-message-title">Before we proceed, just to make sure I got it right:</div>
      <div class="clara-buy-check-confirm-summary">You’re thinking of buying <strong>${escapeHtml(item)}</strong> for <strong>${escapeHtml(price)}</strong>.</div>
      <div class="clara-buy-check-confirm-summary">${reason ? `You said <strong>“${escapeHtml(reason)}”</strong>, so ${escapeHtml(reasonLine)}` : escapeHtml(reasonLine)}</div>
      <div class="clara-buy-check-message-sub">Is that correct before I run the full Buy Check?</div>
      <div class="clara-buy-check-confirm-actions">
        <button type="button" data-clara-buy-check-confirm-continue="true">Continue</button>
        <button type="button" data-clara-buy-check-confirm-edit="true">Edit answers</button>
      </div>
    `;
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
      margin-top: 7px;
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

    .clara-buy-check-confirm-summary {
      margin-top: 8px;
      color: rgba(226,244,255,.88);
      font-weight: 820;
      line-height: 1.45;
    }

    .clara-buy-check-confirm-summary strong {
      color: rgba(255,255,255,.98);
      font-weight: 950;
    }
  `;
  document.head.appendChild(style);

  const formatAll = () => {
    formatBuyCheckOpeningBubble();
    formatConfirmationCard();
  };

  const observer = new MutationObserver(formatAll);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  formatAll();
}

installBuyCheckMessageHierarchy();
