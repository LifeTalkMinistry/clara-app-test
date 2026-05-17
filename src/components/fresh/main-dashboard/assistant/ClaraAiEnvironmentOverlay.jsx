import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { buildClaraFinanceSnapshot, generateClaraLocalReply } from "@/lib/clara-local-brain";
import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { buildContextualFinanceReply } from "@/lib/clara-direct-finance-reply";

const CLARA_AI_BRAIN_VERSION = "connected-brain-v13-hybrid-profile-ai";
const PRESENTATION_RULES = "Reply like a natural mobile chat message. Plain text only. Use short readable paragraphs separated by blank lines when there is more than one thought. Bullets are allowed only when they make the answer easier to scan. No heavy headings, tables, or report format. Keep it warm, practical, and easy to read.";
const SHOW_DEBUG_SOURCE = import.meta.env.DEV || import.meta.env.VITE_CLARA_DEBUG_AI === "true";
const DEFAULT_CHAT_INPUT_PLACEHOLDER = "Ask CLARA or enter item + price";

const DEFAULT_CLARA_GREETINGS = [
  {
    eyebrow: "ASK BEFORE YOU SPEND",
    heading: "Hi, any spending concern today?",
    body: [
      "Tell CLARA what you are thinking of buying, changing, or checking before you act.",
      "You can also choose a guided path below if you want more structure.",
    ],
  },
  {
    eyebrow: "CLARA IS READY",
    heading: "What money situation are we figuring out?",
    body: [
      "Start with what is on your mind: a purchase, a budget concern, a savings goal, or a money pressure today.",
      "CLARA can talk naturally or guide you through a specific action when you choose one.",
    ],
  },
  {
    eyebrow: "BEFORE YOU ACT",
    heading: "Anything tempting your wallet today?",
    body: [
      "Share the item, amount, reason, or situation so CLARA can help you think clearly first.",
      "Choose a category below only when you want the screen to become more specific.",
    ],
  },
  {
    eyebrow: "MONEY CHECK-IN",
    heading: "Need help thinking through a decision?",
    body: [
      "You can ask freely, or select Smart Actions and Core Features when you need a more guided check.",
      "No rush. CLARA is here to help you pause before spending.",
    ],
  },
];

const CHAT_INPUT_PLACEHOLDERS = [
  "Tell CLARA what’s happening today...",
  "Share what’s affecting your spending...",
  "Tell CLARA about your current situation...",
  "What’s been going on lately?",
  "Share a habit, feeling, or concern...",
  "Tell CLARA before you decide...",
  "What should CLARA understand about you?",
  "Share anything CLARA should know...",
];

const TALK_TO_CLARA_CONTEXT_ACTION = {
  id: "talk_to_clara_context",
  title: "Talk to CLARA",
  shortTitle: "Talk to CLARA",
  prompt: "Continue the Talk to CLARA conversation naturally.",
  chips: [],
};

const TALK_TO_CLARA_LANGUAGE_PROMPT = `Hi 👩 I’m CLARA.

Before we continue, I want to quickly explain what this space is for.

Would you like me to explain it in English or Tagalog?`;

const TALK_TO_CLARA_INTRO_EN = `Talk to CLARA is where you can share the real situations behind your spending — habits, stress, goals, routines, emotions, or daily life situations.

I use that context to make future money guidance more personal, not just based on numbers.

Can we proceed to the next part, or do you have a question about that?`;

const TALK_TO_CLARA_INTRO_TL = `Ang Talk to CLARA ay space kung saan puwede mong ikuwento ang totoong sitwasyon sa likod ng spending mo — habits, stress, goals, routines, emotions, o daily life situations.

Ginagamit ko ang context na iyon para mas maging personal ang future money guidance ko, hindi lang based sa numbers.

Pwede na ba tayo mag-proceed sa next part, o may tanong ka muna tungkol dito?`;

const TALK_TO_CLARA_ACKNOWLEDGED_REPLY = "Great 🙂\n\nLet’s start simple — what should I call you?";
const TALK_TO_CLARA_LANGUAGE_REMINDER_REPLY = "Please type \"English\" or \"Tagalog\" first, so I can explain it clearly.";
const TALK_TO_CLARA_PROCEED_REMINDER_REPLY = "Please type \"continue\" if you want to proceed, or ask me any question about this first.";

const EMPTY_TALK_PROFILE = {
  pendingName: "",
  name: "",
  age: "",
  work: "",
  incomePattern: "",
  responsibilities: "",
  moneyPressure: "",
  mainGoal: "",
  spendingTrigger: "",
  routineEnergy: "",
};

const PROFILE_STEP_LABELS = {
  ask_name: "preferred name",
  confirm_name: "name confirmation",
  ask_age: "age",
  ask_work: "work or daily role",
  ask_income_pattern: "income pattern",
  ask_responsibilities: "financial responsibilities",
  ask_money_pressure: "current money pressure",
  ask_main_goal: "main financial goal",
  ask_spending_trigger: "emotional spending trigger",
  ask_routine_energy: "routine or energy pattern",
  complete: "profile starting point complete",
};

const PROFILE_STEP_QUESTIONS = {
  ask_name: "what should I call you?",
  confirm_name: "should I use that name moving forward?",
  ask_age: "how old are you?",
  ask_work: "what kind of work or daily role do you have right now?",
  ask_income_pattern: "is your income usually stable every month, or does it change?",
  ask_responsibilities: "who or what are you financially responsible for right now?",
  ask_money_pressure: "what money pressure are you dealing with most right now?",
  ask_main_goal: "what is your main financial goal right now?",
  ask_spending_trigger: "when stress or emotions hit, what do you usually spend on or feel tempted to spend on?",
  ask_routine_energy: "what part of your routine or energy level affects your spending the most?",
};

const STEP_FIELD_MAP = {
  ask_age: "age",
  ask_work: "work",
  ask_income_pattern: "incomePattern",
  ask_responsibilities: "responsibilities",
  ask_money_pressure: "moneyPressure",
  ask_main_goal: "mainGoal",
  ask_spending_trigger: "spendingTrigger",
  ask_routine_energy: "routineEnergy",
};

const NEXT_PROFILE_STEP = {
  ask_age: "ask_work",
  ask_work: "ask_income_pattern",
  ask_income_pattern: "ask_responsibilities",
  ask_responsibilities: "ask_money_pressure",
  ask_money_pressure: "ask_main_goal",
  ask_main_goal: "ask_spending_trigger",
  ask_spending_trigger: "ask_routine_energy",
  ask_routine_energy: "complete",
};

const PANEL_COPY = {
  talk: {
    label: "Talk to CLARA",
    eyebrow: "TALK TO CLARA",
    heading: "Tell CLARA what’s really happening in your life.",
    body: [
      "Share anything that may affect your spending — habits, routines, goals, pressure, feelings, or daily situations.",
      "When you choose to save it, CLARA can use that context to guide future decisions based on you, not just your numbers.",
    ],
  },
  smart: {
    label: "Smart Actions",
    eyebrow: "SMART ACTIONS",
    heading: "Choose a guided money action.",
    body: [
      "Smart Actions are structured CLARA flows for faster financial decisions.",
      "Use them to check affordability, review spending leaks, plan savings, fix budget pressure, or decide your next best move.",
    ],
  },
  core: {
    label: "Core Features",
    eyebrow: "CORE FEATURES",
    heading: "Your financial system in one place.",
    body: [
      "Core Features are the foundations CLARA uses to understand your money.",
      "Manage wallets, budgets, emergency funds, savings goals, investments, and obligations so CLARA can give better guidance.",
    ],
  },
};

const CORE_FEATURES = [
  { id: "wallets", title: "Wallets", description: "Visible money and wallet pressure.", prompt: "Check my wallet health and tell me what money is safe to use today." },
  { id: "budgets", title: "Budgets", description: "Budget pressure and remaining room.", prompt: "Check my budget health and tell me what is pressured or still safe." },
  { id: "emergency", title: "Emergency Fund", description: "Safety buffer and protection.", prompt: "Check my emergency fund and tell me the next safest step." },
  { id: "savings-goals", title: "Savings Goals", description: "Savings progress and goal protection.", prompt: "Check my savings goals and tell me what spending could slow my goal." },
  { id: "investment", title: "Investment", description: "Growth money and future direction.", prompt: "Check my investment situation and tell me how it should fit my current money priorities." },
  { id: "debt-obligations", title: "Debt/Obligations", description: "Payables, pressure, and commitments.", prompt: "Check my debt and obligations pressure and tell me what I should prioritize next." },
];

const SMART_ACTIONS = [
  { id: "forecast", title: "Future Money Forecast", shortTitle: "Forecast", description: "Predict where your money is heading.", prompt: "Run my Future Money Forecast using income, expenses, budgets, savings, wallets, unplanned spending, and hidden risks.", chips: ["This week", "This month", "Next payday"] },
  { id: "checkup", title: "Spending Checkup", shortTitle: "Checkup", description: "Find spending leaks and patterns.", prompt: "Run my Spending Checkup. Explain my biggest spending leak and what to fix first.", chips: ["Be direct", "Gentle", "Biggest leak"] },
  { id: "savings-plan", title: "Savings Game Plan", shortTitle: "Savings Plan", description: "Reach savings realistically.", prompt: "Create my Savings Game Plan based on my current money, spending, and budget behavior.", chips: ["Safe plan", "Faster plan", "Daily steps"] },
  { id: "emergency-plan", title: "Emergency Fund Builder", shortTitle: "Emergency Fund", description: "Build a practical safety fund.", prompt: "Build my Emergency Fund plan using my expenses, income, savings, and wallet situation.", chips: ["Starter fund", "Full fund", "Monthly target"] },
  { id: "afford", title: "Can I Afford This?", shortTitle: "Afford Check", description: "Check if a purchase is safe.", prompt: "Help me check if I can afford a purchase. Ask for item and amount if needed.", chips: ["₱500", "₱1,000", "₱2,500"] },
  { id: "budget-fixer", title: "Budget Fixer", shortTitle: "Budget Fixer", description: "Improve budget allocation.", prompt: "Run my Budget Fixer and suggest better allocation based on my real spending behavior.", chips: ["Survival", "Savings", "Control"] },
  { id: "risk", title: "Hidden Risk Check", shortTitle: "Risk Check", description: "Find ignored future costs.", prompt: "Run my Hidden Risk Check and find ignored areas that may affect money later.", chips: ["Personal", "Family", "Bills"] },
  { id: "monthly-review", title: "Monthly Money Review", shortTitle: "Monthly Review", description: "Review wins, leaks, and next focus.", prompt: "Run my Monthly Money Review. Summarize what went well, what hurt my budget, biggest risk, and next focus.", chips: ["Quick", "Deep", "Next focus"] },
  { id: "next-move", title: "Next Best Move", shortTitle: "Next Move", description: "One clear action for today.", prompt: "Give me my Next Best Move based on my current money situation.", chips: ["Spending", "Saving", "Budgeting"] },
];

function pickRandomItem(items = []) {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

function pickDefaultGreeting() {
  return pickRandomItem(DEFAULT_CLARA_GREETINGS);
}

function pickChatInputPlaceholder() {
  return pickRandomItem(CHAT_INPUT_PLACEHOLDERS);
}

function normalizeChoice(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEnglishChoice(choice = "") {
  return ["english", "eng", "en"].includes(choice);
}

function isTagalogChoice(choice = "") {
  return ["tagalog", "tl", "filipino", "taglish"].includes(choice);
}

function isProceedChoice(choice = "") {
  return ["yes", "y", "yeah", "yep", "continue", "proceed", "next", "go", "go ahead", "oo", "opo", "sige", "okay", "ok"].includes(choice);
}

function isNoChoice(choice = "") {
  return ["no", "nope", "nah", "not", "hindi", "di", "hinde"].includes(choice);
}

function isSkipChoice(choice = "") {
  return ["skip", "pass", "later", "not now", "next", "i dont know", "idk"].includes(choice);
}

function isQuestionLike(value = "") {
  const raw = String(value || "").trim();
  const text = normalizeChoice(raw);
  if (raw.includes("?")) return true;
  return /^(why|how|what|where|when|can|could|should|would|do|does|is|are|will|may)\b/i.test(text);
}

function looksLikeUrgentIssue(value = "") {
  const text = normalizeChoice(value);
  return (
    text.includes("can i buy") ||
    text.includes("should i buy") ||
    text.includes("i want to buy") ||
    text.includes("i bought") ||
    text.includes("stress") ||
    text.includes("stressed") ||
    text.includes("problem") ||
    text.includes("issue") ||
    text.includes("debt") ||
    text.includes("overspend") ||
    text.includes("overspending") ||
    text.includes("worried") ||
    text.includes("pressure")
  );
}

function titleCaseName(value = "") {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractLikelyName(value = "") {
  const raw = String(value || "").trim();
  const choice = normalizeChoice(raw);
  if (!raw || isProceedChoice(choice) || isSkipChoice(choice) || isNoChoice(choice) || isQuestionLike(raw)) return "";

  const cleaned = raw
    .replace(/^(my name is|i am|i'm|im|call me|you can call me|it is|it's|its)\s+/i, "")
    .replace(/[^a-zA-ZÀ-ÿ\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.split(/\s+/).length > 3 || cleaned.length > 32) return "";
  return titleCaseName(cleaned);
}

function extractAge(value = "") {
  const match = String(value || "").match(/\b(1[3-9]|[2-9][0-9]|10[0-9]|110)\b/);
  return match ? match[1] : "";
}

function profileDisplayName(profile = {}) {
  return profile.name || profile.pendingName || "there";
}

function getMissingProfileFields(profile = {}) {
  const fields = [
    ["age", "age"],
    ["work", "work or daily role"],
    ["incomePattern", "income pattern"],
    ["responsibilities", "financial responsibilities"],
    ["moneyPressure", "current money pressure"],
    ["mainGoal", "main financial goal"],
    ["spendingTrigger", "emotional spending trigger"],
    ["routineEnergy", "routine or energy pattern"],
  ];
  return fields.filter(([key]) => !String(profile[key] || "").trim()).map(([, label]) => label);
}

function buildTalkIntroQuestionPrompt(userText = "") {
  return `The user is still in the short Talk to CLARA introduction.

User question or response:
${String(userText || "").trim()}

Answer the user's question naturally as CLARA.
Use clean mobile chat formatting: short paragraphs, blank lines between different thoughts, and simple bullets only if they make the answer clearer.
Keep it brief, warm, and practical.
Do not restart the full explanation.
End by asking: "Can we proceed to the next part, or do you have another question?"`;
}

function buildProfileSetupQuestionPrompt(userText = "", profileStep = "ask_name", profile = {}) {
  const currentQuestion = PROFILE_STEP_QUESTIONS[profileStep] || "what should I understand next?";
  const knownName = profileDisplayName(profile);

  return `The user is in Talk to CLARA's profile setup.

Current setup step: ${profileStep}
Current question CLARA was asking: ${currentQuestion}
Known temporary profile so far: ${JSON.stringify(profile)}
Missing context still needed later: ${getMissingProfileFields(profile).join(", ") || "none"}

User message:
${String(userText || "").trim()}

If the user is asking a question about CLARA, privacy, why the information matters, or how this feature works, answer naturally in 1-3 short mobile-friendly paragraphs.
If the user is raising a real money or life issue, help with that issue first and do not force the profile setup.
Do not claim anything is permanently saved.
End gently by returning to the current setup question when appropriate, for example: "After that, we can continue — ${knownName !== "there" ? knownName + ", " : ""}${currentQuestion}"`;
}

function buildHybridProfileFollowupPrompt({ userText = "", completedStep = "", nextStep = "", profile = {} }) {
  const completedLabel = PROFILE_STEP_LABELS[completedStep] || completedStep;
  const nextLabel = PROFILE_STEP_LABELS[nextStep] || nextStep;
  const nextQuestion = PROFILE_STEP_QUESTIONS[nextStep] || "what should I understand next?";
  const name = profileDisplayName(profile);

  return `The user is not in a generic chatbot flow. They are in CLARA's Talk to CLARA profile-building conversation.

The static layer already captured this answer for: ${completedLabel}
User answer: ${String(userText || "").trim()}
Temporary profile so far: ${JSON.stringify(profile)}
Next missing profile focus: ${nextLabel}
Exact next information CLARA still needs: ${nextQuestion}
Other missing context later: ${getMissingProfileFields(profile).join(", ") || "none"}

Your job:
- Do NOT act like a form.
- Acknowledge the user's answer with human context.
- If the answer implies something meaningful, briefly reflect it. Example: if the user says BPO agent, notice possible shifting schedule, work exhaustion, call pressure, or stress spending — without assuming too much.
- Then ask exactly ONE follow-up question that collects the next missing profile focus.
- The question must still be easy to answer.
- If the user raised a real urgent money/life issue, pause onboarding and help that issue first.
- Do not claim anything is permanently saved.
- Keep it to 1-3 short mobile-friendly paragraphs.

Address the user as ${name !== "there" ? name : "the user"} when natural.`;
}

function buildTalkToClaraPrompt(userText = "") {
  return `Talk to CLARA context mode is active.

Actual user message:
${String(userText || "").trim()}

How CLARA should respond:
- First understand what happened in the message: reply to a previous question, current money issue, life update, or request for advice.
- Acknowledge warmly and naturally.
- Use clean mobile chat formatting: short paragraphs, blank lines between different thoughts, and simple bullets only if they improve clarity.
- Do not show or mention buttons, chips, options, workflows, modes, or categories.
- Do not reply with only "How can I help you today?"
- If the user shares a real issue, help with that issue first.
- Ask only one gentle question at a time.
- Keep the tone respectful, calm, and practical.
- Do not claim information was permanently saved. You may say CLARA can use it as context in this conversation, or that it can help future guidance when the user chooses to save it.

Reply as CLARA in a clean, easy-to-read chat format.`;
}

function handleHybridProfileStep({ text = "", step = "idle", profile = EMPTY_TALK_PROFILE }) {
  const choice = normalizeChoice(text);
  const currentStep = step === "idle" ? "ask_name" : step;

  if (looksLikeUrgentIssue(text) || (isQuestionLike(text) && currentStep !== "ask_name")) {
    return { useAi: true, aiPrompt: buildProfileSetupQuestionPrompt(text, currentStep, profile), profile, nextStep: currentStep };
  }

  if (currentStep === "ask_name") {
    const extractedName = extractLikelyName(text);
    if (!extractedName) {
      return { reply: "No rush.\n\nWhat should I call you?", profile, nextStep: "ask_name" };
    }

    return {
      reply: `Nice to meet you, ${extractedName} 🙂\n\nShould I call you ${extractedName} moving forward?`,
      profile: { ...profile, pendingName: extractedName },
      nextStep: "confirm_name",
    };
  }

  if (currentStep === "confirm_name") {
    if (isProceedChoice(choice)) {
      const confirmedName = profile.pendingName || profile.name || "there";
      return {
        reply: `Perfect, ${confirmedName}.\n\nLet’s continue slowly — how old are you?`,
        profile: { ...profile, name: confirmedName },
        nextStep: "ask_age",
      };
    }

    if (isNoChoice(choice)) {
      return { reply: "Got it.\n\nWhat name would you prefer me to use?", profile: { ...profile, pendingName: "" }, nextStep: "ask_name" };
    }

    const newName = extractLikelyName(text);
    if (newName) {
      return { reply: `Okay, ${newName} 🙂\n\nShould I call you ${newName} moving forward?`, profile: { ...profile, pendingName: newName }, nextStep: "confirm_name" };
    }

    return { reply: `Just to confirm — should I call you ${profile.pendingName || profile.name || "that"} moving forward?`, profile, nextStep: "confirm_name" };
  }

  if (currentStep === "ask_age") {
    if (isSkipChoice(choice)) {
      const nextProfile = { ...profile, age: "skipped" };
      return {
        useAi: true,
        aiPrompt: buildHybridProfileFollowupPrompt({ userText: text, completedStep: "ask_age", nextStep: "ask_work", profile: nextProfile }),
        profile: nextProfile,
        nextStep: "ask_work",
      };
    }

    const age = extractAge(text);
    if (!age) {
      return { reply: "Got it.\n\nYou can tell me your age as a number, or type \"skip\" if you prefer not to answer yet.", profile, nextStep: "ask_age" };
    }

    const nextProfile = { ...profile, age };
    return {
      useAi: true,
      aiPrompt: buildHybridProfileFollowupPrompt({ userText: text, completedStep: "ask_age", nextStep: "ask_work", profile: nextProfile }),
      profile: nextProfile,
      nextStep: "ask_work",
    };
  }

  const fieldKey = STEP_FIELD_MAP[currentStep];
  const nextStep = NEXT_PROFILE_STEP[currentStep] || "complete";

  if (fieldKey) {
    if (isProceedChoice(choice)) {
      return {
        reply: `Before we continue, I still need this part.\n\n${PROFILE_STEP_QUESTIONS[currentStep]}`,
        profile,
        nextStep: currentStep,
      };
    }

    if (isSkipChoice(choice)) {
      const nextProfile = { ...profile, [fieldKey]: "skipped" };
      return {
        useAi: nextStep !== "complete",
        aiPrompt: nextStep !== "complete" ? buildHybridProfileFollowupPrompt({ userText: text, completedStep: currentStep, nextStep, profile: nextProfile }) : "",
        reply: nextStep === "complete" ? buildProfileCompleteReply(nextProfile) : "",
        profile: nextProfile,
        nextStep,
      };
    }

    const nextProfile = { ...profile, [fieldKey]: text.trim() };
    return {
      useAi: nextStep !== "complete",
      aiPrompt: nextStep !== "complete" ? buildHybridProfileFollowupPrompt({ userText: text, completedStep: currentStep, nextStep, profile: nextProfile }) : "",
      reply: nextStep === "complete" ? buildProfileCompleteReply(nextProfile) : "",
      profile: nextProfile,
      nextStep,
    };
  }

  return { reply: "I’m ready.\n\nTell me what’s happening today, or ask about a money decision before you act.", profile, nextStep: "complete" };
}

function buildProfileCompleteReply(profile = {}) {
  const name = profileDisplayName(profile);
  return `Thanks, ${name}.\n\nThis gives me a starting picture of you — not just your money.\n\nFrom here, you can tell me about your day, a spending concern, or a purchase before you act.`;
}

function makeMessage(role, text, meta = {}) {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, ...meta };
}

function clean(text = "") {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "• ")
    .replace(/[ \t]+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeNaturalChatReply(text = "") {
  return clean(text)
    .replace(/\b(Money Signal|Spending Signal|Next Move|Risk|Budget|Wallet|Savings|Emergency Fund|Question|CLARA says|Money Note|Smart Action):\s*/gi, "")
    .replace(/[ \t]*\|[ \t]*/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hiddenMessage(message = {}) {
  const text = String(message.text || "").toLowerCase();
  return text.includes("what are you thinking of buying") || text.includes("setting up the right clara check") || text.includes("wiring each action");
}

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null;
}

function fallbackReply(prompt, context) {
  const direct = buildContextualFinanceReply(prompt, context);
  if (direct) return direct;

  const snapshot = buildClaraFinanceSnapshot(context || {});
  const local = normalizeNaturalChatReply(generateClaraLocalReply(prompt, context));

  if (local && !local.includes("I can help with money decisions") && !local.includes("What do you want to check?")) return local;

  const available = formatMoney(snapshot.availableMoney);
  const spent = formatMoney(snapshot.monthlySpent);

  if (!snapshot.hasAnyData) return "I need a little more finance data first.\n\nAdd your wallet, expenses, budget, savings, or emergency fund, then I can guide you better.";
  if (available && spent) return `You have ${available} visible money right now, and your spending shows ${spent}.\n\nKeep the next decision planned, necessary, and aligned with your current money pressure.`;
  if (available) return `You have ${available} visible money right now.\n\nKeep your next spending decision planned and aligned with your current budget.`;

  return "I can read your loaded finance context now.\n\nKeep the next decision planned, necessary, and aligned with your current money pressure.";
}

function getFallbackReplyForAction(prompt, context, action) {
  if (action?.id === "talk_to_clara_context") {
    if (prompt.includes("Next missing profile focus")) {
      const match = prompt.match(/Exact next information CLARA still needs: (.+)/);
      return `That helps me understand you better.\n\n${match?.[1] || "What should I understand next?"}`;
    }

    return "Good question. This space helps me understand the story behind your spending, not only the numbers.\n\nCan we proceed to the next part, or do you have another question?";
  }

  return fallbackReply(prompt, context);
}

function MessageText({ text }) {
  const reply = normalizeNaturalChatReply(text);
  const blocks = reply.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-3 text-[13px] leading-[1.65] text-slate-100/90">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const isBulletList = lines.length > 1 && lines.every((line) => line.startsWith("• "));

        if (isBulletList) {
          return (
            <ul key={`${block}-${index}`} className="list-disc space-y-1 pl-4">
              {lines.map((line) => <li key={line}>{line.replace(/^•\s*/, "")}</li>)}
            </ul>
          );
        }

        return <p key={`${block}-${index}`} className="whitespace-pre-wrap">{block}</p>;
      })}
    </div>
  );
}

function Insight({ text, source }) {
  return (
    <div className="space-y-2.5">
      {SHOW_DEBUG_SOURCE ? (
        <div className="inline-flex rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
          Source: {source === "gemini" ? "Gemini" : source === "local_context" ? "Local context" : source === "local_finance" ? "Local finance" : "Local fallback"}
        </div>
      ) : null}

      <MessageText text={text} />
    </div>
  );
}

function PanelButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/25 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[0.055] text-white/60 hover:bg-white/[0.08]"}`}>
      {children}
    </button>
  );
}

function OptionCard({ item, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="group min-h-[82px] rounded-[22px] border border-white/10 bg-white/[0.055] p-3 text-left shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-white/[0.085] active:scale-[0.98] disabled:opacity-45">
      <p className="text-[12px] font-black leading-tight text-white group-active:text-emerald-100">{item.shortTitle || item.title}</p>
      <p className="mt-1.5 line-clamp-3 text-[10.5px] leading-4 text-slate-300/66">{item.description}</p>
    </button>
  );
}

function PanelInstructionBoard({ panel, greeting, onClose }) {
  const copy = panel ? PANEL_COPY[panel] : greeting;

  return (
    <div className="relative rounded-[30px] border border-white/10 bg-white/[0.045] px-5 pb-5 pt-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
        <X className="h-4 w-4" />
      </button>
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">{copy.eyebrow}</p>
      <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">{copy.heading}</h3>
      <div className="mx-auto mt-3 max-w-[300px] space-y-2 text-sm leading-6 text-slate-300/75">
        {copy.body.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}

function FloatingCloseButton({ onClose }) {
  return (
    <button type="button" onClick={onClose} className="absolute right-4 top-[max(env(safe-area-inset-top),18px)] z-10 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
      <X className="h-4 w-4" />
    </button>
  );
}

export default function ClaraAiEnvironmentOverlay({ isActive = false, messages = [], claraAssistantContext = {}, onClose }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [panel, setPanel] = useState(null);
  const [greeting, setGreeting] = useState(() => pickDefaultGreeting());
  const [chatInputPlaceholder, setChatInputPlaceholder] = useState(() => pickChatInputPlaceholder());
  const [talkIntroState, setTalkIntroState] = useState("not_shown");
  const [talkProfileStep, setTalkProfileStep] = useState("idle");
  const [talkProfile, setTalkProfile] = useState(EMPTY_TALK_PROFILE);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(() => {
    const externalMessages = Array.isArray(messages) ? messages : [];
    return [...externalMessages, ...localMessages].filter((message) => !hiddenMessage(message));
  }, [messages, localMessages]);

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setLocalMessages([]);
      setIsThinking(false);
      setPanel(null);
      setTalkIntroState("not_shown");
      setTalkProfileStep("idle");
      setTalkProfile(EMPTY_TALK_PROFILE);
      return undefined;
    }

    setPanel(null);
    setTalkIntroState("not_shown");
    setTalkProfileStep("idle");
    setTalkProfile(EMPTY_TALK_PROFILE);
    setGreeting(pickDefaultGreeting());
    setChatInputPlaceholder(pickChatInputPlaceholder());
    setLocalMessages((current) => current.filter((message) => !hiddenMessage(message)));
    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 180);
    return () => window.clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  useEffect(() => {
    if (isActive) messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [isActive, visibleMessages.length, isThinking]);

  if (!isActive) return null;

  const pushLocalClaraReply = ({ userText, reply, action = null, source = "local_context" }) => {
    setLocalMessages((current) => [
      ...current.filter((message) => !hiddenMessage(message)),
      makeMessage("user", userText),
      makeMessage("clara", reply, {
        source,
        ...(action ? { smartAction: action } : {})
      })
    ]);
  };

  const runClara = async ({ prompt, displayText = prompt, action = null }) => {
    const cleanPrompt = String(prompt || "").trim();
    const cleanDisplay = String(displayText || cleanPrompt).trim();

    if (!cleanPrompt || isThinking) return;

    const pending = makeMessage("clara", "Thinking...", { source: "system" });
    setIsThinking(true);

    setLocalMessages((current) => [
      ...current.filter((message) => !hiddenMessage(message)),
      makeMessage("user", cleanDisplay),
      pending
    ]);

    try {
      let reply = "";
      let source = "local_fallback";
      const directFinanceReply = action?.id === "talk_to_clara_context" ? "" : buildContextualFinanceReply(cleanPrompt, claraAssistantContext);

      if (directFinanceReply) {
        reply = directFinanceReply;
        source = "local_finance";
      } else if (hasGeminiConfig()) {
        try {
          reply = await generateClaraGeminiReply({
            message: `${cleanPrompt}\n\n${PRESENTATION_RULES}`,
            context: claraAssistantContext,
            mode: action?.id || "ai_environment",
            conversationHistory: [...visibleMessages, makeMessage("user", cleanDisplay)],
          });
          source = "gemini";
        } catch (error) {
          console.warn("[CLARA AI] Gemini failed, using local fallback", {
            message: error?.message,
            status: error?.status,
            payload: error?.payload,
          });
          reply = getFallbackReplyForAction(cleanPrompt, claraAssistantContext, action);
          source = action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback";
        }
      } else {
        console.warn("[CLARA AI] Gemini configuration missing, using local fallback");
        reply = getFallbackReplyForAction(cleanPrompt, claraAssistantContext, action);
        source = action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback";
      }

      setLocalMessages((current) => current.map((message) => {
        if (message.id !== pending.id) return message;
        return {
          ...message,
          text: normalizeNaturalChatReply(reply),
          source,
          ...(action ? { smartAction: action } : {})
        };
      }));
    } catch (error) {
      console.error("[CLARA AI] Fatal assistant modal error", error);

      setLocalMessages((current) => current.map((message) => {
        if (message.id !== pending.id) return message;
        return {
          ...message,
          text: getFallbackReplyForAction(cleanPrompt, claraAssistantContext, action),
          source: action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback",
          ...(action ? { smartAction: action } : {})
        };
      }));
    } finally {
      setIsThinking(false);
    }
  };

  const submitDraft = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const isTalkToClaraMode = panel === "talk";

    if (isTalkToClaraMode && talkIntroState !== "confirmed") {
      const choice = normalizeChoice(text);
      let reply = TALK_TO_CLARA_LANGUAGE_PROMPT;
      let nextState = "awaiting_language";
      let nextProfileStep = talkProfileStep;

      if (talkIntroState === "awaiting_language") {
        if (isEnglishChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_EN;
          nextState = "awaiting_continue_or_question";
        } else if (isTagalogChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_TL;
          nextState = "awaiting_continue_or_question";
        } else {
          reply = TALK_TO_CLARA_LANGUAGE_REMINDER_REPLY;
        }
      } else if (talkIntroState === "awaiting_continue_or_question") {
        if (isProceedChoice(choice)) {
          reply = TALK_TO_CLARA_ACKNOWLEDGED_REPLY;
          nextState = "confirmed";
          nextProfileStep = "ask_name";
        } else if (isEnglishChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_EN;
          nextState = "awaiting_continue_or_question";
        } else if (isTagalogChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_TL;
          nextState = "awaiting_continue_or_question";
        } else if (choice.length < 2) {
          reply = TALK_TO_CLARA_PROCEED_REMINDER_REPLY;
        } else {
          runClara({ prompt: buildTalkIntroQuestionPrompt(text), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION });
          setDraft("");
          return;
        }
      }

      pushLocalClaraReply({ userText: text, reply, action: TALK_TO_CLARA_CONTEXT_ACTION });
      setTalkIntroState(nextState);
      setTalkProfileStep(nextProfileStep);
      setDraft("");
      return;
    }

    if (isTalkToClaraMode && talkProfileStep !== "complete") {
      const profileResult = handleHybridProfileStep({
        text,
        step: talkProfileStep === "idle" ? "ask_name" : talkProfileStep,
        profile: talkProfile,
      });

      setTalkProfile(profileResult.profile || talkProfile);
      setTalkProfileStep(profileResult.nextStep || talkProfileStep);

      if (profileResult.useAi) {
        runClara({
          prompt: profileResult.aiPrompt || buildProfileSetupQuestionPrompt(text, talkProfileStep, profileResult.profile || talkProfile),
          displayText: text,
          action: TALK_TO_CLARA_CONTEXT_ACTION,
        });
        setDraft("");
        return;
      }

      pushLocalClaraReply({ userText: text, reply: profileResult.reply, action: TALK_TO_CLARA_CONTEXT_ACTION });
      setDraft("");
      return;
    }

    runClara({
      prompt: isTalkToClaraMode ? buildTalkToClaraPrompt(text) : text,
      displayText: text,
      action: isTalkToClaraMode ? TALK_TO_CLARA_CONTEXT_ACTION : null,
    });
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />
      {visibleMessages.length ? <FloatingCloseButton onClose={onClose} /> : null}

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-end gap-3 pb-2 pt-12">
            {visibleMessages.map((message) => {
              const isUser = message.role === "user";
              const action = message.smartAction;
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-3.5 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.16)] ${isUser ? "max-w-[88%] rounded-[24px] bg-emerald-300 text-slate-950" : "max-w-[88%] rounded-[24px] bg-white/[0.075] text-white/86 backdrop-blur-xl"}`}>
                    {isUser ? clean(message.text) : <Insight text={message.text} source={message.source} />}
                    {action && !isUser && action.chips?.length ? (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <p className="text-[12px] leading-5 text-emerald-100/85">What should we narrow down next?</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {action.chips.map((chip) => <button key={chip} type="button" disabled={isThinking} onClick={() => runClara({ prompt: `${action.prompt}\nUser selected: ${chip}`, displayText: chip, action })} className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 active:scale-95 disabled:opacity-45">{chip}</button>)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-center gap-4 pb-2">
            <PanelInstructionBoard panel={panel} greeting={greeting} onClose={onClose} />

            <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <div className="grid grid-cols-3 gap-2">
                <PanelButton active={panel === "talk"} onClick={() => { setPanel("talk"); setTalkIntroState("not_shown"); setTalkProfileStep("idle"); setTalkProfile(EMPTY_TALK_PROFILE); setChatInputPlaceholder(pickChatInputPlaceholder()); }}>Talk to CLARA</PanelButton>
                <PanelButton active={panel === "core"} onClick={() => setPanel("core")}>Core Features</PanelButton>
                <PanelButton active={panel === "smart"} onClick={() => setPanel("smart")}>Smart Actions</PanelButton>
              </div>

              {panel === "smart" ? <div className="mt-3 grid grid-cols-2 gap-2">{SMART_ACTIONS.map((action) => <OptionCard key={action.id} item={action} disabled={isThinking} onClick={() => runClara({ prompt: action.prompt, displayText: action.title, action })} />)}</div> : null}
              {panel === "core" ? <div className="mt-3 grid grid-cols-2 gap-2">{CORE_FEATURES.map((feature) => <OptionCard key={feature.id} item={feature} disabled={isThinking} onClick={() => runClara({ prompt: feature.prompt, displayText: feature.title, action: { ...feature, chips: ["Can I buy this?", "Next move", "Check risk"] } })} />)}</div> : null}
            </div>
          </div>
        )}
      </main>

      <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70" placeholder={panel === "talk" ? chatInputPlaceholder : DEFAULT_CHAT_INPUT_PLACEHOLDER} inputMode="text" />
          <button type="submit" disabled={!draft.trim() || isThinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95" aria-label="Send to CLARA"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
