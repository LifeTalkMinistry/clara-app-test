import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  HeartHandshake,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

const DEFAULT_ME_PROFILE = {
  tone: "Calm coach",
  decisionStyle: "Pause first",
  spendingStyle: "Balanced spender",
  trigger: "Small treats",
  strictness: "Balanced",
  protectedPriority: "Essentials first",
  responsibility: "Bills and family needs",
  defaultGoal: "Protect monthly money",
};

const EDITOR_CONFIG = {
  defaults: {
    title: "Personal defaults",
    subtitle: "How CLARA should speak and guide you by default.",
    fields: [
      {
        key: "tone",
        label: "CLARA tone",
        options: ["Calm coach", "Straight talk", "Gentle friend", "Strict mentor"],
      },
      {
        key: "decisionStyle",
        label: "Default decision style",
        options: ["Pause first", "Encourage wisely", "Protect budget", "Challenge wants"],
      },
    ],
  },
  personality: {
    title: "Money personality",
    subtitle: "Your usual spending behavior and temptation pattern.",
    fields: [
      {
        key: "spendingStyle",
        label: "Spending style",
        options: ["Balanced spender", "Careful saver", "Impulse spender", "Goal-driven"],
      },
      {
        key: "trigger",
        label: "Common trigger",
        options: ["Small treats", "Stress spending", "Online deals", "Social pressure"],
      },
    ],
  },
  responsibilities: {
    title: "Responsibilities",
    subtitle: "The obligations CLARA should protect before lifestyle spending.",
    fields: [
      {
        key: "responsibility",
        label: "Main responsibility",
        options: ["Bills and family needs", "Debt payments", "School/work costs", "Health needs"],
      },
      {
        key: "protectedPriority",
        label: "Protected priority",
        options: ["Essentials first", "Emergency buffer", "Savings goal", "Upcoming commitments"],
      },
    ],
  },
  boundaries: {
    title: "Decision boundaries",
    subtitle: "How firm CLARA should be when a purchase feels risky.",
    fields: [
      {
        key: "strictness",
        label: "Coach strictness",
        options: ["Gentle", "Balanced", "Firm", "Very strict"],
      },
      {
        key: "defaultGoal",
        label: "Default money goal",
        options: ["Protect monthly money", "Build savings", "Avoid impulse buys", "Stay under budget"],
      },
    ],
  },
};

function getInitials(value = "") {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "ME";

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
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
    "Your CLARA self"
  );
}

function getPlanLabel({ plan, isPaid, isFree }) {
  if (isPaid && plan) {
    return String(plan)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (isPaid) return "Unlocked";
  if (isFree) return "Free";
  return "CLARA";
}

function getStorageKey(user) {
  return `clara_me_profile_v2_${user?.id || user?.email || "guest"}`;
}

function readStoredProfile(user) {
  if (typeof window === "undefined") return DEFAULT_ME_PROFILE;

  try {
    const raw = window.localStorage.getItem(getStorageKey(user));
    if (!raw) return DEFAULT_ME_PROFILE;

    return {
      ...DEFAULT_ME_PROFILE,
      ...JSON.parse(raw),
    };
  } catch (error) {
    console.warn("CLARA Me profile fallback used:", error);
    return DEFAULT_ME_PROFILE;
  }
}

function saveStoredProfile(user, profile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getStorageKey(user), JSON.stringify(profile));
  } catch (error) {
    console.warn("CLARA Me profile save skipped:", error);
  }
}

function MePill({ children, active = false, onClick }) {
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
        active
          ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
          : "border-white/15 bg-white/[0.06] text-white/65"
      }`}
    >
      {children}
    </Tag>
  );
}

function MeActionCard({ icon: Icon, title, value, description, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[24px] border border-white/15 bg-white/[0.045] p-4 text-left shadow-[0_14px_34px_rgba(0,0,0,0.14)] backdrop-blur-xl transition hover:bg-white/[0.07] active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/70 transition group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-black text-white">{title}</p>
            <div className="flex shrink-0 items-center gap-2">
              {badge ? (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/80">
                  {badge}
                </span>
              ) : null}
              <ChevronRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
            </div>
          </div>

          <p className="mt-1 truncate text-xs font-bold text-emerald-100/75">{value}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/48">{description}</p>
        </div>
      </div>
    </button>
  );
}

function MeEditor({ activeEditor, profile, onChange, onClose }) {
  const config = EDITOR_CONFIG[activeEditor];
  if (!config) return null;

  return (
    <section className="rounded-[28px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),rgba(255,255,255,0.045)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{config.title}</p>
          <p className="mt-1 text-xs leading-5 text-white/48">{config.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white/65 transition hover:bg-white/12"
          aria-label="Close Me editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {config.fields.map((field) => (
          <div key={field.key}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
              {field.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => (
                <MePill
                  key={option}
                  active={profile[field.key] === option}
                  onClick={() => onChange(field.key, option)}
                >
                  {option}
                </MePill>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-xs font-semibold text-white/50">
        <Check className="h-4 w-4 text-emerald-200/75" />
        Saved on this device for CLARA's personal context layer.
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
  const [activeEditor, setActiveEditor] = useState(null);
  const [profile, setProfile] = useState(() => readStoredProfile(user));

  useEffect(() => {
    setProfile(readStoredProfile(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    saveStoredProfile(user, profile);
  }, [profile, user]);

  const identitySummary = useMemo(
    () => [profile.tone, profile.decisionStyle, profile.strictness].filter(Boolean).join(" • "),
    [profile.decisionStyle, profile.strictness, profile.tone]
  );

  const updateProfileValue = (key, value) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.24),transparent_36%),radial-gradient(circle_at_100%_100%,rgba(124,58,237,0.30),transparent_42%),linear-gradient(135deg,rgba(8,47,73,0.86),rgba(15,23,42,0.92)_48%,rgba(46,16,101,0.88))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-52 w-52 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-white/20 bg-white/10 text-xl font-black tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-black tracking-tight text-white">{displayName}</p>
              <span className="shrink-0 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                {planLabel}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-white/55">{email}</p>
            <p className="mt-1 truncate text-[11px] font-bold text-emerald-100/55">{identitySummary}</p>
          </div>
        </div>

        <div className="relative z-10 mt-4 rounded-[24px] border border-white/12 bg-black/15 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/60">
            Me is your default identity
          </p>
          <p className="mt-1 text-xs leading-5 text-white/62">
            Your stable personal context. Schedules and ambitions belong in LifeOS.
          </p>
        </div>
      </section>

      {activeEditor ? (
        <MeEditor
          activeEditor={activeEditor}
          profile={profile}
          onChange={updateProfileValue}
          onClose={() => setActiveEditor(null)}
        />
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            Identity Core
          </p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Tap a card to shape how CLARA understands you.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <MeActionCard
            icon={UserRound}
            title="Personal defaults"
            value={`${profile.tone} • ${profile.decisionStyle}`}
            badge="Edit"
            description="Set CLARA's voice and default advice style."
            onClick={() => setActiveEditor("defaults")}
          />
          <MeActionCard
            icon={WalletCards}
            title="Money personality"
            value={`${profile.spendingStyle} • ${profile.trigger}`}
            badge="Edit"
            description="Tell CLARA what usually triggers spending."
            onClick={() => setActiveEditor("personality")}
          />
          <MeActionCard
            icon={HeartHandshake}
            title="Responsibilities"
            value={`${profile.responsibility} • ${profile.protectedPriority}`}
            badge="Edit"
            description="Protect the obligations that matter before wants."
            onClick={() => setActiveEditor("responsibilities")}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-white/15 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setActiveEditor("boundaries")}
          className="group flex w-full items-start gap-3 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-white">Decision boundaries</p>
              <ChevronRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
            </div>
            <p className="mt-1 text-xs leading-5 text-white/48">
              {profile.strictness} guidance • {profile.defaultGoal}
            </p>
          </div>
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          <MePill active={profile.protectedPriority === "Essentials first"}>Protect essentials</MePill>
          <MePill active={profile.defaultGoal === "Avoid impulse buys"}>Pause wants</MePill>
          <MePill active={profile.decisionStyle === "Pause first"}>Ask before spending</MePill>
          <MePill active={profile.tone === "Calm coach"}>Keep advice personal</MePill>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MeActionCard
          icon={Target}
          title="Default goals"
          value={profile.defaultGoal}
          description="Your stable money priority before LifeOS breaks it into a plan."
          onClick={() => setActiveEditor("boundaries")}
        />
        <MeActionCard
          icon={CalendarDays}
          title="Commitment hints"
          value="Connects to LifeOS later"
          description="Upcoming obligations will influence future spending decisions."
          onClick={() => setActiveEditor("responsibilities")}
        />
        <MeActionCard
          icon={SlidersHorizontal}
          title="Coach strictness"
          value={profile.strictness}
          description="Controls how firm CLARA should sound when spending is risky."
          onClick={() => setActiveEditor("boundaries")}
        />
        <MeActionCard
          icon={Sparkles}
          title="Personal patterns"
          value="Learning layer"
          description="Behavior signals that will help CLARA feel aware, not repetitive."
          onClick={() => setActiveEditor("personality")}
        />
      </section>
    </div>
  );
}
