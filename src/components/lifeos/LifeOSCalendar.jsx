import { CalendarDays, Clock3, CreditCard, Sparkles, WalletCards } from "lucide-react";
import { Card, Kicker } from "./LifeOSShared";

const pressureCards = [
  {
    icon: CreditCard,
    title: "Bill in 3 days",
    detail: "CLARA should treat this bill as already reserved before optional spending.",
    badge: "Pressure soon",
  },
  {
    icon: WalletCards,
    title: "Salary window",
    detail: "This is where CLARA will help plan confidence spending before money arrives.",
    badge: "Coming up",
  },
  {
    icon: Clock3,
    title: "Risky weekend",
    detail: "Weekends can create social, convenience, and emotional spending pressure.",
    badge: "Behavior signal",
  },
];

export default function LifeOSCalendar() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-cyan-300/22 bg-[linear-gradient(135deg,rgba(17,94,89,.24),rgba(59,7,100,.32))]">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-3xl border border-cyan-300/18 bg-cyan-300/[.06] text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,.12)]">
            <CalendarDays className="h-6 w-6" />
          </div>

          <div>
            <Kicker>Calendar pressure view</Kicker>
            <h2 className="mt-3 text-xl font-black leading-tight text-white">
              Map what is coming before money decisions happen.
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Calendar pressure view is where CLARA will map bills, salary dates, risky weekends, and upcoming financial pressure.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {pressureCards.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.title}
              type="button"
              aria-label={`View ${item.title}`}
              className="group rounded-[24px] border border-white/10 bg-white/[.035] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/24 hover:bg-white/[.055] hover:shadow-[0_0_22px_rgba(34,211,238,.10)] active:translate-y-0 active:scale-[.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/14 bg-cyan-300/[.045] text-cyan-100/78 transition duration-200 group-hover:scale-105 group-hover:text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>

                <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white/42">
                  {item.badge}
                </span>
              </div>

              <h3 className="mt-4 text-base font-black text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/56">{item.detail}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-pink-400/18 bg-pink-400/[.055] text-pink-100">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <Kicker>Next phase</Kicker>
            <p className="mt-1 text-sm leading-5 text-white/62">
              Later, this can connect to real bills, salary dates, subscriptions, events, and spending-risk windows.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
