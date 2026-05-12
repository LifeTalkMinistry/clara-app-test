import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
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
    shortLabel: "Personality",
    helper: "How you usually handle spending.",
    icon: Smile,
    options: ["Careful spender", "Balanced spender", "Impulse spender", "Goal-driven", "Generous spender"],
  },
  {
    key: "responsibility",
    label: "Protect first",
    shortLabel: "Protect",
    helper: "The priority CLARA should protect before wants.",
    icon: ShieldCheck,
    options: ["Bills and essentials", "Food at home", "Family support", "Rent", "Debt payment", "Medical needs", "Savings goal", "Emergency fund"],
  },
  {
    key: "incomeRhythm",
    label: "Income rhythm",
    shortLabel: "Income",
    helper: "When money usually comes in.",
    icon: WalletCards,
    options: ["Daily income", "Weekly income", "Twice a month", "Monthly salary", "Irregular income", "No active income yet"],
  },
  {
    key: "status",
    label: "Current status",
    shortLabel: "Status",
    helper: "Your current life stage.",
    icon: Briefcase,
    options: ["Student", "Working student", "Employee", "Freelancer", "Business owner", "Parent", "Single parent", "Between jobs"],
  },
  {
    key: "dependents",
    label: "Who depends on me?",
    shortLabel: "Depends",
    helper: "People CLARA should consider before spending advice.",
    icon: Users,
    options: ["Just me", "Parents", "Partner / spouse", "Children", "Siblings", "Family household", "Others"],
  },
  {
    key: "age",
    label: "Age",
    shortLabel: "Age",
    helper: "Optional, but helps CLARA adjust tone.",
    icon: UserRound,
    input: "number",
  },
  {
    key: "coachingStyle",
    label: "Guide me like this",
    shortLabel: "Tone",
    helper: "How firm CLARA should sound.",
    icon: HeartHandshake,
    options: ["Gentle", "Balanced", "Straightforward", "Strict"],
  },
];

const MAIN_KEYS = ["personality", "responsibility", "incomeRhythm", "status"];
const EXTRA_KEYS = ["dependents", "age", "coachingStyle"];

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
    const parsed = latest ? JSON.parse(latest) : {};

    return {
      ...DEFAULT_ME_PROFILE,
      ...parsed,
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

function getField(key) {
  return PROFILE_FIELDS.find((field) => field.key === key);
}

function getGuidanceIdentity(profile) {
  const responsibility = profile.responsibility || "your priorities";
  const rhythm = profile.incomeRhythm || "your income rhythm";
  const dependents = profile.dependents || "your responsibilities";

  if (String(profile.personality).toLowerCase().includes("impulse")) {
    return `CLARA will slow down optional spending and protect ${responsibility.toLowerCase()} first.`;
  }

  if (String(profile.incomeRhythm).toLowerCase().includes("irregular")) {
    return "CLARA will protect flexibility before lifestyle upgrades.";
  }

  if (String(profile.dependents).toLowerCase() !== "just me") {
    return `Because ${dependents.toLowerCase()} depend on you, CLARA will weigh responsibility before comfort spending.`;
  }

  return `With a ${rhythm.toLowerCase()} rhythm, CLARA will protect ${responsibility.toLowerCase()} before optional spending.`;
}

function ChoiceButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-[0.98] ${
        active
          ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,.12)]"
          : "border-white/12 bg-white/[0.045] text-white/58 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

function EditSheet({ field, value, onChange, onClose }) {
  useEffect(() => {
    if (!field) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [field, onClose]);

  if (!field) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[30px] border border-cyan-300/18 bg-[#071026]/96 p-5 shadow-[0_22px_80px_rgba(0,0,0,.55),0_0_38px_rgba(34,211,238,.10)] backdrop-blur-2xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Me context</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{field.label}</h3>
            <p className="mt-2 text-sm leading-6 text-white/52">{field.helper}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {field.input === "number" ? (
          <input
            value={value || ""}
            onChange={(event) => onChange(field.key, event.target.value)}
            inputMode="numeric"
            type="number"
            min="1"
            max="120"
            placeholder="Enter age"
            className="mt-5 w-full rounded-2xl border border-white/12 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/35"
          />
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {field.options.map((option) => (
              <ChoiceButton key={option} active={value === option} onClick={() => onChange(field.key, option)}>
                {option}
              </ChoiceButton>
            ))}
          </div>
        )}

        <p className="mt-5 text-xs font-semibold leading-5 text-white/40">
          This helps CLARA understand the person behind the purchase, not just the number.
        </p>
      </div>
    </div>
  );
}

function SnapshotChip({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-bold text-white/62">
      {children}
    </span>
  );
}

function IdentitySnapshot({ displayName, email, initials, planLabel, profile, onEdit }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.72),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/18 bg-white/10 text-base font-black text-white transition active:scale-[0.98]"
          aria-label="Edit profile basics"
        >
          {initials}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-black text-white">{displayName}</p>
            <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
              {planLabel}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-white/52">{email}</p>
          <p className="mt-1.5 text-[11px] font-bold leading-4 text-cyan-100/58">
            How CLARA understands you before advice.
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        <SnapshotChip>{profile.personality}</SnapshotChip>
        <SnapshotChip>{profile.status}</SnapshotChip>
        <SnapshotChip>{profile.incomeRhythm}</SnapshotChip>
        <SnapshotChip>{profile.responsibility}</SnapshotChip>
      </div>
    </section>
  );
}

function ContextTile({ field, value, onClick, compact = false }) {
  const Icon = field.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[20px] border border-white/10 bg-white/[0.032] text-left transition hover:border-cyan-300/18 hover:bg-white/[0.052] active:scale-[0.99] ${
        compact ? "px-3 py-2.5" : "p-3.5"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-cyan-100/62 transition group-hover:text-cyan-100">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-white/32">{field.shortLabel || field.label}</p>
          <p className="mt-1 truncate text-xs font-black text-white/82">{value || "Not set"}</p>
        </div>
      </div>
    </button>
  );
}

function MeContextCard({ profile, onEdit }) {
  return (
    <section className="rounded-[28px] border border-white/12 bg-white/[0.03] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Life context</p>
          <p className="mt-1 text-xs leading-5 text-white/45">Tap any detail to adjust how CLARA guides you.</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {MAIN_KEYS.map((key) => {
          const field = getField(key);
          return (
            <ContextTile
              key={key}
              field={field}
              value={profile[key]}
              onClick={() => onEdit(key)}
            />
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {EXTRA_KEYS.map((key) => {
          const field = getField(key);
          return (
            <ContextTile
              key={key}
              compact
              field={field}
              value={profile[key]}
              onClick={() => onEdit(key)}
            />
          );
        })}
      </div>

      <div className="mt-3 rounded-[20px] border border-white/8 bg-black/10 px-3 py-2.5">
        <p className="text-xs font-semibold leading-5 text-white/50">
          {getGuidanceIdentity(profile)}
        </p>
      </div>
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

  const activeField = useMemo(() => getField(activeKey), [activeKey]);

  const updateProfile = (key, value) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-3.5">
      <IdentitySnapshot
        displayName={displayName}
        email={email}
        initials={initials}
        planLabel={planLabel}
        profile={profile}
        onEdit={() => setActiveKey("personality")}
      />

      <MeContextCard profile={profile} onEdit={setActiveKey} />

      <EditSheet
        field={activeField}
        value={activeKey ? profile[activeKey] : ""}
        onChange={updateProfile}
        onClose={() => setActiveKey(null)}
      />
    </div>
  );
}
