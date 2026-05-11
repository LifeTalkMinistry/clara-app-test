import {
  BadgeDollarSign,
  Briefcase,
  Calendar,
  Heart,
  PiggyBank,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { Card, Kicker, Row } from "./LifeOSShared";

const profileItems = [
  { title: "Birthday", icon: Calendar },
  { title: "Work status", icon: Briefcase },
  { title: "Income cycle", icon: BadgeDollarSign },
  { title: "Pay schedule", icon: Calendar },
  { title: "Main goals", icon: Target },
  { title: "Savings priorities", icon: PiggyBank },
  { title: "Debt situation", icon: ShieldCheck },
  { title: "Family responsibilities", icon: Heart },
  { title: "Personal values", icon: UserRound },
  { title: "Spending boundaries", icon: ShieldCheck },
];

export default function LifeOSProfile() {
  return (
    <div className="space-y-4">
      <Card className="border-cyan-300/22 bg-[linear-gradient(135deg,rgba(14,116,144,.20),rgba(88,28,135,.24))]">
        <Kicker>Why life profile</Kicker>
        <h2 className="mt-3 text-xl font-black text-white">
          Stable context creates smarter financial guidance.
        </h2>
        <p className="mt-2 max-w-[560px] text-sm leading-6 text-white/64">
          Life Profile helps CLARA understand your environment without making the app feel invasive or emotionally overwhelming.
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Kicker>Profile details</Kicker>
            <p className="mt-2 text-sm text-white/52">
              These details help CLARA personalize guidance responsibly.
            </p>
          </div>

          <div className="hidden rounded-full border border-cyan-300/18 bg-cyan-300/[.05] px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] text-cyan-100/70 md:block">
            Privacy-first
          </div>
        </div>

        <div className="mt-4">
          {profileItems.map((item) => (
            <Row key={item.title} icon={item.icon} title={item.title} />
          ))}
        </div>
      </Card>
    </div>
  );
}
