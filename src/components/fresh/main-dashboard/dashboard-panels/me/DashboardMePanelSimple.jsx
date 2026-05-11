import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, HeartHandshake, ShieldCheck, SlidersHorizontal, UserRound, WalletCards, X } from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_PROFILE = {
  tone: "Calm coach",
  decisionStyle: "Pause first",
  spendingStyle: "Balanced spender",
  trigger: "Small treats",
  responsibility: "Bills and family needs",
  protectedPriority: "Essentials first",
  strictness: "Balanced",
};

const SETUP_ITEMS = [
  {
    key: "defaults",
    icon: UserRound,
    title: "How CLARA talks to me",
    value: (p) => `${p.tone} • ${p.decisionStyle}`,
    hint: "Choose the tone and advice style.",
    fields: [
      { key: "tone", label: "Tone", options: ["Calm coach", "Gentle friend", "Straight talk", "Strict mentor"] },
      { key: "decisionStyle", label: "Advice style", options: ["Pause first", "Encourage wisely", "Protect budget", "Challenge wants"] },
    ],
  },
  {
    key: "personality",
    icon: WalletCards,
    title: "My spending style",
    value: (p) => `${p.spendingStyle} • ${p.trigger}`,
    hint: "Help CLARA understand your habits.",
    fields: [
      { key: "spendingStyle", label: "I am usually a...", options: ["Balanced spender", "Careful saver", "Impulse spender", "Goal-driven"] },
      { key: "trigger", label: "Common trigger", options: ["Small treats", "Online deals", "Social pressure", "Random cravings"] },
    ],
  },
  {
    key: "responsibilities",
    icon: HeartHandshake,
    title: "What CLARA should protect",
    value: (p) => `${p.responsibility} • ${p.protectedPriority}`,
    hint: "Set your real-life priorities.",
    fields: [
      { key: "responsibility", label: "Main responsibility", options: ["Bills and family needs", "Debt payments", "School/work costs", "Health needs"] },
      { key: "protectedPriority", label: "Protect first", options: ["Essentials first", "Emergency buffer", "Savings goal", "Upcoming commitments"] },
    ],
  },
  {
    key: "boundaries",
    icon: ShieldCheck,
    title: "Decision boundaries",
    value: (p) => `${p.strictness} guidance`,
    hint: "Choose how firm CLARA should be.",
    fields: [
      { key: "strictness", label: "Coach strictness", options: ["Gentle", "Balanced", "Firm", "Very strict"] },
    ],
  },
];

function initials(name = "") {
  const clean = String(name || "").trim();
  if (!clean) return "ME";
  return clean.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function displayName(user) {
  return user?.full_name || user?.display_name || user?.nickname || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Your CLARA self";
}

function planName({ plan, isPaid, isFree }) {
  if (isPaid && plan) return String(plan).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  if (isPaid) return "Unlocked";
  if (isFree) return "Free";
  return "CLARA";
}

function storageKey(user) {
  return `clara_me_profile_v3_${user?.id || user?.email || "guest"}`;
}

function readProfile(user) {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const latest = window.localStorage.getItem(storageKey(user));
    const legacy = window.localStorage.getItem(`clara_me_profile_v2_${user?.id || user?.email || "guest"}`);
    return latest || legacy ? { ...DEFAULT_PROFILE, ...JSON.parse(latest || legacy) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(user, profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(user), JSON.stringify(profile));
  } catch {
    // Personal setup save is optional.
  }
}

function Choice({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[12px] font-bold transition active:scale-[0.98] ${
        active ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-50" : "border-white/12 bg-white/[0.045] text-white/58"
      }`}
    >
      {children}
    </button>
  );
}

function SetupRow({ item, profile, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[24px] border p-4 text-left transition active:scale-[0.99] ${active ? "border-emerald-300/25 bg-emerald-300/[0.075]" : "border-white/12 bg-white/[0.035]"}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${active ? "border-emerald-300/25 bg-emerald-300/12 text-emerald-100" : "border-white/12 bg-white/[0.055] text-white/60"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{item.title}</p>
          <p className="mt-1 truncate text-xs font-semibold text-emerald-100/70">{item.value(profile)}</p>
          <p className="mt-1 truncate text-xs text-white/42">{item.hint}</p>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 transition ${active ? "rotate-90 text-emerald-100/70" : "text-white/25"}`} />
      </div>
    </button>
  );
}

function Editor({ item, profile, onChange, onClose }) {
  if (!item) return null;
  return (
    <section className="rounded-[24px] border border-emerald-300/18 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{item.title}</p>
          <p className="mt-1 text-xs leading-5 text-white/45">{item.hint}</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white/55" aria-label="Close Me setup">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {item.fields.map((field) => (
          <div key={field.key}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{field.label}</p>
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => (
                <Choice key={option} active={profile[field.key] === option} onClick={() => onChange(field.key, option)}>
                  {option}
                </Choice>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5 text-xs font-semibold text-white/48">
        <Check className="h-4 w-4 text-emerald-200/75" />
        Saved for your personal CLARA setup.
      </div>
    </section>
  );
}

export default function DashboardMePanelSimple() {
  const { user, plan, isPaid, isFree } = useUserRole() || {};
  const name = displayName(user);
  const email = user?.email || "Private account";
  const [activeKey, setActiveKey] = useState(null);
  const [profile, setProfile] = useState(() => readProfile(user));

  useEffect(() => setProfile(readProfile(user)), [user?.id, user?.email]);
  useEffect(() => saveProfile(user, profile), [profile, user]);

  const activeItem = useMemo(() => SETUP_ITEMS.find((item) => item.key === activeKey) || null, [activeKey]);
  const summary = useMemo(() => [profile.tone, profile.strictness].filter(Boolean).join(" • "), [profile.strictness, profile.tone]);
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <section className="rounded-[30px] border border-white/12 bg-[linear-gradient(135deg,rgba(13,65,78,0.72),rgba(16,24,55,0.86)_48%,rgba(55,24,100,0.78))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-white/16 bg-white/10 text-lg font-black text-white">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-black text-white">{name}</p>
              <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">{planName({ plan, isPaid, isFree })}</span>
            </div>
            <p className="mt-1 truncate text-xs text-white/52">{email}</p>
            <p className="mt-1 truncate text-[11px] font-bold text-emerald-100/58">{summary}</p>
          </div>
        </div>
        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/10 px-4 py-3">
          <p className="text-sm font-black text-white">Set up how CLARA understands you.</p>
          <p className="mt-1 text-xs leading-5 text-white/52">Keep this simple. LifeOS will handle schedules, ambitions, and future plans.</p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Me setup</p>
          <p className="mt-1 text-xs text-white/42">Four simple settings. Tap one to edit.</p>
        </div>
        <div className="space-y-2.5">
          {SETUP_ITEMS.map((item) => (
            <SetupRow key={item.key} item={item} profile={profile} active={activeKey === item.key} onClick={() => setActiveKey((current) => (current === item.key ? null : item.key))} />
          ))}
        </div>
      </section>

      <Editor item={activeItem} profile={profile} onChange={update} onClose={() => setActiveKey(null)} />

      <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.045] text-white/55">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Why this matters</p>
            <p className="mt-1 text-xs leading-5 text-white/45">These choices help CLARA give advice that feels personal without making the screen complicated.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
