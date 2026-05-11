import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Home,
  LayoutDashboard,
  ListChecks,
  Lock,
  Settings,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";

const tabs = [
  { key: "dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { key: "areas", label: "Life Areas", short: "Life Areas", icon: ListChecks },
  { key: "profile", label: "Life Profile", short: "Life Profile", icon: UserRound },
  { key: "history", label: "Decision History", short: "History", icon: Clock3 },
  { key: "insights", label: "Insights", short: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", short: "Settings", icon: Settings },
];

const subtitles = {
  dashboard: "Your life context for today's money decisions.",
  calendar: "Your timing shapes your money decisions.",
  areas: "Track the life context behind money behavior.",
  profile: "Stable information CLARA can use for better advice.",
  history: "Review what CLARA learned over time.",
  insights: "See patterns and behavior signals.",
  settings: "Control what CLARA can use and protect.",
};

function Orb({ compact = false }) {
  return (
    <div className={`${compact ? "h-10 w-10" : "h-12 w-12"} relative shrink-0 rounded-full shadow-[0_0_22px_rgba(34,211,238,.42),0_0_30px_rgba(236,72,153,.34)]`}>
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,#22d3ee,#2563eb,#a855f7,#ec4899,#22d3ee)]" />
      <div className="absolute inset-[7px] rounded-full bg-[#050713]" />
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-[26px] border border-cyan-300/18 bg-[#071026]/72 p-4 shadow-[0_14px_42px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.055)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function Kicker({ children }) {
  return <p className="text-[11px] font-black uppercase tracking-[0.23em] text-cyan-200/78">{children}</p>;
}

function Rail({ active, setActive, back }) {
  return (
    <aside className="hidden w-[92px] shrink-0 px-2 py-3 md:block">
      <div className="sticky top-3 flex min-h-[calc(100svh-1.5rem)] flex-col items-center rounded-[30px] border border-cyan-300/22 bg-[#07091b]/82 px-3 py-5 shadow-[0_0_28px_rgba(34,211,238,.12),0_0_40px_rgba(236,72,153,.10)] backdrop-blur-2xl">
        <Orb compact />
        <div className="my-5 h-px w-10 bg-gradient-to-r from-cyan-300/0 via-cyan-300/65 to-pink-400/0" />
        <div className="flex flex-1 flex-col gap-3">
          {tabs.map((tab) => {
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

function Chips({ active, setActive }) {
  return (
    <div className="relative mb-4 md:hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[#071026] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-[#171139] to-transparent" />
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pb-1">
          {tabs.map((tab) => {
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

function Header({ active }) {
  const tab = tabs.find((item) => item.key === active) || tabs[0];
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
          <p className="mt-1 max-w-[390px] text-sm leading-5 text-white/58">{subtitles[active]}</p>
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

function Row({ icon: Icon, title, detail, right }) {
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

function Signal({ icon: Icon, title, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[.035] p-4">
      <Icon className="h-5 w-5 text-cyan-100/78" />
      <p className="mt-3 text-[11px] font-black uppercase tracking-[.18em] text-white/35">{title}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function InsightCard({ children }) {
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

function DashboardContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>Today's life state</Kicker>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Signal icon={Target} title="Focus" value="Pay debt" />
          <Signal icon={WalletCards} title="Protect" value="Emergency fund" />
          <Signal icon={CalendarDays} title="Timing" value="Bill in 3 days" />
        </div>
      </Card>
      <Card className="border-pink-400/24">
        <Kicker>Timing risk</Kicker>
        <p className="mt-2 text-base font-semibold leading-6 text-white/88">You have a bill in 3 days, so this purchase may be risky.</p>
        <p className="mt-1 text-sm text-white/50">Review before spending.</p>
      </Card>
      <InsightCard>LifeOS connects timing, pressure, and priorities to money decisions.</InsightCard>
    </div>
  );
}

function CalendarContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>May 2025</Kicker>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-white/38">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm font-bold text-white/80">
          {Array.from({ length: 35 }, (_, i) => {
            const date = i < 3 ? 27 + i : i - 2;
            return <span key={i} className={date === 8 ? "rounded-full border border-cyan-300/70 bg-cyan-400/10 py-2 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,.26)]" : "py-2"}>{date}</span>;
          })}
        </div>
      </Card>
      <Card>
        <Kicker>Upcoming schedule</Kicker>
        <Row icon={CreditCard} title="Electric bill due in 3 days" right="May 10" />
        <Row icon={WalletCards} title="Payday on Friday" right="May 9" />
        <Row icon={Clock3} title="Planned purchase reminder" right="May 30" />
      </Card>
    </div>
  );
}

function AreasContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>Choose life area</Kicker>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {["Food & Daily Lifestyle", "Work & Career", "Goals & Future Plans", "Health & Wellness", "Friends & Social Life", "Debt & Obligations", "Family Responsibilities", "Values & Giving"].map((item) => (
            <button key={item} type="button" className="rounded-2xl border border-white/10 bg-white/[.025] px-3 py-3 text-left text-sm font-semibold text-white/68 transition hover:bg-white/[.045]">{item}</button>
          ))}
        </div>
      </Card>
      <Card>
        <Kicker>Guided check-in</Kicker>
        <Row icon={Sparkles} title="What happened today?" />
        <Row icon={Target} title="How did it affect your spending?" />
      </Card>
    </div>
  );
}

function ProfileContent() {
  return (
    <div className="space-y-4">
      <Card>
        <Kicker>Why life profile</Kicker>
        <p className="mt-3 text-sm leading-6 text-white/70">Life Profile helps CLARA understand your situation without making the app feel invasive.</p>
      </Card>
      <Card>
        <Kicker>Profile details</Kicker>
        {["Birthday", "Work status", "Income cycle", "Pay schedule", "Main goals", "Savings priorities", "Debt situation", "Family responsibilities", "Personal values", "Spending boundaries"].map((item) => <Row key={item} icon={UserRound} title={item} />)}
      </Card>
    </div>
  );
}

function Content({ active }) {
  if (active === "calendar") return <CalendarContent />;
  if (active === "areas") return <AreasContent />;
  if (active === "profile") return <ProfileContent />;
  if (active === "history") return <Card><Kicker>Recent history</Kicker><Row icon={Clock3} title="Work stress affected spending" right="Apr 27" /><Row icon={Sparkles} title="CLARA advised delaying a purchase" right="Apr 21" /></Card>;
  if (active === "insights") return <Card><Kicker>Key insights</Kicker><div className="mt-4 grid gap-3 md:grid-cols-3"><Signal icon={Target} title="Risk" value="Moderate" /><Signal icon={WalletCards} title="Protect" value="Food budget" /><Signal icon={Clock3} title="Pause" value="When stress is high" /></div></Card>;
  if (active === "settings") return <Card><Kicker>Privacy & access</Kicker><Row icon={Lock} title="Memory control" detail="Choose what CLARA can use." /><Row icon={Settings} title="LifeOS preferences" detail="Calendar, reminders, and access." /></Card>;
  return <DashboardContent />;
}

export default function LifeOS() {
  const [active, setActive] = useState("dashboard");
  const navigate = useNavigate();
  const topRef = useRef(null);

  useEffect(() => {
    const scrollParent = topRef.current?.closest("main");
    scrollParent?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const scrollParent = topRef.current?.closest("main");
    scrollParent?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  return (
    <div ref={topRef} className="min-h-screen bg-[#030713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(34,211,238,.14),transparent_29%),radial-gradient(circle_at_95%_10%,rgba(236,72,153,.14),transparent_28%),linear-gradient(180deg,#030713_0%,#040817_52%,#050713_100%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-5 md:px-5 md:py-4">
        <Rail active={active} setActive={setActive} back={() => navigate("/dashboard")} />
        <main className="min-w-0 flex-1 md:py-4">
          <button onClick={() => navigate("/dashboard")} className="mb-4 rounded-2xl border border-white/12 bg-white/[.04] px-3 py-2 text-xs font-bold text-white/62 md:hidden">Back to Dashboard</button>
          <Header active={active} />
          <Chips active={active} setActive={setActive} />
          <Content active={active} />
        </main>
      </div>
    </div>
  );
}
