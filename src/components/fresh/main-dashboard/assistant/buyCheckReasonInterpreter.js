import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value = 0) {
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function normalizeReasonSummary(value = "", fallback = "") {
  const summary = clean(value)
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^(?:summary|interpretation|reason)\s*:\s*/i, "")
    .replace(/^['“”"]+|['“”"]+$/g, "")
    .replace(/\s*(?:did i understand that correctly\??|is that correct\??)$/i, "")
    .replace(/[?.!]+$/, "")
    .trim();

  return summary || clean(fallback).replace(/[?.!]+$/, "");
}

export async function interpretBuyCheckReason({
  item,
  price,
  originalReason,
  assistantContext,
}) {
  const fallback = normalizeReasonSummary(originalReason, originalReason);
  if (!hasGeminiConfig()) {
    return { summary: fallback, source: "fallback" };
  }

  try {
    const reply = await generateClaraGeminiReply({
      message: `Interpret the user's reason for this Buy Check.\n\nItem: ${clean(item)}\nPrice: ${formatMoney(price)}\nExact reason: ${clean(originalReason)}\n\nReturn one concise second-person reason clause. Preserve the meaning and urgency. Match the user's language, including Taglish. Do not judge, advise, add facts, mention the price, or ask a question. Return only the rewritten reason without a label or quotation marks.`,
      context: {
        purchase: {
          item: clean(item),
          price: toNumber(price),
          originalReason: clean(originalReason),
        },
        meProfile:
          assistantContext?.meProfileContext ||
          assistantContext?.lifeProfile ||
          assistantContext?.user?.user_metadata ||
          null,
      },
      mode: "buy_check_reason_interpretation",
      conversationHistory: [],
    });

    return {
      summary: normalizeReasonSummary(reply, fallback),
      source: "ai",
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Reason interpretation fallback used.", error);
    return { summary: fallback, source: "fallback" };
  }
}
