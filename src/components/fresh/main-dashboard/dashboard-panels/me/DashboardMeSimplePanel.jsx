import { useEffect, useState } from "react";
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
};

const FIELDS = [
  { key: "personality", label: "Money personality", helper: "How you usually handle spending.", icon: Smile, options: ["Careful spender", "Balanced spender", "Impulse spender", "Goal-driven", "Generous spender"] },
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
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{field ? field.label : "What should CLARA remember?"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/72">{field ? field.helper : "Keep it simple. Change only what matters today."}</p>
          </div>
          {field ? (
            <button type="button" onClick={() => setFieldKey(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60" aria-label="Back to context list">
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {field ? (
          field.input === "number" ? (
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
