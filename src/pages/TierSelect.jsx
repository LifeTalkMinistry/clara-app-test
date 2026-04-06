import { useNavigate } from "react-router-dom";
import { Check, Sparkles, ArrowRight, GraduationCap } from "lucide-react";

export default function TierSelect() {
  const navigate = useNavigate();

  const mainPlans = [
    {
      id: "diy",
      name: "DIY",
      subtitle: "Do-It-Yourself",
      price: "₱299",
      description:
        "Fully self-paced access with CLARA’s core system, tools, and progress structure.",
      badge: "Self-Paced",
      badgeClass:
        "bg-emerald-500/10 text-emerald-700 border border-emerald-200",
      cardClass:
        "bg-white/95 border border-emerald-100 shadow-[0_20px_45px_rgba(15,23,42,0.08)]",
      buttonClass:
        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_12px_25px_rgba(5,150,105,0.28)]",
      priceClass: "text-emerald-600",
      features: [
        "Full access to modules",
        "Daily tasks",
        "Money tracking tools",
        "Progress dashboard",
        "Certification path",
        "Onboarding via video",
      ],
      supportLine: "App-driven accountability • Fully self-managed",
    },
    {
      id: "diwm",
      name: "DIWM",
      subtitle: "Do-It-With-Me",
      price: "₱499",
      description:
        "The best balance of structure, accountability, and milestone-based coaching support.",
      badge: "Most Recommended",
      badgeClass:
        "bg-amber-400/15 text-amber-700 border border-amber-300",
      cardClass:
        "bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(254,252,232,1)_100%)] border-2 border-amber-400 shadow-[0_25px_60px_rgba(245,158,11,0.22)] md:-translate-y-2",
      buttonClass:
        "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.28)]",
      priceClass: "text-amber-600",
      features: [
        "Everything in DIY",
        "Onboarding session (Day 1–3)",
        "Final session (Day 27–30)",
        "Goal setting & alignment",
        "Accountability agreement",
        "Phone-based accountability as agreed",
      ],
      supportLine: "Hybrid accountability • System + human support",
      highlight: true,
    },
    {
      id: "ldit",
      name: "LDIT",
      subtitle: "Led / Intensive Tier",
      price: "₱999",
      description:
        "High-touch support with weekly coaching and closer follow-through across the 30 days.",
      badge: "Highest Support",
      badgeClass: "bg-cyan-500/10 text-cyan-700 border border-cyan-200",
      cardClass:
        "bg-white/95 border border-cyan-100 shadow-[0_20px_45px_rgba(15,23,42,0.08)]",
      buttonClass:
        "bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_12px_25px_rgba(8,145,178,0.28)]",
      priceClass: "text-cyan-600",
      features: [
        "Everything in DIWM",
        "Weekly 1:1 coaching sessions",
        "Closer monitoring & reminders",
        "Stronger accountability enforcement",
        "Frequent follow-ups",
        "Faster response when tasks are missed",
      ],
      supportLine: "Active monitoring • Continuous guidance",
    },
  ];

  const studentPlan = {
    id: "student",
    name: "Student Access",
    price: "₱999",
    description:
      "Affordable entry option for students who want to begin with CLARA support.",
  };

  const handleEnroll = (planId) => {
    navigate(`/enroll?plan=${planId}`);
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef7f4_0%,#f8fafc_35%,#f8fafc_100%)]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_35%),linear-gradient(135deg,#0b3b24_0%,#0e7a46_52%,#10b5c9_100%)] text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.08),transparent)]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-14 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/15 px-4 py-1.5 text-sm font-medium mb-5">
            <Sparkles className="w-4 h-4" />
            CLARA Program
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Choose Your Plan
          </h1>
          <p className="mt-3 text-base md:text-lg text-white/90 max-w-2xl mx-auto">
            Start at a level that matches the support and accountability you need.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 md:py-10 -mt-8 relative z-20">
        <div className="grid gap-6 xl:grid-cols-3">
          {mainPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-[30px] p-6 md:p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${plan.cardClass}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold px-4 py-1.5 shadow-lg">
                    BEST VALUE
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {plan.name}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {plan.subtitle}
                  </p>
                </div>

                <div
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${plan.badgeClass}`}
                >
                  {plan.badge}
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed min-h-[72px]">
                {plan.description}
              </p>

              <div className="mt-6 mb-5">
                <div className={`text-5xl font-extrabold ${plan.priceClass}`}>
                  {plan.price}
                </div>
                <p className="text-sm text-slate-500 mt-1">30-day access</p>
              </div>

              <div className="rounded-2xl bg-slate-50/95 border border-slate-200 p-4 mb-6">
                <div className="text-sm font-semibold text-slate-800 mb-3">
                  What’s included
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-slate-600"
                    >
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6 rounded-2xl bg-slate-900 text-white px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 mb-1">
                  Accountability Model
                </div>
                <div className="text-sm font-medium">{plan.supportLine}</div>
              </div>

              <button
                type="button"
                onClick={() => handleEnroll(plan.id)}
                className={`w-full rounded-2xl font-bold py-3.5 px-4 transition flex items-center justify-center gap-2 cursor-pointer ${plan.buttonClass}`}
              >
                Choose {plan.name}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] p-6 md:p-7">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-sky-50 p-3 border border-sky-100">
                  <GraduationCap className="w-6 h-6 text-sky-700" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">
                      {studentPlan.name}
                    </h3>
                    <span className="rounded-full bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1 text-xs font-semibold">
                      Special Rate
                    </span>
                  </div>

                  <p className="text-slate-600 max-w-2xl">
                    {studentPlan.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5">
                <div>
                  <div className="text-3xl font-extrabold text-sky-600">
                    {studentPlan.price}
                  </div>
                  <div className="text-sm text-slate-500">Student pricing</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleEnroll(studentPlan.id)}
                  className="rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 transition shadow-[0_10px_20px_rgba(2,132,199,0.22)] cursor-pointer"
                >
                  Enroll as Student
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10 pb-6">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-800 transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}