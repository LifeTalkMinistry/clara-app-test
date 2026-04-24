import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import useFinancialData from "@/hooks/useFinancialData";
import { buildFinanceSummary, formatPeso } from "@/lib/ai/financeSummary";
import { extractFields } from "@/lib/ai/fieldExtractor";
import {
  createSession,
  updateSession,
  markAwaitingConfirmation,
  clearSession,
} from "@/lib/ai/sessionManager";

const THINKING_MIN_DELAY_MS = 900;
const THINKING_MAX_DELAY_MS = 1300;
const TYPING_WORD_DELAY_MS = 45;

// -----------------------------------------------------------------------------
// Additional constants and helper functions for the upgraded AI assistant
//
// MASTER_SYSTEM_PROMPT defines the overall behaviour of the AI when talking to
// the user. This prompt is injected into every AI call to ensure CLARA has a
// consistent personality: it should be concise, financial‑focused and avoid
// generic "as an AI" phrasing. See the user instructions for details.
const MASTER_SYSTEM_PROMPT = `You are CLARA, a personal financial AI.

You are not generic.
You base your answers on the user’s financial data.

You must:
- personalize responses using financial data
- give actionable advice
- be concise and natural
- avoid robotic tone

You handle:
- budgeting
- spending behaviour
- decision‑making
- savings
- financial coaching

If the user asks for advice:
→ analyse before answering

If unclear:
→ ask a smart follow‑up

Never say:
"As an AI..."`;

/**
 * Determine whether a given user input should be handled locally or by the AI.
 *
 * CLARA handles a handful of "simple" intents herself – balance checks,
 * wallet counts and straightforward expense logging. Anything that seems
 * advisory, analytical or hypothetical is escalated to the AI. Unknown
 * intents are also sent to the AI rather than returning a generic reply.
 *
 * @param {string} input The raw user input.
 * @param {string} intent The intent detected by the local intent classifier.
 * @returns {boolean} True if the AI should handle the message, false if the local
 *   engine should respond.
 */
function determineIfAIIsNeeded(input = "", intent = "UNKNOWN") {
  const lower = String(input || "").toLowerCase();

  // Advisory/decision questions – anything asking for guidance
  const adviceTriggers = [
    "what should i", "should i", "do i need", "would it be better",
    "better choice", "recommend", "suggest",
  ];

  // Analytical questions – why something happened or hypothetical scenarios
  const analysisTriggers = [
    "why", "explain", "analysis", "what if", "suppose", "imagine",
    "hypothetical", "how come", "reason", "because"
  ];

  // If the local intent classifier doesn't understand, send to AI
  if (!intent || intent === "UNKNOWN") {
    return true;
  }

  // LOG_EXPENSE, READ_BALANCE and READ_WALLETS are considered simple
  if (intent === "LOG_EXPENSE" || intent === "READ_BALANCE" || intent === "READ_WALLETS") {
    return false;
  }

  // Check for advisory or analysis triggers
  if (adviceTriggers.some((phrase) => lower.includes(phrase))) return true;
  if (analysisTriggers.some((phrase) => lower.includes(phrase))) return true;

  // Default to local
  return false;
}

/**
 * Humanise a reply so that CLARA sounds more like a person and less like a
 * template. Shorten stock phrases, convert numbers to the user's currency
 * format and limit the length to 1–3 sentences. The goal is to avoid a
 * robotic tone and overly formal responses. This helper runs on both local
 * replies and AI responses.
 *
 * @param {string} reply Raw reply text from either the local intent handler or the AI.
 * @returns {string} A more natural sounding version of the reply.
 */
function humaniseResponse(reply = "") {
  let text = String(reply || "").trim();
  if (!text) return text;

  // Replace formal phrasing with more conversational phrasing
  text = text.replace(/\bYou currently have\b/gi, "You’ve got");
  text = text.replace(/\bYou have\b/gi, "You’ve got");
  text = text.replace(/\bGot it\.\s*/gi, "Got it — ");
  text = text.replace(/\bGot it,\s*/gi, "Got it — ");

  // Format standalone numbers into peso amounts when appropriate
  // This matches numbers that are not already prefixed with ₱
  text = text.replace(/\b(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?\b/g, (match) => {
    // Preserve numbers embedded in larger words
    if (/^[0-9]+$/.test(match)) {
      const num = Number(match.replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        return formatPeso(num);
      }
    }
    return match;
  });

  // Limit to the first three sentences to keep things concise
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (sentences.length > 3) {
    text = sentences.slice(0, 3).join(" ");
  }
  return text;
}

/**
 * Generate an AI response using an external service (e.g. Gemini). The
 * conversation context, finance summary and detected intent are bundled
 * together with a master system prompt to give the AI a full picture of
 * what’s going on. This helper abstracts the fetch call so the rest of the
 * component can remain clean. If the network call fails or returns nothing,
 * an empty string is returned.
 *
 * @param {Object} params
 * @param {string} params.userInput The current user message.
 * @param {Array<{role: string, content: string}>} params.conversation Recent
 *   messages to provide context. This should exclude the current user input.
 * @param {Object} params.summary Finance summary generated by buildFinanceSummary().
 * @param {string} params.intent Detected local intent for the current message.
 * @returns {Promise<string>} The AI’s reply as plain text.
 */
async function generateAiResponse({ userInput, conversation = [], summary = {}, intent = "" }) {
  try {
    // Build a message list starting with the master prompt and context
    const messages = [];
    messages.push({ role: "system", content: MASTER_SYSTEM_PROMPT });
    messages.push({ role: "system", content: `Finance summary: ${JSON.stringify(summary)}` });
    messages.push({ role: "system", content: `Detected intent: ${intent}` });
    // Include the last few conversation messages to give the AI context
    conversation.forEach((m) => {
      // Only include recognised roles
      if (m.role === "user" || m.role === "assistant") {
        messages.push({ role: m.role, content: m.content });
      }
    });
    // Append the current user input
    messages.push({ role: "user", content: userInput });

    // Post the messages to an AI endpoint. Replace the endpoint with your
    // actual AI service path. The body and response structure here assume
    // the endpoint accepts an array of messages and returns an object with
    // a "reply" field.
    const response = await fetch("/api/ai/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) {
      console.error("AI service returned an error", response.statusText);
      return "";
    }
    const data = await response.json();
    const aiReply = data.reply || data.response || "";
    return typeof aiReply === "string" ? aiReply : String(aiReply || "");
  } catch (err) {
    console.error("Failed to call AI service", err);
    return "";
  }
}

const EXPENSE_ALIAS_MAP = {
  trycicle: "tricycle fare",
  tricycle: "tricycle fare",
  tricy: "tricycle fare",
  trike: "tricycle fare",
  tric: "tricycle fare",
  pamasahe: "fare",
  fare: "fare",
  jeep: "jeepney fare",
  jeepney: "jeepney fare",
  bus: "bus fare",
  taxi: "taxi fare",
  grab: "grab ride",
  angkas: "angkas ride",
  joyride: "joyride ride",
  moveit: "move it ride",
  cofee: "coffee",
  coffe: "coffee",
  coffee: "coffee",
  milktea: "milk tea",
  "milk tea": "milk tea",
  lunch: "lunch",
  dinner: "dinner",
  breakfast: "breakfast",
  snack: "snack",
  snacks: "snacks",
  jollibee: "jollibee meal",
  jolibee: "jollibee meal",
  mcdo: "mcdo meal",
  mcdonalds: "mcdonalds meal",
  foodpanda: "food delivery",
  load: "mobile load",
  data: "mobile data",
  grocery: "groceries",
  groceries: "groceries",
};

const CATEGORY_KEYWORDS = {
  transport: [
    "tricycle",
    "trike",
    "fare",
    "jeep",
    "jeepney",
    "bus",
    "taxi",
    "grab",
    "angkas",
    "joyride",
    "move it",
    "pamasahe",
  ],
  food: [
    "coffee",
    "milk tea",
    "lunch",
    "dinner",
    "breakfast",
    "snack",
    "jollibee",
    "mcdo",
    "mcdonalds",
    "food",
    "meal",
    "chicken",
    "burger",
    "rice",
    "drink",
  ],
  shopping: ["shopee", "lazada", "clothes", "shirt", "shoes", "bag"],
  utilities: ["load", "data", "internet", "wifi", "electric", "water", "bill"],
  housing: ["rent", "apartment", "condo"],
  health: ["medicine", "pharmacy", "doctor", "hospital"],
  education: ["school", "tuition", "book", "course"],
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getThinkingDelay(reply = "") {
  const length = String(reply || "").length;
  if (length <= 50) return THINKING_MIN_DELAY_MS;
  if (length <= 120) return 1100;
  return THINKING_MAX_DELAY_MS;
}

function normalizeExpenseItem(item = "") {
  let normalized = String(item || "")
    .toLowerCase()
    .trim()
    .replace(/\b(for|on|sa|ng|for my|my|ako|ko)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  if (EXPENSE_ALIAS_MAP[normalized]) {
    return EXPENSE_ALIAS_MAP[normalized];
  }

  const words = normalized.split(" ");
  const mappedWords = words.map((word) => EXPENSE_ALIAS_MAP[word] || word);
  normalized = mappedWords.join(" ").replace(/\s+/g, " ").trim();

  if (EXPENSE_ALIAS_MAP[normalized]) {
    return EXPENSE_ALIAS_MAP[normalized];
  }

  return normalized;
}

function inferExpenseCategory(item = "") {
  const clean = String(item || "").toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => clean.includes(keyword))) {
      return category;
    }
  }

  return "other";
}

function autoDetectExpense(text) {
  const clean = String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[₱]/g, " peso ")
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ");

  if (!clean) return null;

  const blockedWords = [
    "hi",
    "hello",
    "hey",
    "thanks",
    "thank you",
    "how are you",
    "are you there",
    "help me",
    "can you help me",
  ];

  if (blockedWords.some((word) => clean === word || clean.startsWith(`${word} `))) {
    return null;
  }

  const amountPattern =
    "(?:php|peso|pesos|p)?\\s*(\\d+(?:\\.\\d{1,2})?)\\s*(?:php|peso|pesos|p)?";

  const amountFirst = clean.match(new RegExp(`^${amountPattern}\\s+(.+)$`, "i"));
  const amountLast = clean.match(new RegExp(`^(.+?)\\s+${amountPattern}$`, "i"));

  let amount = null;
  let item = "";

  if (amountFirst) {
    amount = Number(amountFirst[1]);
    item = amountFirst[2];
  } else if (amountLast) {
    item = amountLast[1];
    amount = Number(amountLast[2]);
  }

  if (!amount || amount < 1 || amount > 1000000) return null;

  item = normalizeExpenseItem(item);

  if (!item || item.length < 2) return null;

  return {
    amount,
    item,
    category: inferExpenseCategory(item),
  };
}

function detectIntent(text, summary = {}) {
  const t = String(text || "").toLowerCase().trim();

  const totals = summary.totals || {};
  const walletList = summary.wallets || [];

  if (!t) {
    return {
      intent: "UNKNOWN",
      reply: "I’m here. Tell me what you want to do.",
    };
  }

  if (
    t.includes("how much money") ||
    t.includes("money left") ||
    t.includes("balance")
  ) {
    return {
      intent: "READ_BALANCE",
      reply: `You currently have ${formatPeso(totals.walletBalance)}.`,
    };
  }

  if (t.includes("wallet")) {
    return {
      intent: "READ_WALLETS",
      reply: `You have ${walletList.length} wallets.`,
    };
  }

  if (t.includes("expense") || t.includes("spent")) {
    return {
      intent: "LOG_EXPENSE",
      reply: "Got it. How much did you spend?",
    };
  }

  return {
    intent: "UNKNOWN",
    reply: "Got it. Tell me more so I can help you.",
  };
}

export default function ClaraAssistantPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [typingMessage, setTypingMessage] = useState("");

  const scrollRef = useRef(null);
  const typingCancelledRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  const { expenses, wallets, walletTransactions, budgets, totalWalletBalance } =
    useFinancialData(user);

  const financeSummary = useMemo(
    () =>
      buildFinanceSummary({
        expenses,
        wallets,
        budgets,
        walletTransactions,
        totalWalletBalance,
      }),
    [expenses, wallets, budgets, walletTransactions, totalWalletBalance]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingMessage, thinking]);

  const typeAssistantReply = async (reply) => {
    const words = reply.split(/(\s+)/);
    let current = "";

    for (const word of words) {
      if (typingCancelledRef.current) return;

      current += word;
      setTypingMessage(current);
      await wait(TYPING_WORD_DELAY_MS);
    }

    if (typingCancelledRef.current) return;

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setTypingMessage("");
  };

  const submitUserMessage = async (text) => {
    const clean = String(text || "").trim();
    // Prevent empty sends or overlapping operations
    if (!clean || thinking || typingMessage) return;

    // Reset any prior typing animation cancellation
    typingCancelledRef.current = false;

    /**
     * Handle confirmations when we already have a pending session. This branch
     * preserves existing confirmation behaviour but phrases the assistant’s
     * responses in a more natural way. A positive confirmation triggers
     * persistence via the session manager (if available) and clears the session.
     */
    if (session && session.awaitingConfirmation) {
      // Immediately record the user's message in the transcript
      setMessages((prev) => [...prev, { role: "user", content: clean }]);
      setInput("");
      setThinking(true);
      const lower = clean.toLowerCase();
      const positive = ["yes", "sure", "y", "yeah", "confirm", "ok", "okay"].some((w) => lower === w || lower.startsWith(`${w} `));
      const negative = ["no", "n", "not", "cancel", "stop"].some((w) => lower === w || lower.startsWith(`${w} `));

      await wait(900);
      setThinking(false);
      await wait(120);

      if (positive) {
        // Attempt to persist the session via the session manager if available
        try {
          if (typeof createSession === "function") {
            await createSession(session.intent, session.fields);
          } else if (typeof updateSession === "function") {
            await updateSession(session);
          }
        } catch (err) {
          console.error("Error saving session", err);
        }
        // Provide a humanised acknowledgement and clear the session
        await typeAssistantReply(humaniseResponse("All set! I’ve saved that expense for you."));
        setSession(null);
        try {
          if (typeof clearSession === "function") {
            clearSession();
          }
        } catch (err) {
          // Ignore clearSession failures silently
        }
        return;
      }
      if (negative) {
        await typeAssistantReply(humaniseResponse("No problem — I won’t save it."));
        setSession(null);
        try {
          if (typeof clearSession === "function") {
            clearSession();
          }
        } catch (err) {}
        return;
      }
      // If unclear, ask again politely
      await typeAssistantReply(humaniseResponse("Sorry, could you let me know if you want to save this expense?"));
      return;
    }

    /**
     * Try to automatically detect an expense in the user’s message. If one is
     * detected and there is no active session, we treat this as a simple
     * expense logging request: ask for confirmation locally and avoid
     * unnecessary AI calls. The assistant replies in a natural tone.
     */
    const autoExpense = autoDetectExpense(clean);
    if (autoExpense && !session) {
      // Record the user message
      setMessages((prev) => [...prev, { role: "user", content: clean }]);
      setInput("");
      setThinking(true);
      // Build a humanised confirmation prompt
      const reply = humaniseResponse(`Got it — ${formatPeso(autoExpense.amount)} for ${autoExpense.item}. Want me to save it?`);
      await wait(900);
      setThinking(false);
      await wait(120);
      await typeAssistantReply(reply);
      // Start a session awaiting confirmation
      setSession({
        intent: "LOG_EXPENSE",
        fields: autoExpense,
        awaitingConfirmation: true,
      });
      // Also mark awaiting confirmation via the session manager if available
      try {
        if (typeof markAwaitingConfirmation === "function") {
          markAwaitingConfirmation(autoExpense);
        }
      } catch (err) {}
      return;
    }

    // Record the user's message and prepare to generate a reply
    setMessages((prev) => [...prev, { role: "user", content: clean }]);
    setInput("");
    setThinking(true);

    // Run the local intent classifier to determine the nature of the request
    const intentResult = detectIntent(clean, financeSummary);
    const localIntent = intentResult.intent;
    const localReplyRaw = intentResult.reply;
    // Decide whether to use AI or the local reply
    const useAI = determineIfAIIsNeeded(clean, localIntent);

    if (!useAI) {
      // Simple local handling: humanise the reply and return
      const localReply = humaniseResponse(localReplyRaw);
      await wait(Math.max(900, getThinkingDelay(localReply)));
      setThinking(false);
      await wait(120);
      await typeAssistantReply(localReply);
      return;
    }

    // Otherwise, call the AI with full context
    // Pull the last few messages as context (excluding the one we just added)
    const context = messages.slice(-5);
    let aiReply = "";
    try {
      aiReply = await generateAiResponse({
        userInput: clean,
        conversation: context,
        summary: financeSummary,
        intent: localIntent,
      });
    } catch (err) {
      console.error("AI call failed", err);
    }
    // Fallback to a polite default if the AI didn't return anything
    if (!aiReply) {
      aiReply = "Sorry, I couldn’t figure that out. Could you rephrase?";
    }
    // Try extracting structured fields from the AI’s reply to see if it
    // automatically recommended logging an expense
    let fields = null;
    try {
      const extracted = extractFields ? await extractFields(aiReply) : null;
      // Some extractors wrap the result inside a 'fields' property
      fields = extracted?.fields || extracted;
    } catch (err) {
      // ignore extraction errors
      fields = null;
    }
    if (fields && fields.amount && fields.item) {
      // Normalise and infer category
      const amount = Number(fields.amount);
      const item = normalizeExpenseItem(fields.item);
      const category = inferExpenseCategory(item);
      const autoObj = { amount, item, category };
      // Ask for confirmation about logging the expense
      const reply = humaniseResponse(`Got it — ${formatPeso(amount)} for ${item}. Want me to save it?`);
      await wait(Math.max(900, getThinkingDelay(reply)));
      setThinking(false);
      await wait(120);
      await typeAssistantReply(reply);
      setSession({ intent: "LOG_EXPENSE", fields: autoObj, awaitingConfirmation: true });
      try {
        if (typeof markAwaitingConfirmation === "function") {
          markAwaitingConfirmation(autoObj);
        }
      } catch (err) {}
      return;
    }

    // Otherwise, humanise the AI reply and send it
    const finalReply = humaniseResponse(aiReply);
    await wait(Math.max(900, getThinkingDelay(finalReply)));
    setThinking(false);
    await wait(120);
    await typeAssistantReply(finalReply);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-lg bg-[#071120] p-4 text-white rounded-t-3xl">
        <div className="flex justify-between mb-3">
          <span>Chat Assistant</span>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div ref={scrollRef} className="h-56 overflow-y-auto mb-3">
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`}>{m.content}</div>
          ))}
          {thinking && <div>CLARA is thinking...</div>}
          {typingMessage && <div>{typingMessage}</div>}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
          />
          <button onClick={() => submitUserMessage(input)}>
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}