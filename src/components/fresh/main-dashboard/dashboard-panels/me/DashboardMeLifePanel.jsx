import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  Brain,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  HeartHandshake,
  Lightbulb,
  LockKeyhole,
  NotebookTabs,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  UserRound,
  Users,
  WalletCards,
  WandSparkles,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";
import {
  DEFAULT_CLARA_LIFE_PROFILE,
  normalizeClaraLifeProfile,
  readClaraLifeProfile,
  saveClaraLifeProfile,
} from "@/lib/clara-life-profile";
import { refineClaraLifeProfileText } from "@/lib/clara-life-profile-refiner";

const PERSONALITY_RESULTS = {
  balanced: {
    label: "Balanced spender",
    note: "You can enjoy money, but you still consider responsibility before spending.",
  },
  comfort: {
    label: "Impulse comfort spender",
    note: "You may spend faster when emotions are high, especially when tired, stressed, or excited.",
  },
  protector: {
    label: "Survival protector",
    note: "You naturally protect essentials first, but you may feel guilty spending on yourself.",
  },
  builder: {
    label: "Goal builder",
    note: "You feel strongest when money has a clear direction, target, or future purpose.",
  },
  supporter: {
    label: "Generous supporter",
    note: "You often think about people you care about before spending on yourself.",
  },
  avoidant: {
    label: "Avoidant spender",
    note: "You may delay checking money when it feels stressful or overwhelming.",
  },
};

const MONEY_PERSONALITY_QUESTIONS = [
  {
    id: "payday",
    question: "Payday just arrived. What usually happens first?",
    options: [
      ["I pay bills or essentials first.", "protector"],
      ["I treat myself because I worked hard.", "comfort"],
      ["I save or move money toward a goal.", "builder"],
      ["I am not sure. Money just starts moving.", "avoidant"],
    ],
  },
  {
    id: "unplannedWant",
    question: "You see something you want but did not plan to buy. What feels most like you?",
    options: [
      ["I pause and check if it fits.", "balanced"],
      ["I buy it if I feel I deserve it.", "comfort"],
      ["I think about bills first.", "protector"],
      ["I usually regret it later.", "avoidant"],
    ],
  },
  {
    id: "stress",
    question: "When you feel stressed, what tends to happen with spending?",
    options: [
      ["I spend for comfort or convenience.", "comfort"],
      ["I avoid checking my money.", "avoidant"],
      ["I become extra careful.", "protector"],
      ["I refocus on my plan.", "builder"],
    ],
  },
  {
    id: "invite",
    question: "A friend invites you out suddenly. What do you usually do?",
    options: [
      ["I check my money first.", "balanced"],
      ["I go, then worry later.", "comfort"],
      ["I decline if it was not planned.", "protector"],
      ["I go if someone important needs me there.", "supporter"],
    ],
  },
  {
    id: "family",
    question: "Someone close to you asks for help with money. What is your first instinct?",
    options: [
      ["I help right away if I can.", "supporter"],
      ["I check my own responsibilities first.", "balanced"],
      ["I feel pressure even if I cannot afford it.", "supporter"],
      ["I avoid thinking about it because it is stressful.", "avoidant"],
    ],
  },
  {
    id: "sale",
    question: "A big sale appears online. What usually happens?",
    options: [
      ["I ignore it unless I already need something.", "protector"],
      ["I compare it with my goals first.", "builder"],
      ["I browse and sometimes buy more than planned.", "comfort"],
      ["I check if it still fits the month.", "balanced"],
    ],
  },
  {
    id: "tracking",
    question: "When you think about tracking expenses, what do you feel?",
    options: [
      ["Clear. I like seeing where money goes.", "builder"],
      ["Helpful, but I do not want it to be strict.", "balanced"],
      ["Heavy. I avoid it sometimes.", "avoidant"],
      ["Necessary because I need to survive the month.", "protector"],
    ],
  },
  {
    id: "extraMoney",
    question: "You receive unexpected extra money. What feels natural?",
    options: [
      ["Put it toward savings or a goal.", "builder"],
      ["Use some, keep some.", "balanced"],
      ["Buy something I have been wanting.", "comfort"],
      ["Help someone or contribute at home.", "supporter"],
    ],
  },
  {
    id: "lowBalance",
    question: "Your balance is getting low before the next income. What happens?",
    options: [
      ["I tighten spending immediately.", "protector"],
      ["I feel anxious and avoid checking.", "avoidant"],
      ["I adjust and choose only what matters.", "balanced"],
      ["I look for a way to protect my goal.", "builder"],
    ],
  },
  {
    id: "futureSelf",
    question: "Which sentence sounds most like your money goal?",
    options: [
      ["I want peace and stability first.", "protector"],
      ["I want progress I can measure.", "builder"],
      ["I want to enjoy life without guilt.", "balanced"],
      ["I want to stop emotional spending cycles.", "comfort"],
    ],
  },
];

const FIELDS = [
  {
    section: "Money Pattern",
    key: "personality",
    label: "Money personality",
    helper: "Answer real situations so CLARA can understand your spending pattern.",
    icon: Smile,
    kind: "quiz",
  },
  {
    section: "Money Pattern",
    key: "responsibility",
    label: "Protect first",
    helper: "The priority CLARA should protect before wants.",
    icon: ShieldCheck,
    options: ["Bills and essentials", "Food at home", "Family support", "Rent", "Debt payment", "Savings goal", "Emergency fund"],
    allowCustom: true,
    customPlaceholder: "Example: tuition, medicine, parents, rent deposit",
  },
  {
    section: "Money Pattern",
    key: "incomeRhythm",
    label: "Income rhythm",
    helper: "When money usually comes in.",
    icon: WalletCards,
    options: ["Daily income", "Weekly income", "Twice a month", "Monthly salary", "Irregular income"],
    allowCustom: true,
    customPlaceholder: "Example: every project, commission, mixed income",
  },
  {
    section: "Life Context",
    key: "status",
    label: "Current status",
    helper: "Your current life stage.",
    icon: Briefcase,
    options: ["Student", "Working student", "Employee", "Freelancer", "Business owner", "Parent", "Between jobs"],
    allowCustom: true,
    customPlaceholder: "Example: OFW, part-time, caregiver",
  },
  {
    section: "Life Context",
    key: "dependents",
    label: "Who depends on me?",
    helper: "People CLARA should consider before spending advice.",
    icon: Users,
    options: ["Just me", "Parents", "Partner / spouse", "Children", "Family household"],
    allowCustom: true,
    customPlaceholder: "Example: grandparents, niece, church family",
  },
  {
    section: "Life Context",
    key: "age",
    label: "Age",
    helper: "Optional, but helps CLARA adjust tone.",
    icon: UserRound,
    input: "number",
  },
  {
    section: "Life Context",
    key: "coachingStyle",
    label: "Guidance tone",
    helper: "How firm CLARA should sound.",
    icon: HeartHandshake,
    options: ["Gentle", "Balanced", "Straightforward", "Strict"],
  },
  {
    section: "Behavioral Signals",
    key: "currentLifeSeason",
    label: "Current life season",
    helper: "The real-life situation CLARA should remember when giving advice.",
    icon: Activity,
    input: "textarea",
    placeholder: "Example: I am recovering from work stress and trying to rebuild discipline.",
  },
  {
    section: "Behavioral Signals",
    key: "emotionalState",
    label: "Emotional state",
    helper: "This helps CLARA know if advice should be gentle, firm, or protective.",
    icon: Heart,
    options: ["Stable", "Stressed", "Healing", "Heartbroken", "Burned out", "Motivated", "Pressured", "Celebrating"],
    allowCustom: true,
    customPlaceholder: "Example: anxious after work conflict, lonely, overwhelmed",
  },
  {
    section: "Behavioral Signals",
    key: "replacementActivity",
    label: "Healthy spending replacement",
    helper: "A productive activity CLARA can suggest when spending becomes emotional.",
    icon: Lightbulb,
    input: "textarea",
    placeholder: "Example: play guitar, walk outside, journal, workout, cook at home, pray, clean my room.",
  },
  {
    section: "Life Identity",
    key: "currentFocus",
    label: "What are you building right now?",
    helper: "This becomes CLARA's main reminder when you ask about big wants.",
    icon: Compass,
    input: "textarea",
    placeholder: "Example: I am building my emergency fund and trying to stop living paycheck to paycheck.",
  },
  {
    section: "Life Identity",
    key: "topValues",
    label: "What matters most right now?",
    helper: "Values help CLARA protect the life you actually want.",
    icon: Heart,
    input: "textarea",
    placeholder: "Example: peace, family, stability, freedom, health, faith, independence.",
  },
  {
    section: "Life Identity",
    key: "meaningfulGoal",
    label: "What goal should CLARA protect?",
    helper: "Use this for the dream or purchase that matters more than random wants.",
    icon: Target,
    input: "textarea",
    placeholder: "Example: Save ₱5,000 for my laptop, build ₱20,000 emergency fund, help my parents.",
  },
  {
    section: "Life Identity",
    key: "financialFear",
    label: "What situation do you never want again?",
    helper: "CLARA can remind you of this gently during risky spending moments.",
    icon: LockKeyhole,
    input: "textarea",
    placeholder: "Example: I never want to borrow money again just to survive before payday.",
  },
  {
    section: "Life Identity",
    key: "spendingTrigger",
    label: "What makes spending harder to control?",
    helper: "This helps CLARA spot comfort spending before it becomes regret.",
    icon: Lightbulb,
    input: "textarea",
    placeholder: "Example: stress, tired nights, Shopee sales, eating out after work, comparison.",
  },
  {
    section: "Life Identity",
    key: "nonNegotiable",
    label: "What money should CLARA protect no matter what?",
    helper: "This gives CLARA a boundary when a tempting want appears.",
    icon: ShieldCheck,
    input: "textarea",
    placeholder: "Example: rent, medicines, school money, emergency fund, savings for family.",
  },
  {
    section: "Life Identity",
    key: "identityStatement",
    label: "Who are you becoming?",
    helper: "A short future-self line CLARA can remind you of.",
    icon: Sparkles,
    input: "textarea",
    placeholder: "Example: I am becoming someone who has peace with money and does not panic before payday.",
  },
];

function getMoneyPersonalityResult(answers = {}) {
  const scores = Object.keys(PERSONALITY_RESULTS).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  MONEY_PERSONALITY_QUESTIONS.forEach((question) => {
    const score = answers[question.id];
    if (score && scores[score] !== undefined) scores[score] += 1;
  });
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "balanced";
  return PERSONALITY_RESULTS[winner];
}

function getDisplayValue(value, fallback = "Not set yet") {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatMemoryDate(value) {
  if (!value) return "Recently";
  try {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function MoneyPersonalityQuiz({ profile, setProfile }) {
  const answers = profile.personalityQuizAnswers || {};
  const answeredCount = MONEY_PERSONALITY_QUESTIONS.filter((question) => answers[question.id]).length;
  const [step, setStep] = useState(Math.min(answeredCount, MONEY_PERSONALITY_QUESTIONS.length - 1));
  const question = MONEY_PERSONALITY_QUESTIONS[step];
  const completed = answeredCount === MONEY_PERSONALITY_QUESTIONS.length;
  const result = useMemo(() => getMoneyPersonalityResult(answers), [answers]);
  const progress = Math.round((answeredCount / MONEY_PERSONALITY_QUESTIONS.length) * 100);

  const answerQuestion = (score) => {
    const nextAnswers = { ...answers, [question.id]: score };
    const nextResult = getMoneyPersonalityResult(nextAnswers);
    setProfile((current) => ({ ...current, personalityQuizAnswers: nextAnswers, personality: nextResult.label }));
    if (step < MONEY_PERSONALITY_QUESTIONS.length - 1) setStep((current) => current + 1);
  };

  const resetQuiz = () => {
    setProfile((current) => ({ ...current, personalityQuizAnswers: {}, personality: "Balanced spender" }));
    setStep(0);
  };

  if (completed) {
    return (
      <div className="mt-5 rounded-[24px] border border-cyan-300/18 bg-cyan-300/[0.055] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Your current pattern</p>
        <h4 className="mt-2 text-xl font-black text-white">{result.label}</h4>
        <p className="mt-2 text-sm leading-6 text-white/64">{result.note}</p>
        <p className="mt-3 text-xs leading-5 text-white/42">This is not a permanent label. CLARA can adjust as your behavior changes.</p>
        <button type="button" onClick={resetQuiz} className="mt-4 rounded-2xl border border-white/12 bg-white/[0.045] px-4 py-2 text-xs font-black text-white/62 transition active:scale-[0.98]">
          Retake check
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Question {step + 1} of {MONEY_PERSONALITY_QUESTIONS.length}</p>
          <p className="text-[10px] font-black text-white/40">{progress}%</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-cyan-300/50 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <h4 className="text-lg font-black leading-tight text-white">{question.question}</h4>
        <div className="mt-4 space-y-2.5">
          {question.options.map(([text, score]) => (
            <button key={text} type="button" onClick={() => answerQuestion(score)} className="w-full rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3 text-left text-sm font-bold leading-5 text-white/72 transition hover:bg-white/[0.06] active:scale-[0.99]">
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionSelector({ field, profile, selectOption }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    setCustomOpen(false);
    setCustomValue("");
  }, [field.key]);

  const saveCustom = () => {
    const value = customValue.trim();
    if (!value) return;
    selectOption(field.key, value);
    setCustomOpen(false);
    setCustomValue("");
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {field.options.map((option) => {
          const active = profile[field.key] === option;
          return (
            <button key={option} type="button" onClick={() => selectOption(field.key, option)} className={`min-h-[46px] rounded-[18px] border px-3 py-3 text-left text-[12px] font-black leading-4 transition active:scale-[0.98] ${active ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,.10)]" : "border-white/12 bg-white/[0.04] text-white/62 hover:bg-white/[0.06]"}`}>
              {option}
            </button>
          );
        })}
        {field.allowCustom ? (
          <button type="button" onClick={() => setCustomOpen(true)} className="min-h-[46px] rounded-[18px] border border-dashed border-cyan-200/22 bg-cyan-300/[0.035] px-3 py-3 text-left text-[12px] font-black leading-4 text-cyan-50/72 transition active:scale-[0.98]">
            Other / custom
          </button>
        ) : null}
      </div>
      {customOpen ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Write your own</p>
          <input value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder={field.customPlaceholder || "Type your own answer"} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/10 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35" />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={saveCustom} className="rounded-2xl border border-cyan-300/24 bg-cyan-300/[0.10] px-4 py-2 text-xs font-black text-cyan-50 transition active:scale-[0.98]">Save custom</button>
            <button type="button" onClick={() => { setCustomOpen(false); setCustomValue(""); }} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-black text-white/48 transition active:scale-[0.98]">Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TextIdentityEditor({ field, profile, setProfile, onAccept }) {
  const value = String(profile[field.key] || "");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const canSubmit = Boolean(value.trim());

  const updateValue = (nextValue) => {
    setProfile((current) => ({ ...current, [field.key]: nextValue }));
    if (refineError) setRefineError("");
  };

  const handleRefine = async () => {
    const roughText = value.trim();
    if (!roughText) {
      setRefineError("Write a rough answer first, then CLARA can clean it up.");
      return;
    }

    try {
      setRefining(true);
      setRefineError("");
      const refinedText = await refineClaraLifeProfileText({
        fieldLabel: field.label,
        fieldHelper: field.helper,
        originalText: roughText,
      });
      updateValue(refinedText);
    } catch (error) {
      console.warn("CLARA life profile refine failed:", error);
      setRefineError("CLARA could not refine it yet. You can keep typing and try again.");
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
      <textarea
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        placeholder={field.placeholder || "Tell CLARA in your own words."}
        rows={7}
        maxLength={420}
        className="min-h-[150px] w-full resize-none rounded-[20px] border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35"
      />

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleRefine}
          disabled={refining || !canSubmit}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition active:scale-[0.98] ${refining || !canSubmit ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/28" : "border-cyan-300/24 bg-cyan-300/[0.10] text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,.08)] hover:bg-cyan-300/[0.14]"}`}
        >
          <WandSparkles className={`h-3.5 w-3.5 ${refining ? "animate-pulse" : ""}`} />
          {refining ? "Refining..." : "Refine with AI"}
        </button>

        <button
          type="button"
          onClick={onAccept}
          disabled={!canSubmit || refining}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition active:scale-[0.98] ${!canSubmit || refining ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/28" : "border-emerald-300/30 bg-emerald-300/[0.14] text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,.12)] hover:bg-emerald-300/[0.18]"}`}
        >
          <Check className="h-3.5 w-3.5" />
          Accept
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
        <span>Private on this device</span>
        <span>{value.length}/420</span>
      </div>

      {refineError ? (
        <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs font-bold leading-5 text-amber-100/72">
          {refineError}
        </p>
      ) : null}
    </div>
  );
}

function ContextChip({ label, value, icon: Icon, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group min-w-0 rounded-[22px] border border-white/10 bg-white/[0.04] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:bg-white/[0.065] active:scale-[0.99]">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
        <Icon className="h-3.5 w-3.5 text-cyan-100/58" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-black leading-5 text-white/84">{value}</p>
    </button>
  );
}

function InsightCard({ icon: Icon, label, title, body, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group w-full rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-cyan-200/18 hover:bg-white/[0.055] active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.07] text-cyan-50/76">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/50">{label}</p>
          <h4 className="mt-1 text-sm font-black leading-5 text-white">{title}</h4>
          <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-white/48">{body}</p>
        </div>
        <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-white/36 transition group-hover:text-cyan-100/70" />
      </div>
    </button>
  );
}

function MemoryTimeline({ memoryNotes = [] }) {
  const notes = Array.isArray(memoryNotes) ? memoryNotes.filter((note) => note?.summary || note?.spendingImpact).slice(0, 4) : [];

  if (!notes.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-cyan-200/16 bg-cyan-300/[0.035] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-100/70">
            <NotebookTabs className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">No approved memories yet</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/46">
              When Ask CLARA learns something important and the user approves it, the short summary will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {notes.map((note) => (
        <div key={note.id} className="rounded-[22px] border border-white/10 bg-white/[0.035] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.07] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/70">{note.category || "Life Context"}</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/30"><Clock3 className="h-3 w-3" />{formatMemoryDate(note.updatedAt || note.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm font-bold leading-5 text-white/80">{note.summary}</p>
          {note.spendingImpact ? <p className="mt-2 text-xs font-semibold leading-5 text-white/44">{note.spendingImpact}</p> : null}
        </div>
      ))}
    </div>
  );
}

function UnderstandingDashboard({ profile, savingState, onOpenField }) {
  const heroChips = [
    { label: "Pattern", value: getDisplayValue(profile.personality), icon: Brain, fieldKey: "personality" },
    { label: "Tone", value: getDisplayValue(profile.coachingStyle, "Balanced"), icon: HeartHandshake, fieldKey: "coachingStyle" },
    { label: "Income", value: getDisplayValue(profile.incomeRhythm), icon: WalletCards, fieldKey: "incomeRhythm" },
    { label: "Depends", value: getDisplayValue(profile.dependents), icon: Users, fieldKey: "dependents" },
  ];

  const insights = [
    {
      icon: Activity,
      label: "Current life state",
      title: getDisplayValue(profile.currentLifeSeason || profile.status, "Tell CLARA what season you are in"),
      body: profile.currentLifeSeason ? "This gives CLARA a better reason behind current decisions." : "Use this for work stress, heartbreak, transition, recovery, or pressure.",
      fieldKey: profile.currentLifeSeason ? "currentLifeSeason" : "status",
    },
    {
      icon: Lightbulb,
      label: "Spending trigger",
      title: getDisplayValue(profile.spendingTrigger, "No active trigger saved yet"),
      body: "CLARA can use this to spot comfort spending before it becomes regret.",
      fieldKey: "spendingTrigger",
    },
    {
      icon: Target,
      label: "Goal to protect",
      title: getDisplayValue(profile.meaningfulGoal || profile.currentFocus, "No protected goal yet"),
      body: "This becomes the reminder when a tempting want appears.",
      fieldKey: profile.meaningfulGoal ? "meaningfulGoal" : "currentFocus",
    },
    {
      icon: ShieldCheck,
      label: "Non-negotiable",
      title: getDisplayValue(profile.nonNegotiable || profile.responsibility, "Choose what CLARA must protect first"),
      body: "This creates a clear boundary before wants and impulse decisions.",
      fieldKey: profile.nonNegotiable ? "nonNegotiable" : "responsibility",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(9,62,76,.96),rgba(16,24,55,.97)_46%,rgba(55,24,100,.96))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.24),0_0_38px_rgba(34,211,238,.08)]">
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl" />
        <div className="pointer-events-none absolute right-7 top-8 h-20 w-20 rounded-full border border-cyan-200/10 bg-white/[0.025] shadow-[0_0_45px_rgba(34,211,238,.12)]" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Personal Cabinet</p>
              <h3 className="mt-3 text-3xl font-black leading-none text-white">Me</h3>
              <p className="mt-3 max-w-[26rem] text-sm leading-6 text-white/72">
                This is not another AI chat. This is the organized cabinet of what CLARA understands about your life, behavior, and spending context.
              </p>
              <p className="mt-2 text-[11px] font-bold text-white/38">{savingState}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] border border-cyan-200/16 bg-cyan-300/[0.08] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,.12)]">
              <Archive className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {heroChips.map((chip) => (
              <ContextChip key={chip.label} {...chip} onClick={() => onOpenField(chip.fieldKey)} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">What CLARA understands</p>
            <h3 className="mt-1 text-lg font-black text-white">Living profile summary</h3>
          </div>
          <span className="rounded-full border border-emerald-200/14 bg-emerald-300/[0.075] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">Compressed</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {insights.map((insight) => (
            <InsightCard key={insight.label} {...insight} onClick={() => onOpenField(insight.fieldKey)} />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.028] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">Approved memories</p>
            <h3 className="mt-1 text-lg font-black text-white">What CLARA learned</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/44">
              Short summaries only. Full conversations do not need to be sent back every time.
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50">
            <NotebookTabs className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4">
          <MemoryTimeline memoryNotes={profile.memoryNotes} />
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-200/12 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.08),transparent_38%),rgba(255,255,255,.025)] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.07] text-cyan-50/74">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Ask CLARA is still the conversation.</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
              The Me page only organizes the approved context, so advice can stay personal without wasting tokens on the full life story every time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function EditContextPanel({ profile, setProfile, savingState }) {
  const [fieldKey, setFieldKey] = useState(null);
  const field = FIELDS.find((item) => item.key === fieldKey);
  const sections = useMemo(() => FIELDS.reduce((acc, item) => {
    const key = item.section || "Context";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {}), []);

  const selectOption = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setFieldKey(null);
  };

  if (!field) {
    return (
      <div className="space-y-5">
        <UnderstandingDashboard profile={profile} savingState={savingState} onOpenField={setFieldKey} />

        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.026] p-4 shadow-[0_18px_52px_rgba(0,0,0,.16)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/34">Cabinet categories</p>
              <h3 className="mt-1 text-lg font-black text-white">Update what CLARA knows</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/44">
                These are still editable, but they now behave like organized memory drawers instead of a one-time form.
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50">
              <Archive className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {Object.entries(sections).map(([sectionName, items]) => (
              <div key={sectionName}>
                <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/34">{sectionName}</p>
                <div className="space-y-2.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const value = profile[item.key] || "Not set";
                    return (
                      <button key={item.key} type="button" onClick={() => setFieldKey(item.key)} className="group flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] px-3.5 py-3 text-left transition hover:bg-white/[0.055] active:scale-[0.99]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-cyan-100/64"><Icon className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{item.label}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-white/44">{value}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/70" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(9,62,76,.96),rgba(16,24,55,.97)_46%,rgba(55,24,100,.96))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.24),0_0_38px_rgba(34,211,238,.08)]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Me Cabinet</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{field.label}</h3>
            <p className="mt-2 text-sm leading-6 text-white/72">{field.helper}</p>
          </div>
          <button type="button" onClick={() => setFieldKey(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60" aria-label="Back to Me cabinet">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {field.kind === "quiz" ? (
          <MoneyPersonalityQuiz profile={profile} setProfile={setProfile} />
        ) : field.input === "number" ? (
          <div className="mt-5 space-y-3">
            <input value={profile.age || ""} onChange={(event) => setProfile((current) => ({ ...current, age: event.target.value }))} inputMode="numeric" type="number" min="1" max="120" placeholder="Not set" className="w-full rounded-2xl border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/35" />
            <button type="button" onClick={() => setFieldKey(null)} className="w-full rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.14] px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-50 transition active:scale-[0.98]">
              Accept
            </button>
          </div>
        ) : field.input === "textarea" ? (
          <TextIdentityEditor field={field} profile={profile} setProfile={setProfile} onAccept={() => setFieldKey(null)} />
        ) : (
          <OptionSelector field={field} profile={profile} selectOption={selectOption} />
        )}
      </div>
    </section>
  );
}

export default function DashboardMeLifePanel() {
  const { user } = useUserRole() || {};
  const [profile, setProfile] = useState(() => normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
  const [loaded, setLoaded] = useState(false);
  const [savingState, setSavingState] = useState("Private profile saved on this device.");
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const storedProfile = await readClaraLifeProfile(user);
        if (!mounted) return;
        setProfile(storedProfile);
        setSavingState("Private profile saved on this device.");
      } catch (error) {
        console.warn("CLARA life profile load failed:", error);
        if (!mounted) return;
        setProfile(normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
        setSavingState("Private profile ready on this device.");
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    setLoaded(false);
    loadProfile();
    return () => {
      mounted = false;
      if (saveTimerRef.current && typeof window !== "undefined") window.clearTimeout(saveTimerRef.current);
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return undefined;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSavingState("Saving private context...");

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveClaraLifeProfile(user, profile);
        setSavingState("Private profile saved on this device.");
        window.dispatchEvent(new CustomEvent("clara:life-profile-updated", { detail: { profile } }));
      } catch (error) {
        console.warn("CLARA life profile save failed:", error);
        setSavingState("Could not save yet. Try again in a moment.");
      }
    }, 450);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [loaded, profile, user]);

  return <EditContextPanel profile={profile} setProfile={setProfile} savingState={savingState} />;
}
