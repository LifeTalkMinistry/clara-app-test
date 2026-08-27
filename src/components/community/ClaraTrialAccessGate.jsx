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
  name: "15-Day Trial",
  price: "₱0",
  cadence: "15 days",
  eyebrow: "START HERE",
  badge: "FREE",
  summary: "Full CLARA Core experience",
  description:
    "Use the complete CLARA Core experience free for 15 days before deciding whether to continue with a paid plan.",
  features: [
    "CLARA ORB",
    "Ask Before You Spend",
    "Means Score",
    "Wallet",
    "Money Schedule",
    "Weekly Cross-Check",
  ],
  cta: "Start Free Trial",
  trial: true,
};

const CLARA_PLANS = [
  {
    id: "core",
    name: "CLARA Core",
    price: "₱99",
    cadence: "/ month",
    eyebrow: "COMPLETE FINANCIAL CONTEXT",
    summary: "Core financial accountability",
    description:
      "Continue with the complete CLARA financial accountability system you experience during the trial.",
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
    id: "personal",
    name: "CLARA Personal",
    price: "₱249",
    cadence: "/ month",
    eyebrow: "BEST FOR ACCOUNTABILITY",
    badge: "RECOMMENDED",
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
    id: "serious",
    name: "CLARA Serious",
    price: "₱499",
    cadence: "/ month",
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

function ComparisonCard({ choice, selected, onSelect }) {
  const featured = choice.featured || choice.trial;

  return (
    <article
      className={`relative flex min-h-[150px] flex-col rounded-[20px] border p-3 text-left transition duration-300 ${
        selected
          ? "border-cyan-100/34 bg-[linear-gradient(155deg,rgba(27,78,128,.5),rgba(15,24,65,.86))] shadow-[0_16px_38px_rgba(46,120,255,.13)]"
          : featured
            ? "border-cyan-200/18 bg-[linear-gradient(160deg,rgba(23,58,97,.34),rgba(15,23,59,.64))]"
            : "border-white/[0.075] bg-white/[0.03]"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-1.5">
        <p className="min-w-0 text-[6.5px] font-black uppercase leading-3 tracking-[.14em] text-cyan-100/42">
          {choice.eyebrow}
        </p>
        {choice.badge ? (
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[.1em] ${
              choice.trial
                ? "border-emerald-200/15 bg-emerald-300/[0.07] text-emerald-100/72"
                : "border-cyan-100/14 bg-cyan-200/[0.07] text-cyan-100/65"
            }`}
          >
            {choice.badge}
          </span>
        ) : null}
      </div>

      <h2 className="mt-2 text-[14px] font-black leading-tight tracking-[-0.03em] text-white">
        {choice.name}
      </h2>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[21px] font-black tracking-[-0.045em] text-white">
          {choice.price}
        </span>
        <span className="text-[7px] font-bold text-white/30">{choice.cadence}</span>
      </div>

      <p className="mt-1 line-clamp-1 text-[8px] font-bold text-white/34">
        {choice.summary}
      </p>

      <div className="mt-auto pt-2.5">
        {choice.trial ? (
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-emerald-100/16 bg-[linear-gradient(135deg,rgba(16,185,129,.28),rgba(39,137,255,.54))] px-2 text-[8px] font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
          >
            {choice.cta}
          </button>
        ) : (
          <a
            href={CREATOR_FACEBOOK_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${choice.cta} with the CLARA creator`}
            className={`inline-flex min-h-9 w-full items-center justify-center rounded-xl border px-2 text-[8px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
              choice.featured
                ? "border-cyan-100/16 bg-[linear-gradient(135deg,rgba(39,137,255,.74),rgba(72,70,220,.78))] text-white hover:brightness-110"
                : "border-white/10 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            {choice.cta}
          </a>
        )}

        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          className="mt-1.5 inline-flex min-h-6 w-full items-center justify-center gap-1 text-[7px] font-black text-white/36 transition hover:text-white/68 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
        >
          {selected ? "Hide details" : "See more"}
          <ChevronDown
            className={`h-2.5 w-2.5 transition-transform duration-300 ${
              selected ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
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
  const selectedChoice =
    choices.find((choice) => choice.id === selectedChoiceId) || null;

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
      aria-label="CLARA trial access"
      data-clara-trial-access-gate="true"
    >
      <section className="relative my-auto w-full max-w-[820px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[linear-gradient(160deg,rgba(13,24,55,.96),rgba(5,9,31,.985)_56%,rgba(22,12,43,.97))] p-4 shadow-[0_28px_90px_rgba(0,0,0,.48),0_0_44px_rgba(66,111,255,.08)] backdrop-blur-2xl sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(92,214,255,.9),rgba(255,217,77,.75),transparent)]"
        />

        <div className="mx-auto grid h-11 w-11 place-items-center rounded-[16px] border border-cyan-200/15 bg-[radial-gradient(circle_at_35%_30%,rgba(73,151,255,.33),rgba(18,34,76,.88))] shadow-[0_0_28px_rgba(56,132,255,.12)]">
          <Sparkles className="h-5 w-5 text-cyan-100" aria-hidden="true" />
        </div>

        <div className="mt-3 text-center">
          <p className="text-[8px] font-black uppercase tracking-[.22em] text-cyan-100/50">
            CLARA Premium Access
          </p>
          <h1 className="mt-1.5 text-[21px] font-black tracking-[-0.035em] text-white sm:text-[24px]">
            {expired ? "Choose your CLARA plan." : "Choose how you want to start."}
          </h1>
          <p className="mx-auto mt-1.5 max-w-[540px] text-[9px] font-semibold leading-4 text-white/36 sm:text-[11px]">
            {expired
              ? "Your free trial is complete. Compare the paid levels of accountability before you continue."
              : "Start free for 15 days or choose a paid plan now. Compare everything first, then open only the details you want."}
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

        <div className="mt-4 border-t border-white/[0.07] pt-3.5">
          <div className="text-center">
            <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/28">
              {expired ? "Continue with CLARA" : "Trial or paid — compare before you decide"}
            </p>
            <h2 className="mt-1 text-[16px] font-black tracking-[-0.03em] text-white">
              {expired ? "Compare your CLARA plans" : "Choose your CLARA access"}
            </h2>
          </div>

          <div
            className={`mt-3 grid grid-cols-2 gap-2.5 ${
              expired ? "sm:grid-cols-3" : "sm:grid-cols-4"
            }`}
          >
            {choices.map((choice) => (
              <ComparisonCard
                key={choice.id}
                choice={choice}
                selected={selectedChoiceId === choice.id}
                onSelect={() => toggleChoice(choice.id)}
              />
            ))}
          </div>

          {selectedChoice ? (
            <section
              className="mt-3 rounded-[20px] border border-cyan-100/12 bg-[linear-gradient(145deg,rgba(24,58,104,.28),rgba(10,17,48,.64))] p-3.5"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[.17em] text-cyan-100/40">
                    {selectedChoice.trial ? "15-Day Free Trial" : selectedChoice.eyebrow}
                  </p>
                  <h3 className="mt-1 text-[15px] font-black tracking-[-0.025em] text-white">
                    {selectedChoice.name}
                  </h3>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[18px] font-black tracking-[-0.04em] text-white">
                    {selectedChoice.price}
                  </span>
                  <span className="ml-1 text-[7px] font-bold text-white/30">
                    {selectedChoice.cadence}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-[9px] font-semibold leading-4 text-white/48">
                {selectedChoice.description}
              </p>

              {selectedChoice.trial ? (
                <>
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
                  <p className="mt-3 text-[7px] font-black uppercase tracking-[.17em] text-cyan-100/34">
                    Included
                  </p>
                  <FeatureList features={selectedChoice.features} />
                  <div className="mt-3">
                    <CreatorButton label={selectedChoice.cta} compact />
                  </div>
                </>
              )}
            </section>
          ) : null}

          <p className="mx-auto mt-3 max-w-[560px] text-center text-[8px] font-semibold leading-3.5 text-white/22">
            Paid plan activation is arranged directly with the creator. Your financial data stays preserved if you decide later.
          </p>
        </div>
      </section>
    </main>
  );
}
