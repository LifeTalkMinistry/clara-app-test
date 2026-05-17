import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { buildClaraFinanceSnapshot, generateClaraLocalReply } from "@/lib/clara-local-brain";
import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { buildContextualFinanceReply } from "@/lib/clara-direct-finance-reply";

const CLARA_AI_BRAIN_VERSION = "connected-brain-v19-guided-choice-buttons";
const PRESENTATION_RULES = "Reply like a natural mobile chat message. Plain text only. Use short readable paragraphs separated by blank lines. Keep it warm, practical, and easy to read. Ask only one question at the end when a question is needed.";
const SHOW_DEBUG_SOURCE = import.meta.env.DEV || import.meta.env.VITE_CLARA_DEBUG_AI === "true";
const DEFAULT_CHAT_INPUT_PLACEHOLDER = "Ask CLARA or enter item + price";
const TALK_TO_CLARA_CONTEXT_ACTION = { id: "talk_to_clara_context", title: "Talk to CLARA", shortTitle: "Talk to CLARA", prompt: "Continue the Talk to CLARA conversation naturally.", chips: [] };

const DEFAULT_CLARA_GREETINGS = [
  { eyebrow: "ASK BEFORE YOU SPEND", heading: "Hi, any spending concern today?", body: ["Tell CLARA what you are thinking of buying, changing, or checking before you act.", "You can also choose a guided path below if you want more structure."] },
  { eyebrow: "CLARA IS READY", heading: "What money situation are we figuring out?", body: ["Start with what is on your mind: a purchase, a budget concern, a savings goal, or a money pressure today.", "CLARA can talk naturally or guide you through a specific action when you choose one."] },
  { eyebrow: "MONEY CHECK-IN", heading: "Need help thinking through a decision?", body: ["You can ask freely, or select Smart Actions and Core Features when you need a more guided check.", "No rush. CLARA is here to help you pause before spending."] },
];

const CHAT_INPUT_PLACEHOLDERS = ["Tell CLARA what’s happening today...", "Share what’s affecting your spending...", "Tell CLARA about your current situation...", "Share a habit, feeling, or concern...", "What should CLARA understand about you?"];
const TALK_TO_CLARA_LANGUAGE_PROMPT = `Hi 👩 I’m CLARA.

Before we continue, I want to quickly explain what this space is for.

Would you like me to explain it in English or Tagalog?`;
const TALK_TO_CLARA_INTRO_EN = `Talk to CLARA is where you can share the real situations behind your spending — habits, stress, goals, routines, emotions, or daily life situations.

I use that context to make future money guidance more personal, not just based on numbers.`;
const TALK_TO_CLARA_INTRO_TL = `Ang Talk to CLARA ay space kung saan puwede mong ikuwento ang totoong sitwasyon sa likod ng spending mo — habits, stress, goals, routines, emotions, o daily life situations.

Ginagamit ko ang context na iyon para mas maging personal ang future money guidance ko, hindi lang based sa numbers.`;
const PANEL_COPY = {
  talk: { label: "Talk to CLARA", eyebrow: "TALK TO CLARA", heading: "Tell CLARA what’s really happening in your life.", body: ["Share anything that may affect your spending — habits, routines, goals, pressure, feelings, or daily situations.", "When you choose to save it, CLARA can use that context to guide future decisions based on you, not just your numbers."] },
  smart: { label: "Smart Actions", eyebrow: "SMART ACTIONS", heading: "Choose a guided money action.", body: ["Smart Actions are structured CLARA flows for faster financial decisions.", "Use them to check affordability, review spending leaks, plan savings, fix budget pressure, or decide your next best move."] },
  core: { label: "Core Features", eyebrow: "CORE FEATURES", heading: "Your financial system in one place.", body: ["Core Features are the foundations CLARA uses to understand your money.", "Manage wallets, budgets, emergency funds, savings goals, investments, and obligations so CLARA can give better guidance."] },
};
const CORE_FEATURES = [
  { id: "wallets", title: "Wallets", description: "Visible money and wallet pressure.", prompt: "Check my wallet health and tell me what money is safe to use today." },
  { id: "budgets", title: "Budgets", description: "Budget pressure and remaining room.", prompt: "Check my budget health and tell me what is pressured or still safe." },
  { id: "emergency", title: "Emergency Fund", description: "Safety buffer and protection.", prompt: "Check my emergency fund and tell me the next safest step." },
  { id: "savings-goals", title: "Savings Goals", description: "Savings progress and goal protection.", prompt: "Check my savings goals and tell me what spending could slow my goal." },
  { id: "investment", title: "Investment", description: "Growth money and future direction.", prompt: "Check my investment situation and tell me how it should fit my current money priorities." },
  { id: "debt-obligations", title: "Debt/Obligations", description: "Payables and commitments.", prompt: "Check my debt and obligations pressure and tell me what I should prioritize next." },
];
const SMART_ACTIONS = [
  { id: "forecast", title: "Future Money Forecast", shortTitle: "Forecast", description: "Predict where your money is heading.", prompt: "Run my Future Money Forecast using income, expenses, budgets, savings, wallets, unplanned spending, and hidden risks.", chips: ["This week", "This month", "Next payday"] },
  { id: "checkup", title: "Spending Checkup", shortTitle: "Checkup", description: "Find spending leaks and patterns.", prompt: "Run my Spending Checkup. Explain my biggest spending leak and what to fix first.", chips: ["Be direct", "Gentle", "Biggest leak"] },
  { id: "savings-plan", title: "Savings Game Plan", shortTitle: "Savings Plan", description: "Reach savings realistically.", prompt: "Create my Savings Game Plan based on my current money, spending, and budget behavior.", chips: ["Safe plan", "Faster plan", "Daily steps"] },
  { id: "afford", title: "Can I Afford This?", shortTitle: "Afford Check", description: "Check if a purchase is safe.", prompt: "Help me check if I can afford a purchase. Ask for item and amount if needed.", chips: ["₱500", "₱1,000", "₱2,500"] },
  { id: "budget-fixer", title: "Budget Fixer", shortTitle: "Budget Fixer", description: "Improve budget allocation.", prompt: "Run my Budget Fixer and suggest better allocation based on my real spending behavior.", chips: ["Survival", "Savings", "Control"] },
  { id: "next-move", title: "Next Best Move", shortTitle: "Next Move", description: "One clear action for today.", prompt: "Give me my Next Best Move based on my current money situation.", chips: ["Spending", "Saving", "Budgeting"] },
];
const PROFILE_STEPS = [
  { id: "incomePattern", question: "How does your income usually come in?", choices: ["Stable monthly", "Every cutoff", "Changing", "Extra work", "Not sure"] },
  { id: "livingSituation", question: "What is your living situation right now?", choices: ["Alone", "With family", "With partner", "Other", "Skip"] },
  { id: "responsibilities", question: "Who or what are you financially responsible for right now?", choices: ["Family", "Rent/Bills", "Food", "Debt", "None"] },
  { id: "workType", question: "Does your work schedule or energy affect your spending?", choices: ["Yes, a lot", "Sometimes", "Not really", "Not sure for now"] },
  { id: "relationshipStatus", question: "Is there any personal situation affecting your emotions or spending lately?", choices: ["Yes", "Not really", "Not sure", "Skip"] },
  { id: "currentFinancialPressure", question: "What money pressure do you feel the most right now?", choices: ["Monthly bills", "Rent", "Food", "Debt", "No major pressure"] },
  { id: "survivalPressureLevel", question: "How heavy does that money pressure feel right now?", choices: ["Light", "Manageable", "Tight", "Really heavy"] },
  { id: "mainFinancialGoal", question: "What is your main financial goal right now?", choices: ["Emergency fund", "Save more", "Pay debt", "Control spending", "Not sure"] },
  { id: "emotionalStateTrend", question: "How have you been feeling lately around money decisions?", choices: ["Confident", "Slight leak", "Stressed", "Tempted", "Okay"] },
  { id: "spendingTriggers", question: "What usually triggers unplanned spending for you?", choices: ["Stress", "Reward", "Boredom", "Friends/social", "Not sure"] },
  { id: "rewardSystem", question: "How do you usually reward yourself after a hard day?", choices: ["Food/drinks", "Shopping", "Entertainment", "Rest", "Not sure"] },
  { id: "spendingWeakness", question: "What feels like your biggest spending weakness right now?", choices: ["Food", "Online shopping", "Small leaks", "Impulse buys", "Not sure"] },
  { id: "routine", question: "What does your usual routine look like?", choices: ["Day shift", "Night shift", "Mixed schedule", "Flexible", "Skip"] },
  { id: "supportSystem", question: "How do people around you affect your spending?", choices: ["They help", "They pressure me", "No effect", "Not sure"] },
  { id: "hobbies", question: "What gives you fulfillment without overspending?", choices: ["Music", "Sports", "Content creation", "Rest", "Still finding it"] },
  { id: "wallets", question: "What money source do you usually use?", choices: ["Cash", "GCash", "Maya", "Bank", "Multiple"] },
  { id: "budgeting", question: "How do you currently budget your money?", choices: ["Strict budget", "Rough plan", "I track only", "Not yet"] },
  { id: "recurringExpenses", question: "What recurring expense hits you most every month?", choices: ["Rent", "Bills", "Food", "Debt", "None"] },
];

function pickRandomItem(items = []) { return items[Math.floor(Math.random() * items.length)] || items[0]; }
function normalizeChoice(value = "") { return String(value || "").toLowerCase().replace(/[“”"'`]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function isProceedChoice(choice = "") { return ["yes", "y", "yeah", "yep", "sure", "continue", "proceed", "next", "go", "go ahead", "oo", "opo", "sige", "okay", "ok"].includes(normalizeChoice(choice)); }
function isNoChoice(choice = "") { return ["no", "nope", "nah", "not", "hindi", "di", "hinde", "change name"].includes(normalizeChoice(choice)); }
function isEnglishChoice(choice = "") { return ["english", "eng", "en"].includes(normalizeChoice(choice)); }
function isTagalogChoice(choice = "") { return ["tagalog", "tl", "filipino", "taglish"].includes(normalizeChoice(choice)); }
function isQuestionLike(value = "") { const raw = String(value || "").trim(); const text = normalizeChoice(raw); return raw.includes("?") || /^(why|how|what|where|when|can|could|should|would|do|does|is|are|will|may)\b/i.test(text); }
function looksLikeUrgentIssue(value = "") { const text = normalizeChoice(value); return ["can i buy", "should i buy", "i want to buy", "i bought", "stress", "problem", "issue", "debt", "overspend", "worried", "pressure", "emergency", "kulang"].some((phrase) => text.includes(phrase)); }
function extractLikelyName(value = "") { const raw = String(value || "").trim(); const choice = normalizeChoice(raw); if (!raw || isProceedChoice(choice) || isNoChoice(choice) || isQuestionLike(raw)) return ""; const cleaned = raw.replace(/^(my name is|i am|i'm|im|call me|you can call me|it is|it's|its)\s+/i, "").replace(/[^a-zA-ZÀ-ÿ\s.-]/g, " ").replace(/\s+/g, " ").trim(); return cleaned && cleaned.split(/\s+/).length <= 3 && cleaned.length <= 32 ? cleaned.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ") : ""; }
function makeMessage(role, text, meta = {}) { return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, ...meta }; }
function clean(text = "") { return String(text || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^\s*[-•]\s+/gm, "• ").replace(/[ \t]+([,.!?])/g, "$1").replace(/[ \t]{2,}/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim(); }
function normalizeNaturalChatReply(text = "") { return clean(text).replace(/\b(Money Signal|Spending Signal|Next Move|Risk|Budget|Wallet|Savings|Emergency Fund|Question|CLARA says|Money Note|Smart Action):\s*/gi, "").replace(/[ \t]*\|[ \t]*/g, "\n\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
function hiddenMessage(message = {}) { const text = String(message.text || "").toLowerCase(); return text.includes("what are you thinking of buying") || text.includes("setting up the right clara check") || text.includes("wiring each action"); }
function formatMoney(value) { const number = Number(value); return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null; }
function fallbackReply(prompt, context) { const direct = buildContextualFinanceReply(prompt, context); if (direct) return direct; const snapshot = buildClaraFinanceSnapshot(context || {}); const local = normalizeNaturalChatReply(generateClaraLocalReply(prompt, context)); if (local && !local.includes("I can help with money decisions") && !local.includes("What do you want to check?")) return local; const available = formatMoney(snapshot.availableMoney); return available ? `You have ${available} visible money right now.\n\nKeep your next spending decision planned and aligned with your current budget.` : "I can read your loaded finance context now.\n\nKeep the next decision planned, necessary, and aligned with your current money pressure."; }
function buildTalkIntroQuestionPrompt(text = "") { return `The user is still in the short Talk to CLARA introduction. User said: ${text}\n\nAnswer briefly and naturally. End by asking if they want to continue setup.\n\n${PRESENTATION_RULES}`; }
function buildTalkToClaraPrompt(text = "", profile = {}) { return `Talk to CLARA is active. User said: ${text}\nKnown user name: ${profile.name || "there"}\n\nRespond naturally as CLARA. Ask only one gentle question if needed. Do not reveal internal categories or scores.\n\n${PRESENTATION_RULES}`; }
function profileQuestionText(step, name = "") { return `${name ? `${name}, ` : ""}${step?.question || "What else should CLARA understand about you?"}`; }

function MessageText({ text }) { const blocks = normalizeNaturalChatReply(text).split(/\n{2,}/).map((block) => block.trim()).filter(Boolean); return <div className="space-y-3 text-[13px] leading-[1.65] text-slate-100/90">{blocks.map((block, index) => <p key={`${block}-${index}`} className="whitespace-pre-wrap">{block}</p>)}</div>; }
function QuickChoices({ choices = [], disabled, onSelect }) { if (!choices.length) return null; return <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">{choices.map((choice) => <button key={`${choice.value || choice.label}`} type="button" disabled={disabled} onClick={() => onSelect(choice)} className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 transition active:scale-95 disabled:opacity-45">{choice.label}</button>)}</div>; }
function Insight({ text, source, choices, disabled, onSelectChoice }) { return <div className="space-y-2.5">{SHOW_DEBUG_SOURCE ? <div className="inline-flex rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Source: {source === "gemini" ? "Gemini" : source === "local_context" ? "Local context" : source === "local_finance" ? "Local finance" : "Local fallback"}</div> : null}<MessageText text={text} /><QuickChoices choices={choices} disabled={disabled} onSelect={onSelectChoice} /></div>; }
function PanelButton({ active, children, onClick }) { return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/25 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[0.055] text-white/60 hover:bg-white/[0.08]"}`}>{children}</button>; }
function OptionCard({ item, disabled, onClick }) { return <button type="button" disabled={disabled} onClick={onClick} className="group min-h-[82px] rounded-[22px] border border-white/10 bg-white/[0.055] p-3 text-left shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-white/[0.085] active:scale-[0.98] disabled:opacity-45"><p className="text-[12px] font-black leading-tight text-white group-active:text-emerald-100">{item.shortTitle || item.title}</p><p className="mt-1.5 line-clamp-3 text-[10.5px] leading-4 text-slate-300/66">{item.description}</p></button>; }
function PanelInstructionBoard({ panel, greeting, onClose }) { const copy = panel ? PANEL_COPY[panel] : greeting; return <div className="relative rounded-[30px] border border-white/10 bg-white/[0.045] px-5 pb-5 pt-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300"><button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode"><X className="h-4 w-4" /></button><p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">{copy.eyebrow}</p><h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">{copy.heading}</h3><div className="mx-auto mt-3 max-w-[300px] space-y-2 text-sm leading-6 text-slate-300/75">{copy.body.map((line) => <p key={line}>{line}</p>)}</div></div>; }
function FloatingCloseButton({ onClose }) { return <button type="button" onClick={onClose} className="absolute right-4 top-[max(env(safe-area-inset-top),18px)] z-10 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode"><X className="h-4 w-4" /></button>; }

export default function ClaraAiEnvironmentOverlay({ isActive = false, messages = [], claraAssistantContext = {}, onClose }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [panel, setPanel] = useState(null);
  const [greeting, setGreeting] = useState(() => pickRandomItem(DEFAULT_CLARA_GREETINGS));
  const [chatInputPlaceholder, setChatInputPlaceholder] = useState(() => pickRandomItem(CHAT_INPUT_PLACEHOLDERS));
  const [talkIntroState, setTalkIntroState] = useState("not_shown");
  const [talkProfile, setTalkProfile] = useState({ pendingName: "", name: "" });
  const [talkPhase, setTalkPhase] = useState("intro");
  const [profileStepIndex, setProfileStepIndex] = useState(0);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const visibleMessages = useMemo(() => [...(Array.isArray(messages) ? messages : []), ...localMessages].filter((message) => !hiddenMessage(message)), [messages, localMessages]);

  useEffect(() => { if (!isActive) { setDraft(""); setLocalMessages([]); setIsThinking(false); setPanel(null); setTalkIntroState("not_shown"); setTalkProfile({ pendingName: "", name: "" }); setTalkPhase("intro"); setProfileStepIndex(0); return undefined; } setPanel(null); setTalkIntroState("not_shown"); setTalkProfile({ pendingName: "", name: "" }); setTalkPhase("intro"); setProfileStepIndex(0); setGreeting(pickRandomItem(DEFAULT_CLARA_GREETINGS)); setChatInputPlaceholder(pickRandomItem(CHAT_INPUT_PLACEHOLDERS)); setLocalMessages((current) => current.filter((message) => !hiddenMessage(message))); const timer = window.setTimeout(() => inputRef.current?.focus?.(), 180); return () => window.clearTimeout(timer); }, [isActive]);
  useEffect(() => { if (!isActive) return undefined; const handleEscape = (event) => event.key === "Escape" && onClose?.(); window.addEventListener("keydown", handleEscape); return () => window.removeEventListener("keydown", handleEscape); }, [isActive, onClose]);
  useEffect(() => { if (isActive) messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [isActive, visibleMessages.length, isThinking]);
  if (!isActive) return null;

  const addClaraOnlyMessage = (text, choices = [], source = "local_context") => setLocalMessages((current) => [...current.filter((message) => !hiddenMessage(message)), makeMessage("clara", text, { source, quickChoices: choices })]);
  const addExchange = (userText, claraText, choices = [], source = "local_context") => setLocalMessages((current) => [...current.filter((message) => !hiddenMessage(message)), makeMessage("user", userText), makeMessage("clara", claraText, { source, quickChoices: choices })]);
  const runClara = async ({ prompt, displayText = prompt, action = null }) => {
    const cleanPrompt = String(prompt || "").trim(); const cleanDisplay = String(displayText || cleanPrompt).trim(); if (!cleanPrompt || isThinking) return;
    const pending = makeMessage("clara", "Thinking...", { source: "system" }); setIsThinking(true); setLocalMessages((current) => [...current.filter((message) => !hiddenMessage(message)), makeMessage("user", cleanDisplay), pending]);
    try {
      let reply = ""; let source = "local_fallback"; const directFinanceReply = action?.id === "talk_to_clara_context" ? "" : buildContextualFinanceReply(cleanPrompt, claraAssistantContext);
      if (directFinanceReply) { reply = directFinanceReply; source = "local_finance"; }
      else if (hasGeminiConfig()) { try { reply = await generateClaraGeminiReply({ message: cleanPrompt, context: claraAssistantContext, mode: action?.id || "ai_environment", conversationHistory: [...visibleMessages, makeMessage("user", cleanDisplay)] }); source = "gemini"; } catch (error) { console.warn("[CLARA AI] Gemini failed, using local fallback", { message: error?.message, status: error?.status, payload: error?.payload }); reply = action?.id === "talk_to_clara_context" ? "Got it. Let’s continue step by step.\n\nWhat else should CLARA understand about you?" : fallbackReply(cleanPrompt, claraAssistantContext); source = action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback"; } }
      else { reply = action?.id === "talk_to_clara_context" ? "Got it. Let’s continue step by step.\n\nWhat else should CLARA understand about you?" : fallbackReply(cleanPrompt, claraAssistantContext); source = action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback"; }
      setLocalMessages((current) => current.map((message) => message.id !== pending.id ? message : { ...message, text: normalizeNaturalChatReply(reply), source, ...(action ? { smartAction: action } : {}) }));
    } catch (error) { console.error("[CLARA AI] Fatal assistant modal error", error); setLocalMessages((current) => current.map((message) => message.id !== pending.id ? message : { ...message, text: fallbackReply(cleanPrompt, claraAssistantContext), source: "local_fallback", ...(action ? { smartAction: action } : {}) })); }
    finally { setIsThinking(false); }
  };
  const stepChoices = (step) => (step?.choices || []).map((choice) => ({ label: choice, value: choice, kind: "profile_answer" }));
  const askStep = (index, userText = "Continue") => { const step = PROFILE_STEPS[index]; if (!step) { addExchange(userText, "Thanks. I have enough starter context for now. You can keep chatting naturally, or save this profile context later when the save system is connected.", [{ label: "Continue chatting", value: "continue_chat", kind: "continue_chat" }]); setTalkPhase("free_chat"); return; } setProfileStepIndex(index); addExchange(userText, profileQuestionText(step, talkProfile.name), stepChoices(step)); };
  const handleProfileAnswer = (answer) => { const nextIndex = profileStepIndex + 1; askStep(nextIndex, answer); };
  const startTalkFlow = () => { setPanel("talk"); setTalkIntroState("awaiting_language"); setTalkProfile({ pendingName: "", name: "" }); setTalkPhase("intro"); setProfileStepIndex(0); setChatInputPlaceholder(pickRandomItem(CHAT_INPUT_PLACEHOLDERS)); setLocalMessages([makeMessage("clara", TALK_TO_CLARA_LANGUAGE_PROMPT, { source: "local_context", quickChoices: [{ label: "English", value: "English", kind: "language" }, { label: "Tagalog", value: "Tagalog", kind: "language" }] })]); };
  const handleQuickChoice = (choice) => {
    const label = choice?.label || choice?.value || "Continue";
    if (choice?.kind === "language") { const intro = isTagalogChoice(label) ? TALK_TO_CLARA_INTRO_TL : TALK_TO_CLARA_INTRO_EN; setTalkIntroState("awaiting_continue_or_question"); addExchange(label, `${intro}\n\nCan we proceed to the next part?`, [{ label: "Continue", value: "Continue", kind: "continue_intro" }, { label: "Ask question", value: "Ask question", kind: "ask_intro_question" }]); return; }
    if (choice?.kind === "continue_intro") { setTalkIntroState("confirmed"); setTalkPhase("ask_name"); addExchange(label, "Great. To make our conversations feel more personal, what name would you like me to call you?"); return; }
    if (choice?.kind === "ask_intro_question") { addExchange(label, "Sure — type your question about Talk to CLARA, then I’ll answer before we proceed."); return; }
    if (choice?.kind === "confirm_name_yes") { const name = talkProfile.pendingName || "there"; setTalkProfile({ pendingName: name, name }); setTalkPhase("behavioral_audit"); setProfileStepIndex(0); const firstStep = PROFILE_STEPS[0]; addExchange(label, profileQuestionText(firstStep, name), stepChoices(firstStep)); return; }
    if (choice?.kind === "change_name") { setTalkProfile({ pendingName: "", name: "" }); setTalkPhase("ask_name"); addExchange(label, "No problem. What name would you prefer me to use?"); return; }
    if (choice?.kind === "profile_answer") { handleProfileAnswer(label); return; }
    if (choice?.kind === "continue_chat") { addExchange(label, "Sure. You can now talk to me naturally about anything affecting your spending."); setTalkPhase("free_chat"); }
  };
  const submitDraft = (event) => {
    event.preventDefault(); const text = draft.trim(); if (!text) return; const isTalkToClaraMode = panel === "talk";
    if (isTalkToClaraMode && talkIntroState === "awaiting_language") { if (isEnglishChoice(text) || isTagalogChoice(text)) { handleQuickChoice({ label: text, value: text, kind: "language" }); } else addExchange(text, "Choose one first so I can explain clearly.", [{ label: "English", value: "English", kind: "language" }, { label: "Tagalog", value: "Tagalog", kind: "language" }]); setDraft(""); return; }
    if (isTalkToClaraMode && talkIntroState === "awaiting_continue_or_question") { if (isProceedChoice(text)) { handleQuickChoice({ label: "Continue", value: "Continue", kind: "continue_intro" }); } else { runClara({ prompt: buildTalkIntroQuestionPrompt(text), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION }); } setDraft(""); return; }
    if (isTalkToClaraMode && talkPhase === "ask_name") { const name = extractLikelyName(text); if (!name || isQuestionLike(text) || looksLikeUrgentIssue(text)) { runClara({ prompt: `CLARA is trying to learn what to call the user. The user said: ${text}\n\nIf this is a question or issue, answer naturally. Then gently ask what CLARA should call them. Keep it short.`, displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION }); setDraft(""); return; } setTalkProfile({ pendingName: name, name: "" }); setTalkPhase("confirm_name"); addExchange(text, `Got it, ${name}. Should I call you ${name} from now on?`, [{ label: "Yes", value: "Yes", kind: "confirm_name_yes" }, { label: "Change name", value: "Change name", kind: "change_name" }]); setDraft(""); return; }
    if (isTalkToClaraMode && talkPhase === "confirm_name") { if (isProceedChoice(text)) handleQuickChoice({ label: "Yes", value: "Yes", kind: "confirm_name_yes" }); else if (isNoChoice(text)) handleQuickChoice({ label: "Change name", value: "Change name", kind: "change_name" }); else { const newName = extractLikelyName(text); if (newName) { setTalkProfile({ pendingName: newName, name: "" }); addExchange(text, `Got it, ${newName}. Should I call you ${newName} from now on?`, [{ label: "Yes", value: "Yes", kind: "confirm_name_yes" }, { label: "Change name", value: "Change name", kind: "change_name" }]); } } setDraft(""); return; }
    if (isTalkToClaraMode && talkPhase === "behavioral_audit") { handleProfileAnswer(text); setDraft(""); return; }
    runClara({ prompt: isTalkToClaraMode ? buildTalkToClaraPrompt(text, talkProfile) : `${text}\n\n${PRESENTATION_RULES}`, displayText: text, action: isTalkToClaraMode ? TALK_TO_CLARA_CONTEXT_ACTION : null }); setDraft("");
  };

  return <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}>
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />
    {visibleMessages.length ? <FloatingCloseButton onClose={onClose} /> : null}
    <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
      {visibleMessages.length ? <div className="flex min-h-full flex-col justify-end gap-3 pb-2 pt-12">{visibleMessages.map((message) => { const isUser = message.role === "user"; const action = message.smartAction; return <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}><div className={`px-4 py-3.5 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.16)] ${isUser ? "max-w-[88%] rounded-[24px] bg-emerald-300 text-slate-950" : "max-w-[88%] rounded-[24px] bg-white/[0.075] text-white/86 backdrop-blur-xl"}`}>{isUser ? clean(message.text) : <Insight text={message.text} source={message.source} choices={message.quickChoices || []} disabled={isThinking} onSelectChoice={handleQuickChoice} />}{action && !isUser && action.chips?.length ? <div className="mt-3 border-t border-white/10 pt-3"><p className="text-[12px] leading-5 text-emerald-100/85">What should we narrow down next?</p><div className="mt-3 flex flex-wrap gap-2">{action.chips.map((chip) => <button key={chip} type="button" disabled={isThinking} onClick={() => runClara({ prompt: `${action.prompt}\nUser selected: ${chip}\n\n${PRESENTATION_RULES}`, displayText: chip, action })} className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 active:scale-95 disabled:opacity-45">{chip}</button>)}</div></div> : null}</div></div>; })}<div ref={messagesEndRef} /></div> : <div className="flex min-h-full flex-col justify-center gap-4 pb-2"><PanelInstructionBoard panel={panel} greeting={greeting} onClose={onClose} /><div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"><div className="grid grid-cols-3 gap-2"><PanelButton active={panel === "talk"} onClick={startTalkFlow}>Talk to CLARA</PanelButton><PanelButton active={panel === "core"} onClick={() => setPanel("core")}>Core Features</PanelButton><PanelButton active={panel === "smart"} onClick={() => setPanel("smart")}>Smart Actions</PanelButton></div>{panel === "smart" ? <div className="mt-3 grid grid-cols-2 gap-2">{SMART_ACTIONS.map((action) => <OptionCard key={action.id} item={action} disabled={isThinking} onClick={() => runClara({ prompt: `${action.prompt}\n\n${PRESENTATION_RULES}`, displayText: action.title, action })} />)}</div> : null}{panel === "core" ? <div className="mt-3 grid grid-cols-2 gap-2">{CORE_FEATURES.map((feature) => <OptionCard key={feature.id} item={feature} disabled={isThinking} onClick={() => runClara({ prompt: `${feature.prompt}\n\n${PRESENTATION_RULES}`, displayText: feature.title, action: { ...feature, chips: ["Can I buy this?", "Next move", "Check risk"] } })} />)}</div> : null}</div></div>}
    </main>
    <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"><div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2"><input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70" placeholder={panel === "talk" ? chatInputPlaceholder : DEFAULT_CHAT_INPUT_PLACEHOLDER} inputMode="text" /><button type="submit" disabled={!draft.trim() || isThinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95" aria-label="Send to CLARA"><ArrowUp className="h-5 w-5" /></button></div></form>
  </div>;
}
