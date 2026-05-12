import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  ShieldCheck,
  Smile,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_PROFILE = {
  personality: "Balanced spender",
  status: "Employee",
  age: "",
  dependents: "Just me",
  responsibility: "Bills and essentials",
  incomeRhythm: "Monthly salary",
  coachingStyle: "Balanced",
  personalityQuizAnswers: {},
};

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
      { text: "I pay bills or essentials first.", score: "protector" },
      { text: "I treat myself because I worked hard.", score: "comfort" },
      { text: "I save or move money toward a goal.", score: "builder" },
      { text: "I am not sure. Money just starts moving.", score: "avoidant" },
    ],
  },
  {
    id: "unplannedWant",
    question: "You see something you want but did not plan to buy. What feels most like you?",
    options: [
      { text: "I pause and check if it fits.", score: "balanced" },
      { text: "I buy it if I feel I deserve it.", score: "comfort" },
      { text: "I think about bills first.", score: "protector" },
      { text: "I usually regret it later.", score: "avoidant" },
    ],
  },
  {
    id: "stress",
    question: "When you feel stressed, what tends to happen with spending?",
    options: [
      { text: "I spend for comfort or convenience.", score: "comfort" },
      { text: "I avoid checking my money.", score: "avoidant" },
      { text: "I become extra careful.", score: "protector" },
      { text: "I refocus on my plan.", score: "builder" },
    ],
  },
  {
    id: "invite",
    question: "A friend invites you out suddenly. What do you usually do?",
    options: [
      { text: "I check my money first.", score: "balanced" },
      { text: "I go, then worry later.", score: "comfort" },
      { text: "I decline if it was not planned.", score: "protector" },
      { text: "I go if someone important needs me there.", score: "supporter" },
    ],
  },
  {
    id: "family",
    question: "Someone close to you asks for help with money. What is your first instinct?",
    options: [
      { text: "I help right away if I can.", score: "supporter" },
      { text: "I check my own responsibilities first.", score: "balanced" },
      { text: "I feel pressure even if I cannot afford it.", score: "supporter" },
      { text: "I avoid thinking about it because it is stressful.", score: "avoidant" },
    ],
  },
  {
    id: "sale",
    question: "A big sale appears online. What usually happens?",
    options: [
      { text: "I ignore it unless I already need something.", score: "protector" },
      { text: "I compare it with my goals first.", score: "builder" },
      { text: "I browse and sometimes buy more than planned.", score: "comfort" },
      { text: "I check if it still fits the month.", score: "balanced" },
    ],
  },
  {
    id: "tracking",
    question: "When you think about tracking expenses, what do you feel?",
    options: [
      { text: "Clear. I like seeing where money goes.", score: "builder" },
      { text: "Helpful, but I do not want it to be strict.", score: "balanced" },
      { text: "Heavy. I avoid it sometimes.", score: "avoidant" },
      { text: "Necessary because I need to survive the month.", score: "protector" },
    ],
  },
  {
    id: "extraMoney",
    question: "You receive unexpected extra money. What feels natural?",
    options: [
      { text: "Put it toward savings or a goal.", score: "builder" },
      { text: "Use some, keep some.", score: "balanced" },
      { text: "Buy something I have been wanting.", score: "comfort" },
      { text: "Help someone or contribute at home.", score: "supporter" },
    ],
  },
  {
    id: "lowBalance",
    question: "Your balance is getting low before the next income. What happens?",
    options: [
      { text: "I tighten spending immediately.", score: "protector" },
      { text: "I feel anxious and avoid checking.", score: "avoidant" },
      { text: "I adjust and choose only what matters.", score: "balanced" },
      { text: "I look for a way to protect my goal.", score: "builder" },
    ],
  },
  {
    id: "futureSelf",
    question: "Which sentence sounds most like your money goal?",
    options: [
      { text: "I want peace and stability first.", score: "protector" },
      { text: "I want progress I can measure.", score: "builder" },
      { text: "I want to enjoy life without guilt.", score: "balanced" },
      { text: "I want to stop emotional spending cycles.", score: "comfort" },
    ],
  },
];

const FIELDS = [
  { key: "personality", label: "Money personality", helper: "Answer real situations so CLARA can understand your spending pattern.", icon: Smile, kind: "quiz" },
  { key: "responsibility", label: "Protect first", helper: "The priority CLARA should protect before wants.", icon: ShieldCheck, options: ["Bills and essentials", "Food at home", "Family support", "Rent", "Debt payment", "Savings goal", "Emergency fund"] },
  { key: "incomeRhythm", label: "Income rhythm", helper: "When money usually comes in.", icon: WalletCards, options: ["Daily income", "Weekly income", "Twice a month", "Monthly salary", "Irregular income"] },
  { key: "status", label: "Current status", helper: "Your current life stage.", icon: Briefcase, options: ["Student", "Working student", "Employee", "Freelancer", "Business owner", "Parent", "Between jobs"] },
  { key: "dependents", label: "Who depends on me?", helper: "People CLARA should consider before spending advice.", icon: Users, options: ["Just me", "Parents", "Partner / spouse", "Children", "Family household"] },
  { key: "age", label: "Age", helper: "Optional, but helps CLARA adjust tone.", icon: UserRound, input: "number" },
  { key: "coachingStyle", label: "Guidance tone", helper: "How firm CLARA should sound.", icon: HeartHandshake, options: ["Gentle", "Balanced", "Straightforward", "Strict"] },
];

function storageKey(user) {
  return `clara_me_basic_profile_${user?.id || user?.email || "guest"}`;
}

function readProfile(user) {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(window.localStorage.getItem(storageKey(user)) || "{}") };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(user, profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(user), JSON.stringify(profile));
  } catch {
    // optional local profile memory
  }
}

function getMoneyPersonalityResult(answers = {}) {
  const scores = Object.keys(PERSONALITY_RESULTS).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

  MONEY_PERSONALITY_QUESTIONS.forEach((question) => {
    const score = answers[question.id];
    if (score && scores[score] !== undefined) scores[score] += 1;
  });

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "balanced";
  return PERSONALITY_RESULTS[winner];
}

function MoneyPersonalityQuiz({ profile, setProfile }) {
  const answers = profile.personalityQuizAnswers || {};
  const answeredCount = MONEY_PERSONALITY_QUESTIONS.filter((question) => answers[question.id]).length;
  const initialStep = Math.min(answeredCount, MONEY_PERSONALITY_QUESTIONS.length - 1);
  const [step, setStep] = useState(initialStep);
  const question = MONEY_PERSONALITY_QUESTIONS[step];
  const completed = answeredCount === MONEY_PERSONALITY_QUESTIONS.length;
  const result = useMemo(() => getMoneyPersonalityResult(answers), [answers]);
  const progress = Math.round((answeredCount / MONEY_PERSONALITY_QUESTIONS.length) * 100);

  const answerQuestion = (score) => {
    const nextAnswers = { ...answers, [question.id]: score };
    const nextResult = getMoneyPersonalityResult(nextAnswers);

    setProfile((current) => ({
      ...current,
      personalityQuizAnswers: nextAnswers,
      personality: nextResult.label,
    }));

    if (step < MONEY_PERSONALITY_QUESTIONS.length - 1) {
      setStep((current) => current + 1);
    }
  };

  const resetQuiz = () => {
    setProfile((current) => ({
      ...current,
      personalityQuizAnswers: {},
      personality: "Balanced spender",
    }));
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
          {question.options.map((option) => (
            <button key={option.text} type="button" onClick={() => answerQuestion(option.score)} className="w-full rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3 text-left text-sm font-bold leading-5 text-white/72 transition hover:bg-white/[0.06] active:scale-[0.99]">
              {option.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditContextPanel({ profile, setProfile }) {
  const [fieldKey, setFieldKey] = useState(null);
  const field = FIELDS.find((item) => item.key === fieldKey);

  const selectOption = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setFieldKey(null);
  };

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(9,62,76,.96),rgba(16,24,55,.97)_46%,rgba(55,24,100,.96))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.24),0_0_38px_rgba(34,211,238,.08)]">
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Edit context</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{field ? field.label : "What should CLARA know about you?"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/72">{field ? field.helper : "These details help CLARA guide your spending with your real life in mind."}</p>
          </div>
          {field ? (
            <button type="button" onClick={() => setFieldKey(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60" aria-label="Back to context list">
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {field ? (
          field.kind === "quiz" ? (
            <MoneyPersonalityQuiz profile={profile} setProfile={setProfile} />
          ) : field.input === "number" ? (
            <input value={profile.age || ""} onChange={(event) => setProfile((current) => ({ ...current, age: event.target.value }))} inputMode="numeric" type="number" min="1" max="120" placeholder="Not set" className="mt-5 w-full rounded-2xl border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/35" />
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {field.options.map((option) => (
                <button key={option} type="button" onClick={() => selectOption(field.key, option)} className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-[0.98] ${profile[field.key] === option ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-50" : "border-white/12 bg-white/[0.045] text-white/58"}`}>
                  {option}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="mt-5 space-y-2.5">
            {FIELDS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} type="button" onClick={() => setFieldKey(item.key)} className="group flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] px-3.5 py-3 text-left transition hover:bg-white/[0.055] active:scale-[0.99]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-cyan-100/64"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{item.label}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-white/44">{profile[item.key] || "Not set"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/70" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function DashboardMeSimplePanel() {
  const { user } = useUserRole() || {};
  const [profile, setProfile] = useState(() => readProfile(user));

  useEffect(() => setProfile(readProfile(user)), [user?.id, user?.email]);
  useEffect(() => saveProfile(user, profile), [profile, user]);

  return <EditContextPanel profile={profile} setProfile={setProfile} />;
}
