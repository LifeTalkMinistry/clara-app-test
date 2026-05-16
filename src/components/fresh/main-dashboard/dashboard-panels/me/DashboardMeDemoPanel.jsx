import {
  Briefcase,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";

const ALEX_CONTEXT = [
  {
    icon: UserRound,
    label: "Identity",
    value: "Alex Reyes • 27",
    note: "BPO employee with monthly income of ₱27,000.",
  },
  {
    icon: WalletCards,
    label: "Money personality",
    value: "Impulse comfort spender",
    note: "Spends faster after stressful shifts, especially food delivery and small rewards.",
  },
  {
    icon: HeartHandshake,
    label: "Responsibilities",
    value: "Family support + debt payments",
    note: "Helps at home while paying motorcycle, credit card, and family loan obligations.",
  },
  {
    icon: ShieldCheck,
    label: "Protected priority",
    value: "Emergency fund first",
    note: "Goal is a 3-month safety buffer before aggressive investing.",
  },
  {
    icon: Target,
    label: "Current focus",
    value: "Pause before spending",
    note: "Building discipline around wants that are not part of the active budget.",
  },
  {
    icon: Briefcase,
    label: "Upcoming pressure",
    value: "May obligations",
    note: "Motorcycle payment, family contribution, credit card due date, and internet bill are all in May.",
  },
];

export default function DashboardMeDemoPanel() {
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(9,62,76,.96),rgba(16,24,55,.97)_46%,rgba(55,24,100,.96))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.24),0_0_38px_rgba(34,211,238,.08)]">
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-white/14 bg-white/10 text-lg font-black text-white shadow-[0_0_28px_rgba(34,211,238,.12)]">
            AR
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/62">
              Demo Identity
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white">
              Alex Reyes
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/68">
              A 27-year-old BPO employee earning ₱27,000 monthly, trying to build a 3-month emergency fund while carrying debt, family responsibilities, and emotional spending triggers.
            </p>
          </div>
        </div>

        <div className="relative mt-5 rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.065] px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100/80" />
            <p className="text-xs font-bold leading-5 text-emerald-50/82">
              Demo goal: let CLARA prove it can connect wallet pressure, budgets, emergency safety, savings, debt, investment readiness, and May schedule decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2.5">
        <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
          Alex context loaded into CLARA
        </p>

        {ALEX_CONTEXT.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
              <div className="flex gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.055] text-cyan-100/72">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-white">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/48">{item.note}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
