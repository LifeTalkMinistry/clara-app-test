import { useEffect, useState } from "react";
import { Briefcase, HeartHandshake, ShieldCheck, Smile, Users, WalletCards, X } from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_PROFILE = {
  personality: "Balanced spender",
  status: "Employee",
  dependents: "Just me",
  responsibility: "Bills and essentials",
  incomeRhythm: "Monthly salary",
  coachingStyle: "Balanced",
};

const FIELDS = [
  { key: "personality", label: "Money personality", icon: Smile, options: ["Careful spender", "Balanced spender", "Impulse spender", "Goal-driven", "Generous spender"] },
  { key: "responsibility", label: "Protect first", icon: ShieldCheck, options: ["Bills and essentials", "Food at home", "Family support", "Rent", "Debt payment", "Savings goal", "Emergency fund"] },
  { key: "incomeRhythm", label: "Income rhythm", icon: WalletCards, options: ["Daily income", "Weekly income", "Twice a month", "Monthly salary", "Irregular income"] },
  { key: "status", label: "Current status", icon: Briefcase, options: ["Student", "Working student", "Employee", "Freelancer", "Business owner", "Parent", "Between jobs"] },
  { key: "dependents", label: "Dependents", icon: Users, options: ["Just me", "Parents", "Partner / spouse", "Children", "Family household"] },
  { key: "coachingStyle", label: "Guidance tone", icon: HeartHandshake, options: ["Gentle", "Balanced", "Straightforward", "Strict"] },
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

function getName(user) {
  return user?.full_name || user?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")?.[0] || "CLARA User";
}

function getInitials(name) {
  return String(name || "CU").split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "CU";
}

function getPlanLabel({ plan, isPaid, isFree }) {
  if (isPaid && plan) return String(plan).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (isPaid) return "Unlocked";
  if (isFree) return "Free";
  return "CLARA";
}

function Chip({ children }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-bold text-white/62">{children}</span>;
}

function EditSheet({ profile, setProfile, onClose }) {
  const [fieldKey, setFieldKey] = useState(null);
  const field = FIELDS.find((item) => item.key === fieldKey);

  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && (field ? setFieldKey(null) : onClose());
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [field, onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[520px] rounded-[30px] border border-cyan-300/18 bg-[#071026]/96 p-5 shadow-[0_22px_80px_rgba(0,0,0,.55),0_0_38px_rgba(34,211,238,.10)] backdrop-blur-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Edit context</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">{field ? field.label : "What should CLARA remember?"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/52">Keep it simple. Change only what matters today.</p>
          </div>
          <button type="button" onClick={field ? () => setFieldKey(null) : onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {field ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {field.options.map((option) => (
              <button key={option} type="button" onClick={() => setProfile((current) => ({ ...current, [field.key]: option }))} className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-[0.98] ${profile[field.key] === option ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-50" : "border-white/12 bg-white/[0.045] text-white/58"}`}>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {FIELDS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} type="button" onClick={() => setFieldKey(item.key)} className="flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] px-3.5 py-3 text-left transition active:scale-[0.99]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-cyan-100/64"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{item.label}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-white/44">{profile[item.key]}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardMeSimplePanel() {
  const { user, plan, isPaid, isFree } = useUserRole() || {};
  const name = getName(user);
  const [profile, setProfile] = useState(() => readProfile(user));
  const [editing, setEditing] = useState(false);

  useEffect(() => setProfile(readProfile(user)), [user?.id, user?.email]);
  useEffect(() => saveProfile(user, profile), [profile, user]);

  return (
    <div>
      <section className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.72),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/18 bg-white/10 text-base font-black text-white transition active:scale-[0.98]" aria-label="Edit profile context">
            {getInitials(name)}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-black text-white">{name}</p>
              <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">{getPlanLabel({ plan, isPaid, isFree })}</span>
            </div>
            <p className="mt-1 truncate text-xs text-white/52">{user?.email || "Private account"}</p>
            <p className="mt-1.5 text-[11px] font-bold leading-4 text-cyan-100/58">How CLARA understands you before advice.</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          <Chip>{profile.personality}</Chip>
          <Chip>{profile.status}</Chip>
          <Chip>{profile.incomeRhythm}</Chip>
          <Chip>{profile.responsibility}</Chip>
        </div>
      </section>

      {editing ? <EditSheet profile={profile} setProfile={setProfile} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
