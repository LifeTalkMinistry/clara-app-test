import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
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
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "areas", label: "Life Areas", icon: ListChecks },
  { key: "profile", label: "Life Profile", icon: UserRound },
  { key: "history", label: "Decision History", icon: Clock3 },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

function Orb() {
  return (
    <div className="relative h-12 w-12 shrink-0 rounded-full shadow-[0_0_28px_rgba(34,211,238,.45),0_0_34px_rgba(236,72,153,.36)]">
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_120deg,#22d3ee,#2563eb,#a855f7,#ec4899,#22d3ee)]" />
      <div className="absolute inset-[7px] rounded-full bg-[#050713]" />
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-[28px] border border-cyan-300/20 bg-[#071026]/75 p-4 shadow-[0_18px_50px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function Kicker({ children }) {
  return <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/80">{children}</p>;
}

function Rail({ active, setActive, back }) {
  return (
    <aside className="hidden w-[92px] shrink-0 px-2 py-3 sm:block">
      <div className="sticky top-3 flex min-h-[calc(100svh-1.5rem)] flex-col items-center rounded-[30px] border border-cyan-300/25 bg-[#07091b]/82 px-3 py-5 shadow-[0_0_28px_rgba(34,211,238,.14),0_0_40px_rgba(236,72,153,.10)] backdrop-blur-2xl">
        <Orb />
        <div className="my-5 h-px w-10 bg-gradient-to-r from-cyan-300/0 via-cyan-300/70 to-pink-400/0" />
        <div className="flex flex-1 flex-col gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)} className={`grid h-12 w-12 place-items-center rounded-2xl border transition ${selected ? "border-cyan-300/55 bg-white/[.075] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.24),0_0_20px_rgba(236,72,153,.18)]" : "border-transparent text-white/58 hover:border-white/12 hover:bg-white/[.045] hover:text-white"}`} aria-label={tab.label}>
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
        <button onClick={back} className="mt-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-white/55" aria-label="Back to dashboard">
          <Home className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}

function Chips({ active, setActive }) {
  return (
    <div className="mb-4 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden">
      <div className="flex gap-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button key={tab.key} onClick={() => setActive(tab.key)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black ${selected ? "border-cyan-300/45 bg-white/[.085] text-white shadow-[0_0_20px_rgba(34,211,238,.15),0_0_20px_rgba(236,72,153,.13)]" : "border-white/12 bg-white/[.035] text-white/55"}`}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ icon: Icon, title, detail, right }) {
  return (
    <button className="flex w-full items-center gap-3 border-b border-white/8 px-1 py-3 text-left last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[.04] text-cyan-100/80">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white/88">{title}</p>
        {detail ? <p className="mt-1 truncate text-xs text-white/45">{detail}</p> : null}
      </div>
      {right ? <span className="text-xs font-semibold text-white/42">{right}</span> : <ChevronRight className="h-4 w-4 text-white/35" />}
    </button>
  );
}

function Signal({ icon: Icon, title, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[.035] p-4">
      <Icon className="h-5 w-5 text-cyan-100/80" />
      <p className="mt-3 text-[11px] font-black uppercase tracking-[.18em] text-white/35">{title}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Header({ active }) {
  const tab = tabs.find((item) => item.key === active) || tabs[0];
  const subtitle = active === "calendar" ? "Your timing shapes your money decisions." : active === "areas" ? "Track the life context behind money behavior." : active === "profile" ? "Stable information CLARA can use for better advice." : active === "history" ? "Review what CLARA learned over time." : active === "insights" ? "See patterns and behavior signals." : active === "settings" ? "Control what CLARA can use and protect." : "Your life context for today's money decisions.";
  const Icon = tab.icon;

  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-black tracking-tight text-white sm:text-4xl">{tab.label}</h1>
        <p className="mt-1 max-w-[390px] text-sm leading-5 text-white/58">{subtitle}</p>
      </div>
      <button className="hidden items-center gap-3 rounded-[22px] border border-cyan-300/30 bg-white/[.045] px-4 py-3 text-sm font-bold text-white/80 sm:flex">
        <Icon className="h-5 w-5 text-cyan-100" />
        {active === "calendar" ? "May 2025" : "LifeOS"}
        <ChevronRight className="h-4 w-4 text-white/45" />
      </button>
    </div>
  );
}

function Content({ active }) {
  if (active === "calendar") {
    return (
      <div className="space-y-4">
        <Card>
          <Kicker>May 2025</Kicker>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-sm font-bold text-white/80">
            {Array.from({ length: 35 }, (_, i) => (
              <span key={i} className={i === 10 ? "rounded-full border border-cyan-300/70 bg-cyan-400/10 py-2 text-cyan-100" : "py-2"}>{i < 3 ? 27 + i : i - 2}</span>
            ))}
          </div>
        </Card>
        <Card>
          <Kicker>Upcoming Schedule</Kicker>
          <Row icon={CreditCard} title="Electric bill due in 3 days" right="May 10" />
          <Row icon={WalletCards} title="Payday on Friday" right="May 9" />
          <Row icon={Clock3} title="Planned purchase reminder" right="May 30" />
        </Card>
      </div>
    );
  }

  if (active === "areas") {
    return (
      <div className="space-y-4">
        <Card>
          <Kicker>Choose Life Area</Kicker>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["Food & Daily Lifestyle", "Work & Career", "Goals & Future Plans", "Health & Wellness", "Friends & Social Life", "Debt & Obligations", "Family Responsibilities", "Values & Giving"].map((item) => (
              <button key={item} className="rounded-2xl border border-white/10 bg-white/[.025] px-3 py-3 text-left text-sm font-semibold text-white/68">{item}</button>
            ))}
          </div>
        </Card>
        <Card>
          <Kicker>Guided Check-in</Kicker>
          <Row icon={Sparkles} title="What happened today?" />
          <Row icon={Target} title="How did it affect your spending?" />
        </Card>
      </div>
    );
  }

  if (active === "profile") {
    return (
      <div className="space-y-4">
        <Card>
          <Kicker>Why Life Profile</Kicker>
          <p className="mt-3 text-sm leading-6 text-white/70">Life Profile helps CLARA understand your situation without making the app feel invasive.</p>
        </Card>
        <Card>
          <Kicker>Profile Details</Kicker>
          {["Birthday", "Work status", "Income cycle", "Pay schedule", "Main goals", "Savings priorities", "Debt situation", "Family responsibilities", "Personal values", "Spending boundaries"].map((item) => <Row key={item} icon={UserRound} title={item} />)}
        </Card>
      </div>
    );
  }

  if (active === "history") return <Card><Kicker>Recent History</Kicker><Row icon={Clock3} title="Work stress affected spending" right="Apr 27" /><Row icon={Sparkles} title="CLARA advised delaying a purchase" right="Apr 21" /></Card>;
  if (active === "insights") return <Card><Kicker>Key Insights</Kicker><div className="mt-4 grid gap-3 sm:grid-cols-3"><Signal icon={Target} title="Risk" value="Moderate" /><Signal icon={WalletCards} title="Protect" value="Food budget" /><Signal icon={Clock3} title="Pause" value="When stress is high" /></div></Card>;
  if (active === "settings") return <Card><Kicker>Privacy & Access</Kicker><Row icon={Lock} title="Memory control" detail="Choose what CLARA can use." /><Row icon={Settings} title="LifeOS preferences" detail="Calendar, reminders, and access." /></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <Kicker>Today's Life State</Kicker>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Signal icon={Target} title="Focus" value="Pay debt" />
          <Signal icon={WalletCards} title="Protect" value="Emergency fund" />
          <Signal icon={CalendarDays} title="Timing" value="Bill in 3 days" />
        </div>
      </Card>
      <Card className="border-pink-400/24">
        <Kicker>Timing Risk</Kicker>
        <p className="mt-2 text-base font-semibold leading-6 text-white/88">You have a bill in 3 days, so this purchase may be risky.</p>
        <p className="mt-1 text-sm text-white/50">Review before spending.</p>
      </Card>
    </div>
  );
}

export default function LifeOS() {
  const [active, setActive] = useState("dashboard");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_6%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_95%_10%,rgba(236,72,153,.13),transparent_28%),linear-gradient(180deg,#030713_0%,#040817_54%,#050713_100%)]" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] gap-4 px-4 py-4 sm:px-5">
        <Rail active={active} setActive={setActive} back={() => navigate("/dashboard")} />
        <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:py-6">
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <button onClick={() => navigate("/dashboard")} className="rounded-2xl border border-white/12 bg-white/[.04] px-3 py-2 text-xs font-bold text-white/65">Dashboard</button>
            <div className="flex items-center gap-2"><Orb /><span className="text-xs font-black uppercase tracking-[.24em] text-white/62">LifeOS</span></div>
          </div>
          <Header active={active} />
          <Chips active={active} setActive={setActive} />
          <Content active={active} />
        </main>
      </div>
    </div>
  );
}
