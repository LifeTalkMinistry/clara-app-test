import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { normalizeBetaTesterCodeInput } from "@/lib/beta-tester-access-client";

const CREATOR_FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=61590352695488";

const CLARA_PLANS = [
  {
    name: "Core",
    price: "₱99",
    eyebrow: "CONTINUE CLARA",
    summary: "Complete financial context",
    description:
      "The complete CLARA financial accountability system you experience during the trial.",
    features: [
      "CLARA ORB",
      "Ask Before You Spend",
      "Means Score",
      "Wallet",
      "Money Schedule",
      "Weekly Cross-Check",
    ],
    cta: "Choose Core",
  },
  {
    name: "Personal",
    price: "₱249",
    eyebrow: "BEST FOR ACCOUNTABILITY",
    summary: "Personal context + unlimited AI",
    description:
      "Everything in Core, with stronger AI access and more personal accountability.",
    features: [
      "Everything in Core",
      "Unlimited AI",
      "Personalized guidance",
      "Reminders",
      "Follow-ups",
    ],
    cta: "Choose Personal",
    featured: true,
  },
  {
    name: "Serious",
    price: "₱499",
    eyebrow: "HUMAN ACCOUNTABILITY",
    summary: "Monthly human accountability",
    description:
      "Everything in Personal, plus a real monthly accountability conversation.",
    features: [
      "Everything in Personal",
      "One 30-minute human accountability session each month",
    ],
    cta: "Choose Serious",
  },
];

function CreatorButton({ label = "Chat with the Creator" }) {
  return (
    <a
      href={CREATOR_FACEBOOK_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-[12px] font-black text-white/82 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

function PlanCard({ plan, expanded, onToggle }) {
  const detailsId = `clara-plan-${plan.name.toLowerCase()}-details`;

  return (
    <article
      className={`relative rounded-[22px] border px-4 py-4 text-left transition duration-300 ${
        plan.featured
          ? "border-cyan-200/28 bg-[linear-gradient(160deg,rgba(26,66,104,.46),rgba(16,24,64,.76))] shadow-[0_16px_38px_rgba(46,120,255,.12)]"
          : "border-white/[0.08] bg-white/[0.035]"
      }`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[7px] font-black uppercase tracking-[.18em] text-cyan-100/45">
          {plan.eyebrow}
        </p>
        {plan.featured ? (
          <span className="shrink-0 rounded-full border border-cyan-100/15 bg-cyan-200/[0.08] px-2 py-1 text-[7px] font-black uppercase tracking-[.13em] text-cyan-100/70">
            Recommended
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-black tracking-[-0.035em] text-white">
            CLARA {plan.name}
          </h2>
          <p className="mt-1 truncate text-[9px] font-bold text-white/38">
            {plan.summary}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[22px] font-black tracking-[-0.045em] text-white">
            {plan.price}
          </span>
          <span className="ml-1 text-[8px] font-bold text-white/30">/mo</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <a
          href={CREATOR_FACEBOOK_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${plan.cta} with the CLARA creator`}
          className={`inline-flex min-h-10 min-w-0 items-center justify-center rounded-xl border px-3 text-[9px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
            plan.featured
              ? "border-cyan-100/16 bg-[linear-gradient(135deg,rgba(39,137,255,.78),rgba(72,70,220,.82))] text-white hover:brightness-110"
              : "border-white/10 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.07]"
          }`}
        >
          {plan.cta}
        </a>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-black/10 px-3 text-[9px] font-black text-white/52 transition hover:border-white/16 hover:bg-white/[0.04] hover:text-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
        >
          {expanded ? "Less" : "See more"}
          {expanded ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        id={detailsId}
        aria-hidden={!expanded}
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          expanded
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.07] pt-3">
            <p className="text-[10px] font-semibold leading-5 text-white/52">
              {plan.description}
            </p>
            <p className="mt-3 text-[7px] font-black uppercase tracking-[.18em] text-cyan-100/38">
              Included
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[9px] font-bold leading-4 text-white/38"
                >
                  <span
                    className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-cyan-200/55"
                    aria-hidden="true"
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ClaraTrialAccessGate({
  trial,
  checking = false,
  error = "",
  onRedeem,
  onRetry,
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [expandedPlan, setExpandedPlan] = useState(null);
  const expired = trial?.status === "expired";

  const submitCode = async (event) => {
    event.preventDefault();
    const normalized = normalizeBetaTesterCodeInput(code);
    if (normalized.length !== 6 || submitting) return;

    setSubmitting(true);
    setFeedback("");
    try {
      const activatedTrial = await onRedeem?.(normalized);
      if (activatedTrial?.status !== "active") {
        setFeedback("CLARA could not confirm an active trial for this account.");
      }
    } catch (redeemError) {
      setFeedback(
        redeemError?.message || "CLARA could not activate this trial code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlan = (planName) => {
    setExpandedPlan((current) => (current === planName ? null : planName));
  };

  return (
    <main
      className="relative flex min-h-0 w-full flex-1 justify-center overflow-y-auto bg-[radial-gradient(circle_at_50%_12%,rgba(52,91,255,0.15),transparent_32%),radial-gradient(circle_at_50%_76%,rgba(235,185,52,0.06),transparent_34%),#010217] px-4 py-7 text-white sm:px-6 sm:py-9"
      aria-label="CLARA trial access"
      data-clara-trial-access-gate="true"
    >
      <section className="relative my-auto w-full max-w-[820px] overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(160deg,rgba(13,24,55,.96),rgba(5,9,31,.985)_56%,rgba(22,12,43,.97))] p-5 shadow-[0_28px_90px_rgba(0,0,0,.48),0_0_44px_rgba(66,111,255,.08)] backdrop-blur-2xl sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(92,214,255,.9),rgba(255,217,77,.75),transparent)]"
        />

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[20px] border border-cyan-200/15 bg-[radial-gradient(circle_at_35%_30%,rgba(73,151,255,.33),rgba(18,34,76,.88))] shadow-[0_0_34px_rgba(56,132,255,.14)]">
          <Sparkles className="h-6 w-6 text-cyan-100" aria-hidden="true" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-100/55">
            CLARA Premium Access
          </p>
          <h1 className="mt-2 text-[25px] font-black tracking-[-0.035em] text-white sm:text-[28px]">
            {expired
              ? "Choose how much accountability you want."
              : "Start with 15 days of CLARA Core."}
          </h1>
          <p className="mx-auto mt-3 max-w-[520px] text-[12px] font-semibold leading-6 text-white/52 sm:text-[13px]">
            {expired
              ? "Your free trial is complete. Choose the CLARA plan that matches the level of accountability you want going forward."
              : "Your trial gives you the CLARA Core experience — normally ₱99/month — free for 15 days. You can also choose a paid plan now."}
          </p>
        </div>

        {checking ? (
          <div className="mx-auto mt-6 max-w-[440px] rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center text-[12px] font-bold text-white/55">
            Checking your CLARA access…
          </div>
        ) : !expired ? (
          <div className="mx-auto mt-6 max-w-[520px] rounded-[24px] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(28,86,142,.22),rgba(14,24,62,.56))] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-100/52">
                  15-Day Free Trial
                </p>
                <p className="mt-1 text-[15px] font-black text-white">
                  CLARA Core · ₱99/month experience
                </p>
              </div>
              <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.07] px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-emerald-100/70">
                Free for 15 days
              </span>
            </div>

            <form onSubmit={submitCode} noValidate>
              <label
                htmlFor="clara-15-day-trial-code"
                className="mb-2 block text-[9px] font-black uppercase tracking-[.18em] text-white/42"
              >
                Enter your trial code
              </label>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/38"
                  aria-hidden="true"
                />
                <input
                  id="clara-15-day-trial-code"
                  value={code}
                  onChange={(event) => {
                    setCode(normalizeBetaTesterCodeInput(event.target.value));
                    setFeedback("");
                  }}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={6}
                  placeholder="ENTER CODE"
                  spellCheck="false"
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-4 text-center text-[15px] font-black uppercase tracking-[.24em] text-white outline-none transition placeholder:text-white/22 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/10"
                />
              </div>

              <button
                type="submit"
                disabled={code.length !== 6 || submitting}
                className="mt-3 min-h-13 w-full rounded-2xl border border-cyan-100/15 bg-[linear-gradient(135deg,rgba(39,137,255,.92),rgba(72,70,220,.94))] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(44,89,255,.18)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? "Activating…" : "Activate My 15-Day Trial"}
              </button>

              {feedback || error ? (
                <p
                  className="mt-3 text-center text-[11px] font-bold leading-5 text-rose-200/85"
                  role="alert"
                >
                  {feedback || error}
                </p>
              ) : null}

              {error && onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mx-auto mt-2 block text-[11px] font-black text-cyan-100/70 underline decoration-white/20 underline-offset-4"
                >
                  Retry access check
                </button>
              ) : null}
            </form>

            <div className="mt-4 border-t border-white/[0.07] pt-4 text-center">
              <p className="mb-3 text-[10px] font-semibold text-white/38">
                Don’t have a trial code yet?
              </p>
              <CreatorButton label="Get My 15-Day Trial Code" />
            </div>
          </div>
        ) : null}

        <div className="mt-7 border-t border-white/[0.07] pt-5">
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-[.2em] text-white/34">
              {expired ? "Continue with CLARA" : "Or choose your plan now"}
            </p>
            <h2 className="mt-1.5 text-[18px] font-black tracking-[-0.03em] text-white">
              Compare your CLARA plans
            </h2>
            <p className="mt-1 text-[9px] font-semibold text-white/30">
              Compare first. Open a plan only when you want the details.
            </p>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {CLARA_PLANS.map((plan) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                expanded={expandedPlan === plan.name}
                onToggle={() => togglePlan(plan.name)}
              />
            ))}
          </div>

          <p className="mx-auto mt-4 max-w-[560px] text-center text-[9px] font-semibold leading-4 text-white/26">
            During the CLARA beta, paid plan activation is arranged directly with the creator. Your financial data stays preserved if you decide later.
          </p>
        </div>
      </section>
    </main>
  );
}
