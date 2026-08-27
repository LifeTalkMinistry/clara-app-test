import { useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { normalizeBetaTesterCodeInput } from "@/lib/beta-tester-access-client";

const CREATOR_FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=61590352695488";

const TRIAL_CHOICE = {
  id: "trial",
  tier: "FREE",
  name: "15-Day Trial",
  planLabel: "CLARA Core experience",
  price: "₱0",
  cadence: "for 15 days",
  summary: "Try the full CLARA Core experience before you decide.",
  description:
    "Use the complete CLARA Core experience free for 15 days, then decide how much accountability you want going forward.",
  features: [
    "CLARA ORB",
    "Ask Before You Spend",
    "Means Score",
    "Wallet",
    "Money Schedule",
    "Weekly Cross-Check",
  ],
  trial: true,
};

const CLARA_PLANS = [
  {
    id: "core",
    tier: "TAKE CONTROL",
    name: "Take Control",
    planLabel: "CLARA Core",
    price: "₱99",
    cadence: "/ month",
    summary: "Start being intentional with your money.",
    description:
      "For people ready to take control of their money with CLARA's core financial accountability system.",
    features: [
      "CLARA ORB",
      "Ask Before You Spend",
      "Means Score",
      "Wallet",
      "Money Schedule",
      "Weekly Cross-Check",
    ],
    cta: "Choose Take Control",
  },
  {
    id: "personal",
    tier: "STAY CONSISTENT",
    name: "Stay Consistent",
    planLabel: "CLARA Personal",
    price: "₱149",
    cadence: "/ month",
    summary: "More continuity, personalization, and accountability.",
    description:
      "For people who already want control and want stronger support staying consistent month after month.",
    features: [
      "Everything in Take Control",
      "Unlimited AI",
      "Personalized guidance",
      "Personal context",
      "Reminders",
      "Follow-ups",
    ],
    cta: "Choose Stay Consistent",
    featured: true,
  },
  {
    id: "partner",
    tier: "DON'T DO IT ALONE",
    name: "Don't Do It Alone",
    planLabel: "CLARA + Human Accountability",
    price: "₱299",
    cadence: "/ month",
    summary: "Add a real person to your accountability system.",
    description:
      "For people who want CLARA's everyday accountability plus a real monthly human accountability conversation.",
    features: [
      "Everything in Stay Consistent",
      "One 30-minute human accountability session each month",
    ],
    cta: "Choose Human Accountability",
  },
];

function CreatorButton({ label = "Chat with the Creator", compact = false }) {
  return (
    <a
      href={CREATOR_FACEBOOK_URL}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 font-black text-white/78 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
        compact ? "min-h-10 text-[9px]" : "min-h-12 text-[11px]"
      }`}
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

function FeatureList({ features }) {
  return (
    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-2 text-[9px] font-bold leading-4 text-white/42"
        >
          <span
            className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-cyan-200/58"
            aria-hidden="true"
          />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function AccessRow({ choice, selected, onToggle, children }) {
  return (
    <article
      className={`overflow-hidden rounded-[19px] border transition duration-300 ${
        selected
          ? "border-cyan-100/28 bg-[linear-gradient(145deg,rgba(24,68,112,.43),rgba(13,21,58,.82))] shadow-[0_14px_34px_rgba(35,99,235,.11)]"
          : choice.featured
            ? "border-cyan-200/17 bg-[linear-gradient(145deg,rgba(22,55,91,.31),rgba(15,21,54,.62))]"
            : choice.trial
              ? "border-emerald-100/14 bg-[linear-gradient(145deg,rgba(12,75,83,.24),rgba(13,24,58,.58))]"
              : "border-white/[0.075] bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={selected}
        className="grid min-h-[76px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/45"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-[7px] font-black uppercase tracking-[.17em] text-cyan-100/42">
              {choice.tier}
            </span>
            {choice.trial ? (
              <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.07] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[.1em] text-emerald-100/72">
                Free
              </span>
            ) : null}
            {choice.featured ? (
              <span className="rounded-full border border-cyan-100/14 bg-cyan-200/[0.07] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[.1em] text-cyan-100/64">
                Popular
              </span>
            ) : null}
          </span>

          <span className="mt-1 block truncate text-[15px] font-black tracking-[-0.03em] text-white">
            {choice.name}
          </span>
          <span className="mt-0.5 block truncate text-[8px] font-bold text-white/32">
            {choice.summary}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2.5">
          <span className="text-right">
            <span className="block text-[20px] font-black tracking-[-0.045em] text-white">
              {choice.price}
            </span>
            <span className="block text-[7px] font-bold text-white/28">
              {choice.cadence}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-white/30 transition-transform duration-300 ${
              selected ? "rotate-180 text-cyan-100/62" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          selected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-4 border-t border-white/[0.065] pb-4 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[.16em] text-white/28">
                  {choice.planLabel}
                </p>
                <p className="mt-1.5 text-[9px] font-semibold leading-4 text-white/48">
                  {choice.description}
                </p>
              </div>
            </div>
            {children}
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
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const expired = trial?.status === "expired";

  const choices = useMemo(
    () => (expired ? CLARA_PLANS : [TRIAL_CHOICE, ...CLARA_PLANS]),
    [expired]
  );

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

  const toggleChoice = (choiceId) => {
    setSelectedChoiceId((current) => (current === choiceId ? null : choiceId));
    setFeedback("");
  };

  return (
    <main
      className="relative flex min-h-0 w-full flex-1 justify-center overflow-y-auto bg-[radial-gradient(circle_at_50%_12%,rgba(52,91,255,0.15),transparent_32%),radial-gradient(circle_at_50%_76%,rgba(235,185,52,0.06),transparent_34%),#010217] px-4 py-4 text-white sm:px-6 sm:py-7"
      aria-label="CLARA access"
      data-clara-trial-access-gate="true"
    >
      <section className="relative my-auto w-full max-w-[620px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[linear-gradient(160deg,rgba(13,24,55,.96),rgba(5,9,31,.985)_56%,rgba(22,12,43,.97))] p-4 shadow-[0_28px_90px_rgba(0,0,0,.48),0_0_44px_rgba(66,111,255,.08)] backdrop-blur-2xl sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(92,214,255,.9),rgba(255,217,77,.75),transparent)]"
        />

        <div className="mx-auto grid h-10 w-10 place-items-center rounded-[15px] border border-cyan-200/15 bg-[radial-gradient(circle_at_35%_30%,rgba(73,151,255,.33),rgba(18,34,76,.88))] shadow-[0_0_28px_rgba(56,132,255,.12)]">
          <Sparkles className="h-[18px] w-[18px] text-cyan-100" aria-hidden="true" />
        </div>

        <div className="mt-3 text-center">
          <p className="text-[8px] font-black uppercase tracking-[.22em] text-cyan-100/50">
            CLARA Access
          </p>
          <h1 className="mt-1.5 text-[21px] font-black tracking-[-0.035em] text-white sm:text-[24px]">
            {expired
              ? "How do you want to continue?"
              : "How do you want to stay accountable?"}
          </h1>
          <p className="mx-auto mt-1.5 max-w-[470px] text-[9px] font-semibold leading-4 text-white/36 sm:text-[10px]">
            {expired
              ? "Choose the level of support that fits how you want to keep moving forward."
              : "Start free, take control, build consistency, or add a real person to your accountability."}
          </p>
        </div>

        {checking ? (
          <div className="mx-auto mt-3 max-w-[420px] rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2 text-center text-[9px] font-bold text-white/48">
            Checking your CLARA access…
          </div>
        ) : null}

        {error && selectedChoiceId !== "trial" ? (
          <div className="mx-auto mt-3 max-w-[460px] rounded-xl border border-rose-300/12 bg-rose-400/[0.05] px-3 py-2 text-center">
            <p className="text-[9px] font-bold leading-4 text-rose-100/72" role="alert">
              {error}
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-[8px] font-black text-cyan-100/68 underline decoration-white/20 underline-offset-2"
              >
                Retry access check
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          {choices.map((choice) => {
            const selected = selectedChoiceId === choice.id;

            return (
              <AccessRow
                key={choice.id}
                choice={choice}
                selected={selected}
                onToggle={() => toggleChoice(choice.id)}
              >
                {choice.trial ? (
                  <>
                    <p className="mt-3 text-[7px] font-black uppercase tracking-[.16em] text-cyan-100/34">
                      Included during your trial
                    </p>
                    <FeatureList features={choice.features} />

                    <form onSubmit={submitCode} noValidate className="mt-3">
                      <label
                        htmlFor="clara-15-day-trial-code"
                        className="mb-1.5 block text-[7px] font-black uppercase tracking-[.17em] text-white/38"
                      >
                        Enter your trial code
                      </label>
                      <div className="relative">
                        <KeyRound
                          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-100/34"
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
                          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 text-center text-[12px] font-black uppercase tracking-[.22em] text-white outline-none transition placeholder:text-white/20 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/10"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={code.length !== 6 || submitting}
                        className="mt-2 min-h-10 w-full rounded-xl border border-cyan-100/15 bg-[linear-gradient(135deg,rgba(39,137,255,.9),rgba(72,70,220,.92))] px-3 text-[9px] font-black text-white shadow-[0_10px_24px_rgba(44,89,255,.16)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {submitting ? "Activating…" : "Activate My 15-Day Trial"}
                      </button>

                      {feedback || error ? (
                        <p
                          className="mt-2 text-center text-[9px] font-bold leading-4 text-rose-200/82"
                          role="alert"
                        >
                          {feedback || error}
                        </p>
                      ) : null}

                      {error && onRetry ? (
                        <button
                          type="button"
                          onClick={onRetry}
                          className="mx-auto mt-1 block text-[8px] font-black text-cyan-100/68 underline decoration-white/20 underline-offset-2"
                        >
                          Retry access check
                        </button>
                      ) : null}
                    </form>

                    <div className="mt-2.5 border-t border-white/[0.06] pt-2.5">
                      <CreatorButton label="Get My 15-Day Trial Code" compact />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-[7px] font-black uppercase tracking-[.16em] text-cyan-100/34">
                      Included
                    </p>
                    <FeatureList features={choice.features} />
                    <div className="mt-3">
                      <CreatorButton label={choice.cta} compact />
                    </div>
                  </>
                )}
              </AccessRow>
            );
          })}
        </div>

        <p className="mx-auto mt-3 max-w-[520px] text-center text-[8px] font-semibold leading-3.5 text-white/22">
          Paid plan activation is arranged directly with the creator. Your financial data stays preserved if you decide later.
        </p>
      </section>
    </main>
  );
}
