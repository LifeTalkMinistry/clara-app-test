import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Home,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";

export const lifeOsTabs = [
  { key: "dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { key: "areas", label: "Life Areas", short: "Life Areas", icon: ListChecks },
  { key: "profile", label: "Life Profile", short: "Life Profile", icon: UserRound },
  { key: "history", label: "Decision History", short: "History", icon: Clock3 },
  { key: "insights", label: "Insights", short: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", short: "Settings", icon: Settings },
];

export const lifeOsSubtitles = {
  dashboard: "Your life context for today's money decisions.",
  calendar: "Your timing shapes your money decisions.",
  areas: "Track the life context behind money behavior.",
  profile: "Stable information CLARA can use for better advice.",
  history: "Review what CLARA learned over time.",
  insights: "See patterns and behavior signals.",
  settings: "Control what CLARA can use and protect.",
};

export function Orb({ compact = false }) {
  return (
    <div className={`${compact ? "h-10 w-10" : "h-12 w-12"} relative shrink-0 rounded-full shadow-[0_0_22px_rgba(34,211,238,.42),0_0_30px_rgba(236,72,153,.34)]`}>
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,#22d3ee,#2563eb,#a855f7,#ec4899,#22d3ee)]" />
      <div className="absolute inset-[7px] rounded-full bg-[#050713]" />
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <section className={`rounded-[26px] border border-cyan-300/18 bg-[#071026]/72 p-4 shadow-[0_14px_42px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.055)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export function Kicker({ children }) {
  return <p className="text-[11px] font-black uppercase tracking-[0.23em] text-cyan-200/78">{children}</p>;
}

export function Rail({ active, setActive, back }) {
  return (
    <aside className="hidden w-[92px] shrink-0 px-2 py-3 md:block">
      <div className="sticky top-3 flex min-h-[calc(100svh-1.5rem)] flex-col items-center rounded-[30px] border border-cyan-300/22 bg-[#07091b]/82 px-3 py-5 shadow-[0_0_28px_rgba(34,211,238,.12),0_0_40px_rgba(236,72,153,.10)] backdrop-blur-2xl">
        <Orb compact />
        <div className="my-5 h-px w-10 bg-gradient-to-r from-cyan-300/0 via-cyan-300/65 to-pink-400/0" />
        <div className="flex flex-1 flex-col gap-3">
          {lifeOsTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`grid h-12 w-12 place-items-center rounded-2xl border transition ${selected ? "border-cyan-300/50 bg-white/[.075] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,.22),0_0_18px_rgba(236,72,153,.16)]" : "border-transparent text-white/52 hover:border-white/12 hover:bg-white/[.045] hover:text-white"}`} aria-label={tab.label}>
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={back} className="mt-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-white/55" aria-label="Back to dashboard">
          <Home className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}

export function Chips({ active, setActive }) {
  return (
    <div className="relative mb-4 md:hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[#071026] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-[#171139] to-transparent" />
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pb-1">
          {lifeOsTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black transition active:scale-[.98] ${selected ? "border-cyan-300/45 bg-white/[.085] text-white shadow-[0_0_18px_rgba(34,211,238,.14),0_0_18px_rgba(236,72,153,.12)]" : "border-white/12 bg-white/[.035] text-white/52"}`}>
                <Icon className="h-3.5 w-3.5" />
                {tab.short}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Header({ active }) {
  const tab = lifeOsTabs.find((item) => item.key === active) || lifeOsTabs[0];
  const Icon = tab.icon;

  return (
    <div className="mb-4">
      <div className="mb-4 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2.5">
          <Orb compact />
          <span className="text-xs font-black uppercase tracking-[.28em] text-white/72">LifeOS</span>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-white md:text-4xl">{tab.label}</h1>
          <p className="mt-1 max-w-[390px] text-sm leading-5 text-white/58">{lifeOsSubtitles[active]}</p>
        </div>
        <button className="hidden items-center gap-3 rounded-[22px] border border-cyan-300/28 bg-white/[.045] px-4 py-3 text-sm font-bold text-white/78 md:flex">
          <Icon className="h-5 w-5 text-cyan-100" />
          {active === "calendar" ? "May 2025" : "LifeOS"}
          <ChevronRight className="h-4 w-4 text-white/45" />
        </button>
      </div>
    </div>
  );
}

export function Row({ icon: Icon, title, detail, right }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 border-b border-white/8 px-1 py-3 text-left last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[.04] text-cyan-100/78">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white/88">{title}</p>
        {detail ? <p className="mt-1 truncate text-xs text-white/45">{detail}</p> : null}
      </div>
      {right ? <span className="text-xs font-semibold text-white/42">{right}</span> : <ChevronRight className="h-4 w-4 text-white/32" />}
    </button>
  );
}

export function Signal({ icon: Icon, title, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[.035] p-4">
      <Icon className="h-5 w-5 text-cyan-100/78" />
      <p className="mt-3 text-[11px] font-black uppercase tracking-[.18em] text-white/35">{title}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

export function InsightCard({ children }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/18 bg-cyan-300/[.055] text-cyan-100">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <Kicker>CLARA Insight</Kicker>
          <p className="mt-1 text-sm leading-5 text-white/62">{children}</p>
        </div>
      </div>
    </Card>
  );
}
