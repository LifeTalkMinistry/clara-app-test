import { useState } from "react";
import { ExternalLink, KeyRound, Sparkles } from "lucide-react";
import { normalizeBetaTesterCodeInput } from "@/lib/beta-tester-access-client";

const CREATOR_FACEBOOK_URL =
  "https://www.facebook.com/profile.php?id=61590352695488";

function CreatorButton() {
  return (
    <a
      href={CREATOR_FACEBOOK_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-[12px] font-black text-white/82 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
    >
      Chat with the Creator
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
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

  return (
    <main
      className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_50%_16%,rgba(52,91,255,0.15),transparent_34%),radial-gradient(circle_at_50%_76%,rgba(235,185,52,0.07),transparent_34%),#010217] px-5 py-8 text-white"
      aria-label="CLARA trial access"
      data-clara-trial-access-gate="true"
    >
      <section className="relative w-full max-w-[440px] overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(160deg,rgba(13,24,55,.96),rgba(5,9,31,.985)_56%,rgba(22,12,43,.97))] p-6 shadow-[0_28px_90px_rgba(0,0,0,.48),0_0_44px_rgba(66,111,255,.08)] backdrop-blur-2xl sm:p-7">
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
          <h1 className="mt-2 text-[25px] font-black tracking-[-0.035em] text-white">
            {expired ? "Your trial has ended." : "Start your 15-day free trial."}
          </h1>
          <p className="mx-auto mt-3 max-w-[340px] text-[13px] font-semibold leading-6 text-white/55">
            {expired
              ? "Your CLARA Core trial is complete. Continue with a paid CLARA plan to keep using your financial accountability system."
              : "If this is your first time using CLARA, enter the trial code provided during your live CLARA introduction."}
          </p>
        </div>

        {checking ? (
          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-4 text-center text-[12px] font-bold text-white/55">
            Checking your CLARA access…
          </div>
        ) : expired ? (
          <div className="mt-6">
            <CreatorButton />
          </div>
        ) : (
          <form className="mt-6" onSubmit={submitCode} noValidate>
            <label
              htmlFor="clara-15-day-trial-code"
              className="mb-2 block text-[10px] font-black uppercase tracking-[.18em] text-white/48"
            >
              15-Day Free Trial Code
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

            {(feedback || error) ? (
              <p className="mt-3 text-center text-[11px] font-bold leading-5 text-rose-200/85" role="alert">
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
        )}

        {!expired ? (
          <div className="mt-6 border-t border-white/[0.07] pt-5 text-center">
            <p className="mb-3 text-[11px] font-semibold text-white/42">
              Don’t have a trial code yet?
            </p>
            <CreatorButton />
            <p className="mt-3 text-[10px] font-semibold leading-4 text-white/28">
              Chat with the creator to arrange your live CLARA introduction and receive access.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
