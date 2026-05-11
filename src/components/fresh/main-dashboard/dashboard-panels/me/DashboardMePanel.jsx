import { useEffect, useState } from "react";
import {
  Briefcase,
  ChevronRight,
  HeartHandshake,
  PiggyBank,
  ShieldCheck,
  Smile,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_ME_PROFILE = {
  personality: "Balanced spender",
  status: "Employee",
  age: "",
  dependents: "Just me",
  responsibility: "Bills and essentials",
  incomeRhythm: "Monthly salary",
  coachingStyle: "Balanced",
};

const PROFILE_FIELDS = [
  {
    key: "personality",
    label: "Money personality",
    helper: "How you usually handle spending.",
    icon: Smile,
    options: ["Careful spender", "Balanced spender", "Impulse spender", "Goal-driven", "Generous spender"],
  },
  {
    key: "status",
    label: "Current status",
    helper: "Your current life stage.",
    icon: Briefcase,
    options: ["Student", "Working student", "Employee", "Freelancer", "Business owner", "Parent", "Single parent", "Between jobs"],
  },
  {
    key: "age",
    label: "Age",
    helper: "Optional, but helps CLARA adjust tone.",
    icon: UserRound,
    input: "number",
  },
  {
    key: "dependents",
    label: "Who depends on me?",
    helper: "People CLARA should consider before spending advice.",
    icon: Users,
    options: ["Just me", "Parents", "Partner / spouse", "Children", "Siblings", "Family household", "Others"],
  },
  {
    key: "responsibility",
    label: "Protect first",
    helper: "The priority CLARA should protect before wants.",
    icon: ShieldCheck,
    options: ["Bills and essentials", "Food at home", "Family support", "Rent", "Debt payment", "Medical needs", "Savings goal", "Emergency fund"],
  },
  {
    key: "incomeRhythm",
    label: "Income rhythm",
    helper: "When money usually comes in.",
    icon: WalletCards,
    options: ["Daily income", "Weekly income", "Twice a month", "Monthly salary", "Irregular income", "No active income yet"],
  },
  {
    key: "coachingStyle",
    label: "Guide me like this",
    helper: "How firm CLARA should sound.",
    icon: HeartHandshake,
    options: ["Gentle", "Balanced", "Straightforward", "Strict"],
  },
];

function getInitials(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "ME";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getDisplayName(user) {
  return (
    user?.full_name ||
    user?.display_name ||
    user?.nickname ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")?.[0] ||
    "Your CLARA profile"
  );
}

function getPlanLabel({ plan, isPaid, isFree }) {
  if (isPaid && plan) {
    return String(plan)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  if (isPaid) return "Unlocked";
  if (isFree) return "Free";
  return "CLARA";
}

function getStorageKey(user) {
  return `clara_me_basic_profile_${user?.id || user?.email || "guest"}`;
}

function readProfile(user) {
  if (typeof window === "undefined") return DEFAULT_ME_PROFILE;

  try {
    const latest = window.localStorage.getItem(getStorageKey(user));
    const legacy = window.localStorage.getItem(
      `clara_me_profile_v3_${user?.id || user?.email || "guest"}`
    ) || window.localStorage.getItem(
      `clara_me_profile_v2_${user?.id || user?.email || "guest"}`
    );

    const parsed = latest || legacy ? JSON.parse(latest || legacy) : {};

    return {
      ...DEFAULT_ME_PROFILE,
      personality: parsed.personality || parsed.spendingStyle || DEFAULT_ME_PROFILE.personality,
      status: parsed.status || DEFAULT_ME_PROFILE.status,
      age: parsed.age || DEFAULT_ME_PROFILE.age,
      dependents: parsed.dependents || DEFAULT_ME_PROFILE.dependents,
      responsibility: parsed.responsibility || DEFAULT_ME_PROFILE.responsibility,
      incomeRhythm: parsed.incomeRhythm || DEFAULT_ME_PROFILE.incomeRhythm,
      coachingStyle: parsed.coachingStyle || parsed.strictness || DEFAULT_ME_PROFILE.coachingStyle,
    };
  } catch {
    return DEFAULT_ME_PROFILE;
  }
}

function saveProfile(user, profile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(user), JSON.stringify(profile));
  } catch {
    // Personal setup saving is optional.
  }
}

function ChoiceButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-[0.98] ${
        active
          ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-50"
          : "border-white/12 bg-white/[0.045] text-white/58 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

function ProfileRow({ field, value, active, onClick }) {
  const Icon = field.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[22px] border px-4 py-3.5 text-left transition active:scale-[0.99] ${
        active
          ? "border-emerald-300/25 bg-emerald-300/[0.075]"
          : "border-white/12 bg-white/[0.035] hover:bg-white/[0.055]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
            active
              ? "border-emerald-300/25 bg-emerald-300/12 text-emerald-100"
              : "border-white/12 bg-white/[0.055] text-white/58"
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{field.label}</p>
          <p className="mt-1 truncate text-xs font-semibold text-emerald-100/68">
            {value || "Not set"}
          </p>
        </div>

        <ChevronRight
          className={`h-4 w-4 shrink-0 transition ${
            active ? "rotate-90 text-emerald-100/70" : "text-white/25 group-hover:text-white/50"
          }`}
        />
      </div>
    </button>
  );
}

function FieldEditor({ field, profile, onChange, onClose }) {
  if (!field) return null;

  return (
    <section className="rounded-[24px] border border-emerald-300/18 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{field.label}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">{field.helper}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white/55"
          aria-label="Close Me setup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {field.input === "number" ? (
        <input
          value={profile[field.key] || ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          inputMode="numeric"
          type="number"
          min="1"
          max="120"
          placeholder="Enter age"
          className="mt-4 w-full rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/35"
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {field.options.map((option) => (
            <ChoiceButton
              key={option}
              active={profile[field.key] === option}
              onClick={() => onChange(field.key, option)}
            >
              {option}
            </ChoiceButton>
          ))}
        </div>
      )}

      <p className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5 text-xs font-semibold text-white/45">
        Saved for CLARA's personal setup.
      </p>
    </section>
  );
}

export default function DashboardMePanel() {
  const { user, plan, isPaid, isFree } = useUserRole() || {};
  const displayName = getDisplayName(user);
  const email = user?.email || "Private account";
  const initials = getInitials(displayName);
  const planLabel = getPlanLabel({ plan, isPaid, isFree });
  const [activeKey, setActiveKey] = useState(null);
  const [profile, setProfile] = useState(() => readProfile(user));

  useEffect(() => {
    setProfile(readProfile(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    saveProfile(user, profile);
  }, [profile, user]);

  const activeField = PROFILE_FIELDS.find((field) => field.key === activeKey) || null;

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.72),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/16 bg-white/10 text-lg font-black text-white">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-black text-white">{displayName}</p>
              <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                {planLabel}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-white/52">{email}</p>
            <p className="mt-1 truncate text-[11px] font-bold text-emerald-100/58">
              {profile.personality} • {profile.status}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/10 px-4 py-3">
          <p className="text-sm font-black text-white">Tell CLARA the basics.</p>
          <p className="mt-1 text-xs leading-5 text-white/52">
            Simple details only. LifeOS will handle schedules, plans, and ambitions.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            Basic profile
          </p>
          <p className="mt-1 text-xs text-white/42">Tap any row to edit.</p>
        </div>

        <div className="space-y-2.5">
          {PROFILE_FIELDS.map((field) => (
            <ProfileRow
              key={field.key}
              field={field}
              value={profile[field.key]}
              active={activeKey === field.key}
              onClick={() => setActiveKey((current) => (current === field.key ? null : field.key))}
            />
          ))}
        </div>
      </section>

      <FieldEditor
        field={activeField}
        profile={profile}
        onChange={updateProfile}
        onClose={() => setActiveKey(null)}
      />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-white/55">
            <PiggyBank className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Why CLARA asks</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              The same purchase can mean different things depending on your age, status, income rhythm, and responsibilities.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
