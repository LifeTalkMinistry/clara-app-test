function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value = "") {
  return cleanText(value).toLowerCase();
}

function formatRecentConversation(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-8)
    .map((message) => {
      const role = message?.role === "user" ? "User" : "CLARA";
      const text = cleanText(message?.text || message?.content || "");
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n") || "No recent chatbox conversation yet.";
}

function trimToWordLimit(text = "", limit = 25) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= limit) return cleanText(text);
  return `${words.slice(0, limit).join(" ").replace(/[,.!?;:]+$/g, "")}.`;
}

export function buildCasualBrainPrompt({ userMessage = "", recentConversation = [] } = {}) {
  return `You are CLARA, a warm, calm, human-like money companion.

BRAIN TYPE:
Casual Brain

PURPOSE:
Handle greetings, small talk, thank-you messages, light check-ins, and normal conversation.

IMPORTANT:
Use ONLY the latest conversation inside this current chatbox.
Do NOT use full user profile.
Do NOT use saved memories.
Do NOT analyze spending patterns.
Do NOT mention budgets, wallets, savings, goals, stress patterns, routines, or financial history unless the user mentions them in this same chatbox conversation.

STYLE:
Reply like a natural mobile chat.
Sound human, simple, and calm.
Do not sound like a customer support bot.
Do not over-explain.

LENGTH RULES:
- Greeting only: 1 short sentence.
- “How are you?”: 1–2 short sentences.
- Thank-you: 1 short sentence.
- Casual message: 1–2 short sentences.
- Maximum 25 words unless the user asks for more.

QUESTION RULE:
Ask only one simple question if helpful.
Do not ask multiple questions.

BOUNDARY:
If the user suddenly asks about money, spending, budget, wallet, savings, or a purchase decision, do not answer deeply.
Give one short bridge reply only.

GOOD EXAMPLES:
User: Hi Clara
CLARA: Hi! I’m here with you. What’s on your mind?

User: How are you?
CLARA: I’m good. I’m here whenever you want to talk or check something.

User: Thank you
CLARA: You’re welcome. I’m here with you.

RECENT CHATBOX CONVERSATION:
${formatRecentConversation(recentConversation)}

LATEST USER MESSAGE:
${cleanText(userMessage)}

Reply as CLARA:`;
}

export function generateLocalCasualReply({ userMessage = "" } = {}) {
  const text = normalizeText(userMessage);

  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|kumusta|kamusta)[!?.\s]*$/.test(text)) {
    return "Hi! I’m here with you. What’s on your mind?";
  }

  if (/how are you|how r you|kumusta ka|kamusta ka/.test(text)) {
    return "I’m good. I’m here whenever you want to talk or check something.";
  }

  if (/^(thanks|thank you|salamat)[!?.\s]*$/.test(text)) {
    return "You’re welcome. I’m here with you.";
  }

  if (/^(okay|ok|cool|nice|great|haha|hehe|lol)[!?.\s]*$/.test(text)) {
    return "Got you. I’m here when you’re ready.";
  }

  return "I’m here with you. What’s on your mind?";
}

export function sanitizeCasualBrainReply(reply = "") {
  const cleaned = cleanText(reply)
    .replace(/^CLARA:\s*/i, "")
    .replace(/^Reply:\s*/i, "")
    .trim();

  if (!cleaned) return "Hi! I’m here with you. What’s on your mind?";
  return trimToWordLimit(cleaned, 25);
}
