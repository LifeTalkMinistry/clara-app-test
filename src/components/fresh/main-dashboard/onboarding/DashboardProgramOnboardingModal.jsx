import { CalendarDays, CheckCircle2, Flag, Rocket, ShieldCheck, X } from "lucide-react";
import OnboardingActionBar from "@/components/fresh/main-dashboard/onboarding/OnboardingActionBar";

export default function DashboardProgramOnboardingModal({
  showOnboarding,
  closeOnboarding,
  onboardingStep,
  setOnboardingStep,
  commitmentChecked,
  setCommitmentChecked,
  savingOnboarding,
  goToNextOnboardingStep,
  nickname,
  setNickname,
  reminderTime,
  setReminderTime,
  financialGoal,
  setFinancialGoal,
  finishOnboarding,
}) {
  if (!showOnboarding) return null;

  return (
        <div
          className="fixed inset-0 z-[99999] bg-[#020817]/88 backdrop-blur-xl"
          onClick={closeOnboarding}
        >
          <div className="flex h-[100dvh] w-full items-end justify-center sm:items-center">
            <div
              className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#08111f_0%,#071120_38%,#061018_100%)] text-white sm:h-[94vh] sm:max-h-[920px] sm:w-[min(100%,860px)] sm:rounded-[32px] sm:border sm:border-white/15 sm:shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative z-10 border-b border-white/15 bg-black/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
                      <span>CLARA Program Onboarding</span>
                    </div>

                    <h2 className="mt-3 text-[1.35rem] font-bold leading-tight md:text-[1.65rem]">
                      {onboardingStep === 0 && "Commitment Agreement"}
                      {onboardingStep === 1 && "Rules & Expectations"}
                      {onboardingStep === 2 && "Initial Setup"}
                      {onboardingStep === 3 && "Coaching & Support"}
                      {onboardingStep === 4 && "Dashboard Introduction"}
                      {onboardingStep === 5 && "How CLARA Helps You Daily"}
                      {onboardingStep === 6 && "Start Day 1"}
                    </h2>

                    <p className="mt-1 text-sm text-white/60">
                      Step {onboardingStep + 1} of 7
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeOnboarding}
                    className="shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-2.5 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-500 transition-all duration-300"
                      style={{ width: `${((onboardingStep + 1) / 7) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
                <div className="mx-auto w-full max-w-3xl">
                  {onboardingStep === 0 && (
                    <div className="space-y-5">
                      <div className="overflow-hidden rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/14 to-green-600/8 p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-500/18 text-emerald-300 shadow-[0_12px_30px_rgba(16,185,129,0.15)]">
                            <CheckCircle2 className="h-7 w-7" />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold leading-tight">
                              Welcome to your 30-day transformation
                            </h3>
                            <p className="mt-2 text-sm leading-7 text-white/75">
                              CLARA is not just a tracker. This is a guided behavior-change
                              program built around structure, consistency, accountability,
                              and action.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5 md:p-6">
                        <p className="text-sm leading-7 text-white/80">
                          By continuing, you acknowledge that you are entering a guided
                          financial coaching experience and you are expected to complete
                          your tasks honestly and consistently.
                        </p>

                        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-3xl border border-white/15 bg-[#091423] px-4 py-4 transition hover:border-emerald-400/25 hover:bg-[#0c1829]">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-emerald-500"
                            checked={commitmentChecked}
                            onChange={(e) => setCommitmentChecked(e.target.checked)}
                          />
                          <span className="text-sm leading-6 text-white/82">
                            I commit to completing the CLARA program, following the daily
                            process, and taking responsibility for my progress.
                          </span>
                        </label>
                      </div>

                      <OnboardingActionBar
                        onNext={goToNextOnboardingStep}
                        nextDisabled={!commitmentChecked || savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-white">What CLARA expects</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Complete tasks in sequence</li>
                            <li>• Show honesty in your submissions</li>
                            <li>• Treat progress as discipline, not mood</li>
                          </ul>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                            <CalendarDays className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-white">How the flow works</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• You unlock structure one day at a time</li>
                            <li>• Modules and tasks support each other</li>
                            <li>• Your dashboard is your daily control center</li>
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                        <p className="text-sm font-semibold text-white">Your commitment matters</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          This program works best when you stop waiting for the perfect mood
                          and start moving with structure. Your consistency is the strategy.
                        </p>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(0)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="I Understand"
                      />
                    </div>
                  )}

                  {onboardingStep === 2 && (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5 md:p-6">
                        <p className="text-sm font-semibold text-white">
                          Complete your initial setup
                        </p>
                        <p className="mt-1 text-sm text-white/65">
                          This helps personalize your coaching journey from Day 1.
                        </p>

                        <div className="mt-5 grid gap-4">
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                              Name or Nickname
                            </label>
                            <input
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value)}
                              placeholder="What should CLARA call you?"
                              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                              Preferred Reminder Time
                            </label>
                            <input
                              type="time"
                              value={reminderTime}
                              onChange={(e) => setReminderTime(e.target.value)}
                              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                              Main Financial Goal
                            </label>
                            <textarea
                              value={financialGoal}
                              onChange={(e) => setFinancialGoal(e.target.value)}
                              placeholder="Example: Build emergency fund, stop impulsive spending, save my first ₱50,000."
                              className="min-h-[110px] w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                            />
                          </div>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(1)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Save & Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 3 && (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-emerald-400/15 bg-emerald-500/10 p-5">
                        <p className="text-sm font-semibold text-white">Your support system</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          If your tier includes coaching, book your first session within
                          Day 1 to Day 3. That first session acts as your onboarding
                          alignment and sets the tone for the rest of the program.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">What happens next</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Access your first weekly module</li>
                            <li>• Start completing daily tasks in order</li>
                            <li>• Track money using your dashboard tools</li>
                          </ul>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Coaching users</p>
                          <ul className="mt-3 space-y-2 text-sm text-white/70">
                            <li>• Book your session early</li>
                            <li>• Bring your honest money habits</li>
                            <li>• Use the session for clarity and accountability</li>
                          </ul>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(2)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 4 && (
                    <div className="space-y-4">
                      <div className="grid gap-3">
                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Dashboard</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            This is your main control center for progress, money tracking,
                            and daily action.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Day Mission</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            Your next task is always visible so you know exactly what to do next.
                          </p>
                        </div>

                        <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                          <p className="text-sm font-semibold text-white">Finance carousel</p>
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            Use wallets, expenses, budgets, and savings goals to support real
                            progress without losing momentum.
                          </p>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(3)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 5 && (
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-yellow-300">
                          <Flag className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-white">How CLARA helps daily</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          Your dashboard keeps your priorities visible. Your tasks give you the
                          next step. Your tools give you the structure to stop drifting and
                          start building momentum.
                        </p>
                      </div>

                      <div className="rounded-[28px] border border-white/15 bg-white/[0.075] p-5">
                        <p className="text-sm font-semibold text-white">What to remember</p>
                        <ul className="mt-3 space-y-2 text-sm text-white/70">
                          <li>• Progress comes from repetition</li>
                          <li>• Structure protects you from inconsistency</li>
                          <li>• Small daily action compounds</li>
                        </ul>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(4)}
                        onNext={goToNextOnboardingStep}
                        nextDisabled={savingOnboarding}
                        nextLabel="Continue"
                      />
                    </div>
                  )}

                  {onboardingStep === 6 && (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/16 to-cyan-500/10 p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-emerald-300">
                            <Rocket className="h-7 w-7" />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold leading-tight">You are ready to start</h3>
                            <p className="mt-2 text-sm leading-7 text-white/75">
                              Your setup is complete. Head into Day 1 and begin your guided
                              reset with clarity and structure.
                            </p>
                          </div>
                        </div>
                      </div>

                      <OnboardingActionBar
                        onBack={() => setOnboardingStep(5)}
                        onNext={finishOnboarding}
                        nextDisabled={savingOnboarding}
                        nextLabel={savingOnboarding ? "Saving..." : "Start Day 1"}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
