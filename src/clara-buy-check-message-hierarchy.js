import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
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

  const normalized = cleaned || raw || "this item";
  const lower = normalized.toLowerCase();
  if (lower.includes("phone") && (lower.includes("second") || lower.includes("seconf") || lower.includes("used"))) {
    return "a second-hand phone";
  }

  return normalized;
}

function normalizePrice(value = "") {
  const text = clean(value);
  const match = text.match(/(?:₱|php\s*)?([0-9][0-9,\s]*(?:\.\d{1,2})?)/i);
  if (!match) return text || "the entered amount";
  const amount = Number(String(match[1]).replace(/[\s,]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return text || "the entered amount";
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
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

function getFallbackSummary({ item, price, reason }) {
  const itemName = normalizeItemName(item);
  const priceText = normalizePrice(price);
  const reasonText = clean(reason).replace(/^h+u*m+\s*/i, "").trim() || clean(reason);
  const reasonLine = reasonMeaning(reasonText);
  return {
    item: itemName,
    price: priceText,
    reason: reasonText,
    line1: `You’re thinking of buying ${itemName} for ${priceText}.`,
    line2: reasonText ? `Since you mentioned “${reasonText},” ${reasonLine}` : reasonLine,
    question: "Did I get that right before I run the full Buy Check?",
  };
}

function stripFence(value = "") {
  return clean(value).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function parseAiSummary(reply = "") {
  const text = stripFence(reply);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const line1 = clean(parsed.line1);
    const line2 = clean(parsed.line2);
    const question = clean(parsed.question);
    if (!line1 || !question) return null;
    return { line1, line2, question };
  } catch {
    return null;
  }
}

async function askAiForConfirmationSummary(input) {
  if (!hasGeminiConfig()) return null;

  const prompt = `You are CLARA, a warm personal money coach. Before running a Buy Check report, summarize the user's answers in polished, natural wording.

Important rules:
- Speak directly to the user as CLARA using I/you.
- Do not mention budgets, wallet balance, risk, or final decision yet.
- Correct awkward item wording. Example: "I want to buy second hand phone" becomes "a second-hand phone".
- Interpret the reason gently. Example: "work need" means it may be connected to work or productivity.
- Keep the whole confirmation short.
- Return ONLY valid JSON.

User answers:
Item: ${input.item}
Price: ${input.price}
Reason: ${input.reason || "not specified"}

JSON shape:
{"line1":"You’re thinking of buying ...","line2":"Since you mentioned ...","question":"Did I get that right before I run the full Buy Check?"}`;

  try {
    const reply = await generateClaraGeminiReply({
      message: prompt,
      mode: "buy_check_confirmation_summary",
      context: input,
      conversationHistory: [
        { role: "user", text: input.item },
        { role: "user", text: input.price },
        { role: "user", text: input.reason },
      ],
    });

    return parseAiSummary(reply);
  } catch (error) {
    console.warn("[CLARA Buy Check] AI confirmation summary failed; fallback used.", error);
    return null;
  }
}

function keepConfirmationVisible(card) {
  if (typeof window === "undefined" || !card) return;

  const chat = card.closest("[data-clara-buy-check-static-chat]");
  const main = card.closest("main") || chat?.closest("main");
  const shell = card.closest(".fixed") || main?.closest(".fixed");
  const composer = shell?.querySelector("form");
  const composerHeight = Math.ceil(composer?.getBoundingClientRect?.().height || 88);
  const safePadding = Math.max(152, composerHeight + 72);

  if (chat) {
    chat.style.paddingBottom = `${safePadding}px`;
  }

  if (!main) return;

  const adjust = () => {
    if (!card.isConnected) return;

    const mainRect = main.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const composerRect = composer?.getBoundingClientRect?.();
    const visibleBottom = composerRect
      ? Math.min(mainRect.bottom, composerRect.top - 16)
      : mainRect.bottom - 18;
    const overflow = cardRect.bottom - visibleBottom;

    if (overflow > 0) {
      main.scrollBy?.({ top: overflow + 22, behavior: "smooth" });
      return;
    }

    if (cardRect.top < mainRect.top + 18) {
      main.scrollBy?.({ top: cardRect.top - mainRect.top - 18, behavior: "smooth" });
    }
  };

  requestAnimationFrame(adjust);
  window.setTimeout(adjust, 80);
  window.setTimeout(adjust, 220);
  window.setTimeout(adjust, 520);
}

function renderThinkingCard(card) {
  card.innerHTML = `
    <div class="clara-buy-check-message-title">Before we proceed, let me understand that first.</div>
    <div class="clara-buy-check-confirm-summary">I’m cleaning up your answer and summarizing what I think you mean.</div>
    <div class="clara-buy-check-message-sub">One moment...</div>
  `;
  keepConfirmationVisible(card);
}

function renderConfirmationCard(card, summary) {
  card.innerHTML = `
    <div class="clara-buy-check-message-title">Before we proceed, I want to make sure I understood you correctly.</div>
    <div class="clara-buy-check-confirm-summary">${escapeHtml(summary.line1)}</div>
    ${summary.line2 ? `<div class="clara-buy-check-confirm-summary">${escapeHtml(summary.line2)}</div>` : ""}
    <div class="clara-buy-check-message-sub">${escapeHtml(summary.question || "Did I get that right before I run the full Buy Check?")}</div>
    <div class="clara-buy-check-confirm-actions">
      <button type="button" data-clara-buy-check-confirm-continue="true">Continue</button>
      <button type="button" data-clara-buy-check-confirm-edit="true">Edit answers</button>
    </div>
  `;
  keepConfirmationVisible(card);
}

function getRecentUserAnswers(card) {
  const chat = card.closest("[data-clara-buy-check-static-chat]");
  const userBubbles = Array.from(chat?.querySelectorAll(".clara-buy-check-static-bubble.user") || []);
  const recent = userBubbles.slice(-3).map((bubble) => clean(bubble.textContent));
  if (recent.length < 3) return null;
  return { item: recent[0], price: recent[1], reason: recent[2] };
}

function readConfirmationInput(card) {
  const strongValues = Array.from(card.querySelectorAll("strong")).map((node) =>
    clean(node.textContent).replace(/^“|”$/g, "")
  );
  const recent = getRecentUserAnswers(card);
  return {
    item: recent?.item || strongValues[0] || "this item",
    price: recent?.price || strongValues[1] || "the entered amount",
    reason: recent?.reason || strongValues[2] || "",
  };
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
    if (card.dataset.claraConfirmNatural === "true") {
      keepConfirmationVisible(card);
      return;
    }

    const input = readConfirmationInput(card);
    const normalizedInput = {
      item: normalizeItemName(input.item),
      price: normalizePrice(input.price),
      reason: clean(input.reason),
    };

    card.dataset.claraConfirmNatural = "true";
    card.dataset.claraConfirmAiStatus = hasGeminiConfig() ? "loading" : "fallback";
    renderThinkingCard(card);

    if (!hasGeminiConfig()) {
      renderConfirmationCard(card, getFallbackSummary(normalizedInput));
      return;
    }

    askAiForConfirmationSummary(normalizedInput).then((aiSummary) => {
      if (!card.isConnected) return;
      card.dataset.claraConfirmAiStatus = aiSummary ? "ready" : "fallback";
      renderConfirmationCard(card, aiSummary || getFallbackSummary(normalizedInput));
    });
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

    [data-clara-buy-check-static-chat]:has(.clara-buy-check-confirm-card) {
      padding-bottom: 168px !important;
    }

    .clara-buy-check-confirm-card {
      scroll-margin-bottom: 160px;
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
