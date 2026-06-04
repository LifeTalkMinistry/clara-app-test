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

function getFallbackSummary({ item, price, reason }) {
  const reasonLine = reasonMeaning(reason);
  return {
    item,
    price,
    reason,
    line1: `You’re thinking of buying ${item} for ${price}.`,
    line2: reason ? `You said “${reason},” so ${reasonLine}` : reasonLine,
    question: "Is that correct before I run the full Buy Check?",
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

  const prompt = `You are CLARA, a warm personal money coach. Before running a Buy Check report, summarize the user's answers in polished, natural wording.\n\nImportant rules:\n- Speak directly to the user as CLARA using I/you.\n- Do not mention budgets, wallet balance, risk, or final decision yet.\n- Correct awkward item wording. Example: "I want to buy second hand phone" becomes "a second-hand phone".\n- Interpret the reason gently. Example: "work need" means it may be connected to work or productivity.\n- Keep the whole confirmation short.\n- Return ONLY valid JSON.\n\nUser answers:\nItem: ${input.item}\nPrice: ${input.price}\nReason: ${input.reason || "not specified"}\n\nJSON shape:\n{"line1":"You’re thinking of buying ...","line2":"Since you mentioned ...","question":"Did I get that right before I run the full Buy Check?"}`;

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

function renderConfirmationCard(card, summary) {
  card.innerHTML = `
    <div class="clara-buy-check-message-title">Before we proceed, just to make sure I got it right:</div>
    <div class="clara-buy-check-confirm-summary">${escapeHtml(summary.line1)}</div>
    ${summary.line2 ? `<div class="clara-buy-check-confirm-summary">${escapeHtml(summary.line2)}</div>` : ""}
    <div class="clara-buy-check-message-sub">${escapeHtml(summary.question || "Did I get that right before I run the full Buy Check?")}</div>
    <div class="clara-buy-check-confirm-actions">
      <button type="button" data-clara-buy-check-confirm-continue="true">Continue</button>
      <button type="button" data-clara-buy-check-confirm-edit="true">Edit answers</button>
    </div>
  `;
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

    const input = {
      item: normalizeItemName(strongValues[0] || "this item"),
      price: strongValues[1] || "the entered amount",
      reason: strongValues[2] || "",
    };

    card.dataset.claraConfirmNatural = "true";
    card.dataset.claraConfirmAiStatus = hasGeminiConfig() ? "loading" : "fallback";
    renderConfirmationCard(card, getFallbackSummary(input));

    if (!hasGeminiConfig()) return;

    askAiForConfirmationSummary(input).then((aiSummary) => {
      if (!aiSummary || !card.isConnected) return;
      card.dataset.claraConfirmAiStatus = "ready";
      renderConfirmationCard(card, aiSummary);
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
