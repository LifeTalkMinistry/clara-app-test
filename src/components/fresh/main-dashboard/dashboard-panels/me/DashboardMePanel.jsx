import {
  CalendarDays,
  HeartHandshake,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";

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

function MeInfoCard({ icon: Icon, title, description, badge }) {
  return (
    <div className="rounded-[24px] border border-white/15 bg-white/[0.045] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.14)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/70">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black text-white">{title}</p>
            {badge ? (
              <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/80">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/48">{description}</p>
        </div>
      </div>
    </div>
  );
}

function MePill({ children }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white/65">
      {children}
    </span>
  );
}

export default function DashboardMePanel() {
  const { user, plan, isPaid, isFree } = useUserRole() || {};
  const displayName = getDisplayName(user);
  const email = user?.email || "Private account";
  const initials = getInitials(displayName);
  const planLabel = getPlanLabel({ plan, isPaid, isFree });

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
          </div>
        </div>

        <div className="relative z-10 mt-4 rounded-[24px] border border-white/12 bg-black/15 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/60">
            Me is your default identity
          </p>
          <p className="mt-1 text-xs leading-5 text-white/62">
            This is where CLARA learns who you are by default: your money personality,
            responsibilities, comfort limits, and personal context. LifeOS will handle your
            schedules, ambitions, and future plans.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            Identity Core
          </p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            The stable details CLARA should remember before giving advice.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <MeInfoCard
            icon={UserRound}
            title="Personal defaults"
            badge="Base"
            description="Name, identity, preferred CLARA tone, and default decision style. This keeps Home focused on money decisions."
          />
          <MeInfoCard
            icon={WalletCards}
            title="Money personality"
            badge="Next"
            description="Your spending style, temptation triggers, comfort limits, and how strict CLARA should be before you buy."
          />
          <MeInfoCard
            icon={HeartHandshake}
            title="Responsibilities"
            badge="Next"
            description="People, bills, obligations, and protected priorities that should affect future spending advice."
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-white/15 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Decision boundaries</p>
            <p className="mt-1 text-xs leading-5 text-white/48">
              These are not schedules. They are your default guardrails: what CLARA should protect when you ask before spending.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <MePill>Protect essentials</MePill>
          <MePill>Pause wants</MePill>
          <MePill>Ask before spending</MePill>
          <MePill>Keep advice personal</MePill>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MeInfoCard
          icon={Target}
          title="Default goals"
          description="Your stable money priorities before LifeOS breaks them into plans."
        />
        <MeInfoCard
          icon={CalendarDays}
          title="Commitment hints"
          description="Upcoming obligations will connect here before LifeOS schedules them."
        />
        <MeInfoCard
          icon={SlidersHorizontal}
          title="Coach strictness"
          description="Choose how firm CLARA should sound when spending is risky."
        />
        <MeInfoCard
          icon={Sparkles}
          title="Personal patterns"
          description="Behavior signals that help CLARA feel aware, not repetitive."
        />
      </section>
    </div>
  );
}
