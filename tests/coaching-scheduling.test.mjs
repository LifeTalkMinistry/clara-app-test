// Regression coverage for the authoritative coaching scheduling flow.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  WELCOME_SESSION_FORM_URL,
  clearUnsentCoachingDraft,
  groupSlotsByDate,
  normalizeAvailability,
  pickRelevantAppointment,
  readUnsentCoachingDraft,
  saveUnsentCoachingDraft,
} from "../src/lib/welcome-session-schedule.js";

const welcomeSession = [
  "src/pages/WelcomeSession.jsx",
  "src/components/coaching/SessionCalendar.jsx",
  "src/components/coaching/SessionCheckIn.jsx",
  "src/components/coaching/SessionStatus.jsx",
  "src/components/coaching/SessionShared.jsx",
].map((file) => fs.readFileSync(file, "utf8")).join("\n");
const sessionOptions = fs.readFileSync("src/components/coaching/sessionOptions.js", "utf8");
const scheduleClient = fs.readFileSync("src/lib/coaching-backend-client.js", "utf8");
const scheduleModule = fs.readFileSync("src/lib/welcome-session-schedule.js", "utf8");
const learningHubEntry = fs.readFileSync(
  "src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx",
  "utf8"
);

test("real backend availability is normalized and grouped in Asia Manila", () => {
  const slots = normalizeAvailability({
    timezone: "Asia/Manila",
    slots: [
      {
        id: "signed-slot",
        starts_at: "2026-07-27T02:00:00.000Z",
        ends_at: "2026-07-27T02:30:00.000Z",
        status: "available",
      },
    ],
  });
  assert.equal(slots.length, 1);
  assert.equal(slots[0].dateKey, "2026-07-27");
  assert.equal(groupSlotsByDate(slots).get("2026-07-27").length, 1);
});

test("invalid or non-authoritative availability never creates fallback slots", () => {
  assert.deepEqual(normalizeAvailability(null), []);
  assert.deepEqual(normalizeAvailability({ timezone: "UTC", slots: [] }), []);
  assert.doesNotMatch(scheduleModule, /buildWelcomeSessionSlots|DAILY_TIME_SLOTS|locally marks/i);
});

test("legacy dashboard entry routes into authoritative CLARA scheduling", () => {
  assert.equal(WELCOME_SESSION_FORM_URL, "/welcome-session");
  assert.doesNotMatch(scheduleModule, /forms\.gle|VITE_CLARA_WELCOME_SESSION_FORM_URL/);
});

test("dashboard coaching shortcut opens the authoritative coaching calendar directly", () => {
  assert.match(learningHubEntry, /useNavigate/);
  assert.match(learningHubEntry, /navigate\("\/welcome-session"\)/);
  assert.match(learningHubEntry, /Open CLARA Coaching Calendar/);
  assert.match(learningHubEntry, /data-clara-coaching-calendar-button/);
  assert.doesNotMatch(
    learningHubEntry,
    /GuidedOnboardingIntroDialog|openWelcomeSessionForm|window\.open/
  );
});

test("current active appointment takes priority over recent history", () => {
  const result = pickRelevantAppointment(
    [
      { id: 1, session_type: "committed_first_session", status: "cancelled" },
      { id: 2, session_type: "committed_first_session", status: "confirmed" },
    ],
    "committed_first_session"
  );
  assert.equal(result.id, 2);
});

test("unsent draft recovery is explicitly non-authoritative", () => {
  const values = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  saveUnsentCoachingDraft("committed_first_session", {
    slotId: "signed-slot",
    answers: { focus: ["budget_cashflow", "savings"] },
  });
  const draft = readUnsentCoachingDraft("committed_first_session");
  assert.equal(draft.status, "unsent_draft");
  assert.equal(draft.slotId, "signed-slot");
  assert.deepEqual(draft.answers.focus, ["budget_cashflow", "savings"]);
  clearUnsentCoachingDraft("committed_first_session");
  assert.equal(readUnsentCoachingDraft("committed_first_session"), null);
  delete global.window;
});

test("user scheduling client derives identity from the authenticated backend session", () => {
  assert.match(scheduleClient, /\/api\/coaching\/availability/);
  assert.match(scheduleClient, /\/api\/coaching\/appointments/);
  assert.doesNotMatch(scheduleClient, /user_id|userId/);
});

test("session focus alone supports a bounded multi-select", () => {
  assert.match(sessionOptions, /key: "focus"[\s\S]{0,240}multiple: true[\s\S]{0,80}maxSelections: 3/);
  assert.match(sessionOptions, /Choose up to 3 concerns/);
  assert.equal((sessionOptions.match(/multiple: true/g) || []).length, 1);
  assert.match(welcomeSession, /currentSelections/);
  assert.match(welcomeSession, /Selected/);
  assert.match(welcomeSession, /selectionLimitReached/);
  assert.match(scheduleClient, /normalizeAnswersForBackend/);
  assert.match(scheduleClient, /answers\.focus/);
  assert.match(scheduleClient, /\.join\(","\)/);
});

test("active appointments allow intake edits without changing scheduling actions", () => {
  assert.match(welcomeSession, /Edit Session Details/);
  assert.match(welcomeSession, /edit-checkin/);
  assert.match(welcomeSession, /answersFromAppointment/);
  assert.match(welcomeSession, /Save Session Details/);
  assert.match(welcomeSession, /appointment date, time, and status did not change/i);
  assert.match(scheduleClient, /updateCoachingAppointmentAnswers/);
  assert.match(scheduleClient, /method: "PATCH"/);
  assert.match(scheduleClient, /answers: normalizeAnswersForBackend\(answers\)/);
  assert.match(welcomeSession, /\["requested", "confirmed", "reschedule_requested"\]/);
});

test("user-facing appointment messages are shown without exposing private admin notes", () => {
  assert.match(welcomeSession, /appointment\.user_message/);
  assert.match(welcomeSession, /Message from Max/);
  assert.match(welcomeSession, /whitespace-pre-wrap/);
  assert.doesNotMatch(welcomeSession, /admin_notes|Private admin notes/);
});

test("completed sessions invite the user to schedule the next monthly session", () => {
  assert.match(welcomeSession, /Plan your next session/);
  assert.match(welcomeSession, /Feel free to schedule your next monthly coaching appointment now\./);
  assert.match(welcomeSession, /better chance to secure your preferred available date and time/i);
  assert.match(welcomeSession, /Schedule Next Session/);
  assert.match(welcomeSession, /\["declined", "cancelled", "completed"\]/);
});

test("session page covers authoritative loading booking collision and status states", () => {
  assert.match(welcomeSession, /Loading real availability/);
  assert.match(welcomeSession, /No appointments are currently available/);
  assert.match(welcomeSession, /Session Request Sent/);
  assert.match(welcomeSession, /That schedule was just taken\. Please choose another available time\./);
  assert.match(welcomeSession, /Waiting for Confirmation/);
  assert.match(welcomeSession, /Your Session Is Confirmed/);
  assert.match(welcomeSession, /Reschedule Requested/);
  assert.match(welcomeSession, /Session Missed/);
  assert.match(welcomeSession, /meeting_link/);
  assert.match(welcomeSession, /COACHING_POLL_INTERVAL_MS/);
  assert.match(welcomeSession, /visibilitychange/);
  assert.match(welcomeSession, /const isCommitmentSession = !hasCommittedAccess/);
  assert.doesNotMatch(welcomeSession, /draft_local|First-draft mode|buildWelcomeSessionSlots/);
});
