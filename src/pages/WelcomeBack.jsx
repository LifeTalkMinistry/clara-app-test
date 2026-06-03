import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronLeft, HeartHandshake, Sparkles, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ClaraLogo from "@/components/ClaraLogo";

const tutorialSlides = [
  {
    eyebrow: "Hi there",
    title: "I’m CLARA. I’m thrilled to be your companion in your finances.",
    body:
      "I’m here to help you see your money clearly, understand your spending, and build better financial habits one simple decision at a time.",
    noteTitle: "Before we start",
    note:
      "You don’t have to be perfect with money. You just need a clear system that helps you notice, decide, and improve.",
    icon: HeartHandshake,
  },
  {
    eyebrow: "Let’s be honest",
    title: "Earning money is not the same as managing it well.",
    body:
      "A lot of people work hard and still wonder where their money went. Sometimes the problem is not income. Sometimes it is lack of visibility, structure, and guidance in the small daily decisions.",
    noteTitle: "That’s why I’m here",
    note:
      "I’ll help you slow down, organize what you have, and become more aware before your money disappears into unplanned spending.",
    icon: BarChart3,
  },
  {
    eyebrow: "How I can help",
    title: "I’ll help you turn money confusion into a clear daily system.",
    body:
      "Inside CLARA, you can track money, organize wallets, review spending, and build a clearer relationship with your finances without feeling overwhelmed.",
    noteTitle: "My role in your journey",
    note:
      "Think of me as your money clarity companion. I won’t judge you. I’ll help you see, understand, and decide better.",
    icon: WalletCards,
  },
  {
    eyebrow: "Start your way",
    title: "You can start free today and upgrade only when you’re ready.",
    body:
      "The free version lets you enter the dashboard right away. When you want deeper guidance, strategy, and CLARA intelligence, you can choose a tier that fits your season.",
    noteTitle: "No pressure",
    note:
      "Start simple. Build trust with the system. Upgrade later only when you feel CLARA is becoming part of your financial routine.",
    icon: Sparkles,
  },
];

const tiers = [
  {
    name: "Pro",
    price: "₱99",
    label: "Essential tools",
    points: ["Budgeting tools", "Wallet visibility", "Spending organization"],
  },
  {
    name: "Core",
    price: "₱249",
    label: "Best value",
    points: ["Daily spending strategy", "Advanced CLARA guidance", "Deeper money clarity"],
    featured: true,
  },
  {
    name: "Elite",
    price: "₱499",
    label: "Complete layer",
    points: ["Full CLARA access", "Life decision support", "Premium transformation tools"],
  },
];

export default function WelcomeBack() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const isTierStep = step >= tutorialSlides.length;
  const currentSlide = tutorialSlides[Math.min(step, tutorialSlides.length - 1)];
  const CurrentIcon = currentSlide.icon;

  const progress = useMemo(() => {
    const totalSteps = tutorialSlides.length + 1;
    return Math.min(((step + 1) / totalSteps) * 100, 100);
  }, [step]);

  const goToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  const goNext = () => {
    if (isTierStep) {
      goToDashboard();
      return;
    }

    setStep((value) => value + 1);
  };

  const goBack = () => {
    setStep((value) => Math.max(value - 1, 0));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040608] px-4 py-6 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.16),transparent_32%),linear-gradient(180deg,rgba(8,13,20,1)_0%,rgba(3,6,10,1)_100%)]" />
        <div className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-emerald-400/12 blur-[110px]" />
        <div className="absolute -right-24 top-8 h-72 w-72 rounded-full bg-violet-500/16 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[130px]" />
      </div>

      <main className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 backdrop-blur-xl transition enabled:hover:bg-white/[0.08] disabled:opacity-0"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <ClaraLogo variant="icon" theme="dark" />
          </div>

          <button
            type="button"
            onClick={goToDashboard}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/72 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
          >
            Skip
          </button>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-green-300 to-lime-300 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="mt-5 flex flex-1 flex-col justify-center">
          <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.045)_100%)] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_40%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />

            {!isTierStep ? (
              <div className="relative">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-emerald-300/20 bg-emerald-300/12 text-emerald-200 shadow-[0_16px_42px_rgba(16,185,129,0.18)]">
                  <CurrentIcon className="h-6 w-6" />
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300/75">
                  {currentSlide.eyebrow}
                </p>
                <h1 className="mt-3 text-[1.75rem] font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-[1.9rem]">
                  {currentSlide.title}
                </h1>
                <p className="mt-4 text-[15px] leading-7 text-white/66">
                  {currentSlide.body}
                </p>

                <div className="mt-7 rounded-3xl border border-white/10 bg-black/18 p-4">
                  <p className="text-sm font-semibold text-white">{currentSlide.noteTitle}</p>
                  <p className="mt-1.5 text-sm leading-6 text-white/58">
                    {currentSlide.note}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300/75">
                  Choose your path
                </p>
                <h1 className="mt-3 text-[1.75rem] font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-[1.9rem]">
                  I prepared three deeper paths for you, but you can start free today.
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Choose a tier later when you want more guidance. For now, you can go straight to the free dashboard and begin.
                </p>

                <div className="mt-5 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                  {tiers.map((tier) => (
                    <div
                      key={tier.name}
                      className={`rounded-3xl border p-4 ${
                        tier.featured
                          ? "border-emerald-300/28 bg-emerald-300/12"
                          : "border-white/10 bg-white/[0.035]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-white">{tier.name}</h2>
                            {tier.featured ? (
                              <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                                Main value
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-white/48">{tier.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white">{tier.price}</p>
                          <p className="text-[10px] text-white/40">/month</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {tier.points.map((point) => (
                          <div key={point} className="flex items-center gap-2 text-xs text-white/62">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300/75" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={goNext}
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-lime-300 px-5 text-sm font-bold text-[#04110C] shadow-[0_18px_50px_rgba(74,222,128,0.28)] transition hover:scale-[0.99] active:scale-[0.98]"
          >
            <span>{isTierStep ? "Take me to my free dashboard" : "Continue"}</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </button>

          {!isTierStep ? (
            <button
              type="button"
              onClick={goToDashboard}
              className="h-13 rounded-2xl border border-white/10 bg-white/[0.045] text-sm font-semibold text-white/70 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
            >
              Skip for now and use the free version
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}
