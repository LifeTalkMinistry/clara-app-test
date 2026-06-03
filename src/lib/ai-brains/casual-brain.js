function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value = "") {
  return cleanText(value).toLowerCase();
}

function formatFullConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = cleanText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n") || "No visible chatbox conversation history yet.";
}

function trimToWordLimit(text = "", limit = 25) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= limit) return cleanText(text);
  return `${words.slice(0, limit).join(" ").replace(/[,.!?;:]+$/g, "")}.`;
}

export function isCasualAcknowledgementMessage(userMessage = "") {
  const text = normalizeText(userMessage).replace(/[!?.]+$/g, "").trim();
  return /^(okay|ok|cool|nice|great|perfect|awesome|good|got it|gets|thanks|thank you|salamat|alright|all right|sige|copy|noted|yup|yep|yes|aha|ah ok|ah okay)$/.test(text);
}

export function buildCasualBrainPrompt({ userMessage = "", recentConversation = [] } = {}) {
  const acknowledgementOnly = isCasualAcknowledgementMessage(userMessage);

  return `You are CLARA, a warm, calm, human-like money companion.

BRAIN TYPE:
Casual Brain

PURPOSE:
Handle greetings, small talk, thank-you messages, light check-ins, acknowledgements, and normal conversation.

IMPORTANT:
Use ONLY the latest visible conversation inside this current chatbox.
Do NOT use full user profile.
Do NOT use saved memories.
Do NOT analyze spending patterns.
Do NOT mention budgets, wallets, savings, goals, stress patterns, routines, or financial history unless the latest user message clearly asks for them.
Use the full visible chatbox conversation history to understand follow-ups like "ok", "sure", "what?", "great", and "thank you".
If the latest user message is only an acknowledgement like "Great", "Okay", "Nice", "Got it", or "Thanks", do NOT repeat the previous budget/finance answer. Treat it as closure, then gently open the next step.

ACKNOWLEDGEMENT MODE:
${acknowledgementOnly ? "ACTIVE. Reply naturally with the meaning: glad that helped, then ask what the user wants to check next." : "Not active."}

STYLE:
Reply like a natural mobile chat.
Sound human, simple, and calm.
Do not sound like a customer support bot.
Do not over-explain.
Do not use canned wording.

LENGTH RULES:
- Greeting only: 1 short sentence.
- “How are you?”: 1–2 short sentences.
- Thank-you or acknowledgement: 1 short sentence plus one simple next-step question if helpful.
- Casual message: 1–2 short sentences.
- Maximum 25 words unless the user asks for more.

QUESTION RULE:
Ask only one simple question if helpful.
Do not ask multiple questions.

BOUNDARY:
If the user suddenly asks about money, spending, budget, wallet, savings, or a purchase decision, do not answer deeply.
Give one short bridge reply only.

FULL VISIBLE CHATBOX CONVERSATION HISTORY:
${formatFullConversation(recentConversation)}

LATEST USER MESSAGE:
${cleanText(userMessage)}

Reply as CLARA:`;
}

export function generateLocalCasualReply() {
  return "";
}

export function sanitizeCasualBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .trim();

  if (!cleaned) return "";
  return trimToWordLimit(cleaned, 25);
}
