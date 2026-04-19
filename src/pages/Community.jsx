import { Link } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  MessageSquare,
  CalendarDays,
  Sparkles,
  Lock,
  ArrowRight,
  GraduationCap,
  HeartHandshake,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";

export default function Community() {
  const { isPaid, isFree, isPending } = useUserRole();

  const isLocked = isFree || isPending;

  const highlights = [
    {
      icon: Users,
      title: "Growth-Minded Circle",
      description:
        "Connect with people who are serious about improving their finances, habits, and mindset.",
    },
    {
      icon: CalendarDays,
      title: "Weekend Digital Meetups",
      description:
        "A private place for future live conversations, check-ins, and shared growth sessions.",
    },
    {
      icon: MessageSquare,
      title: "Real Conversations",
      description:
        "More intentional than Feed. This is where members go deeper, ask questions, and build connections.",
    },
    {
      icon: HeartHandshake,
      title: "Accountability & Support",
      description:
        "Celebrate progress, stay encouraged, and be surrounded by people moving in the right direction.",
    },
  ];

  const futureBlocks = [
    {
      icon: GraduationCap,
      label: "Private discussions",
    },
    {
      icon: CalendarDays,
      label: "Weekly community sessions",
    },
    {
      icon: Sparkles,
      label: "Member accountability spaces",
    },
  ];

  return (
    <div className="min-h-full px-4 pb-8 pt-4 md:px-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Community"
          subtitle="A premium space for deeper connection, support, and financially aware conversations."
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,36,0.98)_0%,rgba(10,28,46,0.96)_45%,rgba(18,63,52,0.90)_100%)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_34%)]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Premium Member Space
              </div>

              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/10 text-emerald-200 shadow-[0_12px_30px_rgba(16,185,129,0.14)]">
                  <Users className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-2xl font-bold leading-tight text-white md:text-[2rem]">
                    This is where deeper connection happens.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72 md:text-[15px]">
                    Feed is for daily motivation and visible progress. Community is
                    different. This is your more intentional premium space for
                    meaningful conversations, weekend gatherings, support, and
                    accountability with people who are also serious about financial
                    growth.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-emerald-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-white/62">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0B1228] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.24)] md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-yellow-200">
                  {isLocked ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Status
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-white">
                    {isLocked ? "Locked for now" : "Premium access detected"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {isLocked
                      ? "Community is reserved for committed members. Unlock premium access to enter this deeper support space."
                      : "You already have premium access. This section is ready as your future members-only community hub."}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {isLocked ? (
                  <Link to="/enroll" className="block">
                    <Button className="h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-cyan-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)]">
                      Unlock Community
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)] transition hover:scale-[1.01]"
                  >
                    Enter Community
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,40,0.98)_0%,rgba(8,16,30,0.98)_100%)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.24)] md:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                What this will become
              </p>

              <div className="mt-4 space-y-3">
                {futureBlocks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-emerald-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-white/82">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-[22px] border border-emerald-400/10 bg-emerald-400/[0.06] p-4">
                <p className="text-sm font-semibold text-white">
                  Feed motivates you daily.
                </p>
                <p className="mt-1 text-xs leading-6 text-white/62">
                  Community is where members go when they want deeper
                  conversations, belonging, and stronger accountability.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}