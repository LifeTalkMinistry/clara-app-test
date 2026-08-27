import { useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { ClaraOrbMark } from "@/components/community/ClaraOrbPage";
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

function choiceAccent(choice) {
  if (choice.featured) return "gold";
  if (choice.id === "partner") return "red";
  return "blue";
}

function CreatorButton({ label = "Chat with the Creator", compact = false }) {
  return (
    <a
      href={CREATOR_FACEBOOK_URL}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#4d8cff]/25 bg-[linear-gradient(135deg,rgba(32,111,255,.82),rgba(31,74,190,.9))] px-3 font-black text-white shadow-[0_10px_28px_rgba(32,93,225,.16)] transition hover:border-[#7aa8ff]/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d8cff]/45 ${
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
          className="flex items-start gap-2 text-[9px] font-semibold leading-4 text-white/48"
        >
          <span
            className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#ffd42f]/75 shadow-[0_0_8px_rgba(255,212,47,.28)]"
            aria-hidden="true"
          />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function AccessRow({ choice, selected, onToggle, children }) {
  const accent = choiceAccent(choice);

  const shellClass = selected
    ? accent === "gold"
      ? "border-[#ffd42f]/40 bg-[linear-gradient(145deg,rgba(29,43,73,.92),rgba(11,17,44,.96))] shadow-[0_16px_38px_rgba(255,212,47,.07)]"
      : accent === "red"
        ? "border-[#ff4d55]/32 bg-[linear-gradient(145deg,rgba(34,34,60,.92),rgba(15,16,41,.96))] shadow-[0_16px_38px_rgba(255,77,85,.06)]"
        : "border-[#4d8cff]/40 bg-[linear-gradient(145deg,rgba(19,47,94,.94),rgba(10,18,48,.97))] shadow-[0_16px_38px_rgba(77,140,255,.1)]"
    : accent === "gold"
      ? "border-[#ffd42f]/20 bg-[linear-gradient(145deg,rgba(18,27,56,.8),rgba(10,15,40,.9))]"
      : accent === "red"
        ? "border-[#ff4d55]/14 bg-[linear-gradient(145deg,rgba(22,24,50,.78),rgba(10,13,36,.9))]"
        : choice.trial
          ? "border-[#4d8cff]/24 bg-[linear-gradient(145deg,rgba(14,48,92,.78),rgba(9,17,45,.92))]"
          : "border-white/[0.075] bg-[linear-gradient(145deg,rgba(14,23,50,.76),rgba(8,12,34,.9))]";

  const accentBarClass =
    accent === "gold"
      ? "bg-[#ffd42f] shadow-[0_0_14px_rgba(255,212,47,.32)]"
      : accent === "red"
        ? "bg-[#ff4d55] shadow-[0_0_14px_rgba(255,77,85,.24)]"
        : "bg-[#4d8cff] shadow-[0_0_14px_rgba(77,140,255,.3)]";

  const tierClass =
    accent === "gold"
      ? "text-[#ffe37a]/75"
      : accent === "red"
        ? "text-[#ff959a]/70"
        : "text-[#9ab9ff]/72";

  const chevronClass = selected
    ? accent === "gold"
      ? "rotate-180 text-[#ffd42f]/72"
      : accent === "red"
        ? "rotate-180 text-[#ff7f86]/70"
        : "rotate-180 text-[#8fb3ff]/74"
    : "text-white/26";

  return (
    <article
      className={`relative overflow-hidden rounded-[20px] border transition duration-300 ${shellClass}`}
    >
      <span
        aria-hidden="true"
        className={`absolute bottom-3 left-0 top-3 w-[2px] rounded-r-full opacity-90 ${accentBarClass}`}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={selected}
        className="grid min-h-[82px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4d8cff]/45"
      >
        <span className="min-w-0 pl-0.5">
          <span className="flex items-center gap-2">
            <span className={`text-[7px] font-black uppercase tracking-[.18em] ${tierClass}`}>
              {choice.tier}
            </span>
            {choice.trial ? (
              <span className="rounded-full border border-[#4d8cff]/22 bg-[#4d8cff]/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[.1em] text-[#b8cdff]/78">
                Free
              </span>
            ) : null}
            {choice.featured ? (
              <span className="rounded-full border border-[#ffd42f]/24 bg-[#ffd42f]/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[.1em] text-[#ffe37a]/82">
                Popular
              </span>
            ) : null}
          </span>

          <span className="mt-1 block truncate text-[15px] font-black tracking-[-0.03em] text-white">
            {choice.name}
          </span>
          <span className="mt-1 block max-w-[260px] text-[10px] font-medium leading-[1.4] text-white/60">
            {choice.summary}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2.5">
          <span className="text-right">
            <span className="block text-[20px] font-black tracking-[-0.045em] text-white">
              {choice.price}
            </span>
            <span className="block text-[7px] font-semibold text-white/30">
              {choice.cadence}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-300 ${chevronClass}`}
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
                <p className={`text-[7px] font-black uppercase tracking-[.16em] ${tierClass}`}>
                  {choice.planLabel}
                </p>
                <p className="mt-1.5 text-[9px] font-semibold leading-4 text-white/50">
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
      className="relative flex min-h-0 w-full flex-1 justify-center overflow-y-auto bg-[radial-gradient(circle_at_13%_14%,rgba(77,140,255,.14),transparent_31%),radial-gradient(circle_at_88%_78%,rgba(255,77,85,.07),transparent_29%),radial-gradient(circle_at_50%_34%,rgba(255,212,47,.035),transparent_24%),#010216] px-4 py-4 text-white sm:px-6 sm:py-7"
      aria-label="CLARA access"
      data-clara-trial-access-gate="true"
    >
      <section className="relative my-auto w-full max-w-[620px] overflow-hidden rounded-[30px] border border-[#4d8cff]/20 bg-[linear-gradient(160deg,rgba(7,16,42,.985),rgba(3,7,27,.995)_58%,rgba(9,9,29,.99))] p-4 shadow-[0_30px_90px_rgba(0,0,0,.52),0_0_46px_rgba(77,140,255,.07)] backdrop-blur-2xl sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-8 h-44 w-44 rounded-full bg-[#4d8cff]/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 bottom-6 h-40 w-40 rounded-full bg-[#ff4d55]/[0.055] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,#4d8cff_31%,#ffd42f_52%,#ff4d55_73%,transparent)] opacity-80"
        />

        <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-1 rounded-full bg-[#4d8cff]/10 blur-xl"
          />
          <ClaraOrbMark className="relative h-14 w-14" title="CLARA" />
        </div>

        <div className="relative mt-2.5 text-center">
          <p
            className="inline-flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-[.21em]"
            aria-label="CLARA Access"
          >
            <span>
              <span className="text-[#4d8cff]">CL</span>
              <span className="text-[#ffd42f]">A</span>
              <span className="text-[#ff4d55]">RA</span>
            </span>
            <span className="text-white/38">Access</span>
          </p>
          <h1 className="mx-auto mt-1.5 max-w-[430px] text-[21px] font-black tracking-[-0.035em] text-white sm:text-[24px]">
            {expired
              ? "How do you want to continue?"
              : "How do you want to stay accountable?"}
          </h1>
        </div>

        {checking ? (
          <div className="relative mx-auto mt-3 max-w-[420px] rounded-xl border border-[#4d8cff]/15 bg-[#07132f]/70 px-3 py-2 text-center text-[9px] font-bold text-white/52">
            Checking your CLARA access…
          </div>
        ) : null}

        {error && selectedChoiceId !== "trial" ? (
          <div className="relative mx-auto mt-3 max-w-[460px] rounded-xl border border-[#ff4d55]/20 bg-[#ff4d55]/[0.055] px-3 py-2 text-center">
            <p className="text-[9px] font-bold leading-4 text-[#ffc3c6]/82" role="alert">
              {error}
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-[8px] font-black text-[#9ab9ff]/74 underline decoration-white/20 underline-offset-2"
              >
                Retry access check
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="relative mt-4 grid gap-2.5">
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
                    <p className="mt-3 text-[7px] font-black uppercase tracking-[.16em] text-[#9ab9ff]/64">
                      Included during your trial
                    </p>
                    <FeatureList features={choice.features} />

                    <form onSubmit={submitCode} noValidate className="mt-3">
                      <label
                        htmlFor="clara-15-day-trial-code"
                        className="mb-1.5 block text-[7px] font-black uppercase tracking-[.17em] text-white/42"
                      >
                        Enter your trial code
                      </label>
                      <div className="relative">
                        <KeyRound
                          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ab9ff]/55"
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
                          className="min-h-11 w-full rounded-xl border border-[#4d8cff]/18 bg-[#01071b]/78 px-10 text-center text-[12px] font-black uppercase tracking-[.22em] text-white outline-none transition [font-variant-numeric:tabular-nums] placeholder:text-white/20 focus:border-[#4d8cff]/45 focus:ring-2 focus:ring-[#4d8cff]/12"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={code.length !== 6 || submitting}
                        className="mt-2 min-h-10 w-full rounded-xl border border-[#7aa8ff]/24 bg-[linear-gradient(135deg,#246fff,#2149ba)] px-3 text-[9px] font-black text-white shadow-[0_10px_26px_rgba(37,96,225,.2)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {submitting ? "Activating…" : "Activate My 15-Day Trial"}
                      </button>

                      {feedback || error ? (
                        <p
                          className="mt-2 text-center text-[9px] font-bold leading-4 text-[#ffc3c6]/82"
                          role="alert"
                        >
                          {feedback || error}
                        </p>
                      ) : null}

                      {error && onRetry ? (
                        <button
                          type="button"
                          onClick={onRetry}
                          className="mx-auto mt-1 block text-[8px] font-black text-[#9ab9ff]/74 underline decoration-white/20 underline-offset-2"
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
                    <p className="mt-3 text-[7px] font-black uppercase tracking-[.16em] text-[#9ab9ff]/56">
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

        <p className="relative mx-auto mt-3 text-center text-[7px] font-black uppercase tracking-[.18em] text-white/20">
          Ask before you spend.
        </p>
      </section>
    </main>
  );
}