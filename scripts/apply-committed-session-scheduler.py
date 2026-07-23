from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(
        pattern,
        lambda _match: replacement,
        text,
        count=1,
        flags=flags,
    )
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return updated


dashboard_path = Path(
    "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx"
)
dashboard = dashboard_path.read_text()

dashboard = replace_once(
    dashboard,
    'import { Lock, RefreshCcw, X } from "lucide-react";',
    'import { CalendarDays, Lock, RefreshCcw, X } from "lucide-react";',
    "dashboard icon import",
)
dashboard = replace_once(
    dashboard,
    "  const { membership, refreshUser } = useUserRole();",
    "  const { refreshUser } = useUserRole();",
    "remove unused membership object",
)
dashboard = sub_once(
    dashboard,
    r"(function ClaraCommitmentBookletModal\(\{\s*open,\s*onClose,\s*onDeclineCommitment,\s*)(purchaseIntent)",
    "function ClaraCommitmentBookletModal({\n  open,\n  onClose,\n  onDeclineCommitment,\n  onScheduleSession,\n  purchaseIntent",
    "booklet props",
)
dashboard = sub_once(
    dashboard,
    r"\n  const handleDeclineCommitment = \(\) => \{",
    "\n  const handleScheduleSession = () => {\n"
    "    if (refreshing) return;\n"
    "    setRefreshMessage(\"\");\n"
    "    setMembershipInfoOpen(false);\n"
    "    onScheduleSession?.();\n"
    "  };\n\n"
    "  const handleDeclineCommitment = () => {",
    "schedule handler",
)
dashboard = replace_once(
    dashboard,
    "View Membership Status",
    "Start Your Committed Journey",
    "final booklet CTA",
)

new_modal = '''              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/48">
                CLARA Committed Version
              </p>
              <h3 className="mt-4 text-[1.55rem] font-black leading-tight tracking-[-0.05em] text-white">
                Start Your Committed Journey
              </h3>
              <p className="mx-auto mt-3 max-w-[290px] text-sm font-bold leading-6 text-white/68">
                Schedule a one-on-one budgeting session with Max. Together, you’ll
                review your current money situation and build a budget that fits
                your real life.
              </p>

              <div className="mt-5 rounded-[24px] border border-white/12 bg-white/[0.07] px-4 py-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                  Your first step
                </p>
                <p className="mt-2 text-base font-black text-white/90">
                  One-on-One Budgeting Session
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/52">
                  Choose an available date and time, then complete a short check-in
                  so Max can prepare for your session.
                </p>
              </div>

              {refreshMessage ? (
                <p className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold leading-5 text-white/62">
                  {refreshMessage}
                </p>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleScheduleSession}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,99,235,0.26)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CalendarDays className="h-4 w-4" />
                  Schedule My Session
                </button>
                <button
                  type="button"
                  onClick={handleRefreshMembership}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black text-cyan-50/62 transition hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing
                    ? "Refreshing..."
                    : "Already enrolled? Refresh your access"}
                </button>
                <button
                  type="button"
                  onClick={handleDeclineCommitment}
                  disabled={refreshing}
                  className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/42 transition hover:text-white/64 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Not now
                </button>
              </div>'''

dashboard = sub_once(
    dashboard,
    r'''              <p className="text-\[10px\] font-black uppercase tracking-\[0\.24em\] text-cyan-100/48">\s*CLARA Account\s*</p>[\s\S]*?              </div>(?=\n            </div>\n          </div>\n        \) : null\})''',
    new_modal,
    "committed invitation modal",
)
dashboard = replace_once(
    dashboard,
    '''  const closeCommitmentBooklet = useCallback(() => {
    setCommitmentBookletOpen(false);
  }, []);''',
    '''  const closeCommitmentBooklet = useCallback(() => {
    setCommitmentBookletOpen(false);
  }, []);

  const handleScheduleCommittedSession = useCallback(() => {
    setCommitmentBookletOpen(false);
    setPurchaseIntent(COMMITTED_MONTHLY_PURCHASE_INTENT);
    navigate("/welcome-session");
  }, [navigate]);''',
    "dashboard schedule navigation",
)
dashboard = replace_once(
    dashboard,
    '''      onDeclineCommitment={handleCommitmentDecline}
      purchaseIntent={purchaseIntent}''',
    '''      onDeclineCommitment={handleCommitmentDecline}
      onScheduleSession={handleScheduleCommittedSession}
      purchaseIntent={purchaseIntent}''',
    "booklet schedule prop",
)
dashboard = replace_once(
    dashboard,
    "Tap to see membership information.",
    "Tap to schedule your one-on-one session.",
    "locked preview copy",
)
dashboard_path.write_text(dashboard)

session_path = Path("src/pages/WelcomeSession.jsx")
session = session_path.read_text()
session = replace_once(session, "  LockKeyhole,\n", "", "remove lock icon")
session = sub_once(
    session,
    r'''import \{\s*openCommittedVersionModal,\s*useCommittedFeatureAccess,\s*\} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";''',
    'import { useCommittedFeatureAccess } from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";',
    "remove activation modal import",
)
session = replace_once(
    session,
    "function MonthlyCoachingIntro({ onOpenMockPreview }) {",
    "function MonthlyCoachingIntro({ onOpenMockPreview, isCommitmentSession }) {",
    "intro props",
)
session = sub_once(
    session,
    r'''              Monthly Coaching\s*</h1>\s*<p className="mt-1 text-\[12px\] font-semibold leading-relaxed text-slate-300/75 sm:text-\[13px\]">\s*One personal 30-minute coaching session is included with every active membership month\.\s*</p>''',
    '''              {isCommitmentSession
                ? "One-on-One Budgeting Session"
                : "Monthly Coaching"}
            </h1>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-300/75 sm:text-[13px]">
              {isCommitmentSession
                ? "Your first personal session with Max before starting the Committed Version."
                : "One personal 30-minute coaching session is included with every active membership month."}
            </p>''',
    "intro heading copy",
)
session = replace_once(
    session,
    '''        <p className="mt-4 max-w-2xl text-[11px] font-semibold leading-relaxed text-slate-300/62 sm:text-[12px]">
          Choose an available date and time, then complete your private coaching check-in.
        </p>''',
    '''        <p className="mt-4 max-w-2xl text-[11px] font-semibold leading-relaxed text-slate-300/62 sm:text-[12px]">
          {isCommitmentSession
            ? "Choose an available date and time, then complete a short check-in so Max can prepare for you."
            : "Choose an available date and time, then complete your private coaching check-in."}
        </p>''',
    "intro helper copy",
)
session = replace_once(
    session,
    '<SummaryChip icon={Sparkles} label="Access" value="Monthly" />',
    '<SummaryChip icon={Sparkles} label="Access" value={isCommitmentSession ? "First Step" : "Monthly"} />',
    "intro access chip",
)
session = sub_once(
    session,
    r'''(function AvailabilityPanel\(\{[\s\S]*?onContinue,\s*)hasCommittedAccess,''',
    '''function AvailabilityPanel({
  selectedDateLabel,
  selectedDateSlots,
  selectedSlotId,
  onSelectSlot,
  onReset,
  onContinue,
  isCommitmentSession,''',
    "availability props",
)
session = replace_once(
    session,
    "Choose your preferred 30-minute time for this month’s coaching session.",
    '''{isCommitmentSession
              ? "Choose your preferred 30-minute time for your one-on-one budgeting session."
              : "Choose your preferred 30-minute time for this month’s coaching session."}''',
    "availability helper",
)
session = replace_once(
    session,
    "disabled={!isAvailable || !hasCommittedAccess}",
    "disabled={!isAvailable}",
    "enable free-user slots",
)
session = sub_once(
    session,
    r'''      \{!hasCommittedAccess \? \([\s\S]*?      \)\}\n\n(?=      <div className="mt-2\.5 flex items-start gap-2)''',
    '''      <button
        type="button"
        disabled={!selectedSlot}
        onClick={onContinue}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/25 bg-[linear-gradient(100deg,rgba(14,165,233,0.88),rgba(99,102,241,0.94))] px-4 text-[9px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(37,99,235,0.26)] transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {selectedSlot
          ? isCommitmentSession
            ? "Continue to session check-in"
            : "Continue to coaching check-in"
          : "Choose an available time"}
        {selectedSlot ? <ArrowRight className="h-3.5 w-3.5" /> : null}
      </button>

''',
    "replace activation CTA",
)
session = replace_once(
    session,
    "One session is included per active membership month. Booking is first come, first served and confirmed after review.",
    '''{isCommitmentSession
            ? "This is your first step toward the Committed Version. Booking is first come, first served and confirmed after review."
            : "One session is included per active membership month. Booking is first come, first served and confirmed after review."}''',
    "booking note",
)
session = replace_once(
    session,
    "function CheckInCompletePanel({ selectedDateLabel, selectedSlot, onReview, onHome }) {",
    '''function CheckInCompletePanel({
  selectedDateLabel,
  selectedSlot,
  onReview,
  onHome,
  isCommitmentSession,
}) {''',
    "complete panel props",
)
session = sub_once(
    session,
    r'''        Monthly Coaching\s*</p>\s*<h1 className="mt-1\.5 text-\[27px\] font-black tracking-tight text-white">\s*Check-In Complete\s*</h1>\s*<p className="mx-auto mt-2 max-w-md text-\[11px\] font-semibold leading-relaxed text-slate-300/68">\s*Your coach now has a clearer picture of your concern, preferred approach, and desired result\.\s*</p>''',
    '''        {isCommitmentSession ? "Committed Journey" : "Monthly Coaching"}
      </p>
      <h1 className="mt-1.5 text-[27px] font-black tracking-tight text-white">
        {isCommitmentSession ? "Session Request Prepared" : "Check-In Complete"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[11px] font-semibold leading-relaxed text-slate-300/68">
        {isCommitmentSession
          ? "Your preferred schedule and check-in are ready for the next step of your Committed journey."
          : "Your coach now has a clearer picture of your concern, preferred approach, and desired result."}
      </p>''',
    "complete panel copy",
)
session = replace_once(
    session,
    "First-draft mode: this check-in is saved on this device. Live submission, slot reservation, and coach assignment will be connected through Supabase.",
    '''{isCommitmentSession
            ? "First-draft mode: your request is saved on this device. Live submission and final schedule confirmation are not connected yet."
            : "First-draft mode: this check-in is saved on this device. Live submission, slot reservation, and coach assignment are not connected yet."}''',
    "honest completion note",
)
session = replace_once(
    session,
    '''  const hasCommittedAccess = useCommittedFeatureAccess();
  const slots = useMemo(() => buildWelcomeSessionSlots(), []);''',
    '''  const hasCommittedAccess = useCommittedFeatureAccess();
  const isCommitmentSession = !hasCommittedAccess;
  const slots = useMemo(() => buildWelcomeSessionSlots(), []);''',
    "derive session type",
)
session = replace_once(
    session,
    '''      version: 2,
      status: "draft_local",
      createdAt: new Date().toISOString(),''',
    '''      version: 2,
      status: "draft_local",
      sessionType: isCommitmentSession
        ? "committed_first_session"
        : "monthly_coaching",
      createdAt: new Date().toISOString(),''',
    "session payload type",
)
session = replace_once(
    session,
    '''      localStorage.setItem("claraMonthlyCoachingCheckInDraft", JSON.stringify(payload));''',
    '''      localStorage.setItem(
        isCommitmentSession
          ? "claraCommittedFirstSessionDraft"
          : "claraMonthlyCoachingCheckInDraft",
        JSON.stringify(payload)
      );''',
    "session storage key",
)
session = replace_once(
    session,
    "            <MonthlyCoachingIntro onOpenMockPreview={handleCoachingIconTap} />",
    '''            <MonthlyCoachingIntro
              onOpenMockPreview={handleCoachingIconTap}
              isCommitmentSession={isCommitmentSession}
            />''',
    "intro usage",
)
session = replace_once(
    session,
    '''              onReset={resetToCalendar}
              onContinue={startCheckIn}
              hasCommittedAccess={hasCommittedAccess}''',
    '''              onReset={resetToCalendar}
              onContinue={startCheckIn}
              isCommitmentSession={isCommitmentSession}''',
    "availability usage",
)
session = replace_once(
    session,
    '''              onHome={() => navigate("/dashboard")}
            />''',
    '''              onHome={() => navigate("/dashboard")}
              isCommitmentSession={isCommitmentSession}
            />''',
    "complete panel usage",
)
session = replace_once(
    session,
    "                  Monthly coaching calendar",
    '''                  {isCommitmentSession
                    ? "One-on-one session calendar"
                    : "Monthly coaching calendar"}''',
    "calendar label",
)
session_path.write_text(session)

test_path = Path("tests/committed-session-routing.test.mjs")
test_path.write_text(
    '''import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const dashboard = fs.readFileSync(
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx",
  "utf8"
);
const welcomeSession = fs.readFileSync("src/pages/WelcomeSession.jsx", "utf8");

test("Committed invitation routes to the one-on-one scheduler", () => {
  assert.match(dashboard, /Schedule My Session/);
  assert.match(dashboard, /navigate\("\/welcome-session"\)/);
  assert.match(dashboard, /Already enrolled\? Refresh your access/);
  assert.doesNotMatch(dashboard, /cannot be activated with a password, code, role/);
});

test("Free users can select session slots without an activation loop", () => {
  assert.match(welcomeSession, /const isCommitmentSession = !hasCommittedAccess/);
  assert.match(welcomeSession, /disabled=\{!isAvailable\}/);
  assert.match(welcomeSession, /committed_first_session/);
  assert.doesNotMatch(welcomeSession, /Unlock monthly coaching/);
  assert.doesNotMatch(welcomeSession, /openCommittedVersionModal/);
});
'''
)
