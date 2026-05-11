import { Clock3, CreditCard, WalletCards } from "lucide-react";
import { Card, Kicker, Row } from "./LifeOSShared";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const eventDots = {
  6: "bg-pink-400",
  8: "bg-cyan-300",
  9: "bg-emerald-400",
  15: "bg-indigo-400",
  21: "bg-orange-400",
  30: "bg-emerald-400",
};

export default function LifeOSCalendar() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <Kicker>May 2025</Kicker>
          <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[.055] px-3 py-1 text-[11px] font-black text-cyan-100/70">
            Timing map
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-white/38">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm font-bold text-white/80">
          {Array.from({ length: 35 }, (_, index) => {
            const date = index < 3 ? 27 + index : index - 2;
            const active = date === 8;
            return (
              <span
                key={`${date}-${index}`}
                className={`relative rounded-full py-2 ${
                  active
                    ? "border border-cyan-300/70 bg-cyan-400/10 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,.26)]"
                    : ""
                }`}
              >
                {date}
                {eventDots[date] ? (
                  <span className={`absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${eventDots[date]}`} />
                ) : null}
              </span>
            );
          })}
        </div>
      </Card>

      <Card>
        <Kicker>Upcoming schedule</Kicker>
        <Row icon={CreditCard} title="Electric bill due in 3 days" detail="Review before optional spending." right="May 10" />
        <Row icon={WalletCards} title="Payday on Friday" detail="Plan before confidence spending." right="May 9" />
        <Row icon={Clock3} title="Planned purchase reminder" detail="Check if this still fits the week." right="May 30" />
      </Card>
    </div>
  );
}
