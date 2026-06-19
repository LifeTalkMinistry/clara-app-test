const DEFAULT_SETTINGS = {
  timezone: "Asia/Manila",
  durationMinutes: 30,
  workingDays: [1, 2, 3, 4, 5, 6],
  sundayOff: true,
  dayStart: "10:00",
  dayEnd: "15:00",
  bookingWindowMonths: 2,
  defaultCoachId: "coach_001",
};

const coaches = [
  {
    id: "coach_001",
    displayName: "Max",
    email: "max@example.com",
    active: true,
    role: "lead_coach",
  },
  {
    id: "coach_002",
    displayName: "Coach Sofia",
    email: "sofia@example.com",
    active: true,
    role: "coach",
  },
];

const members = [
  ["member_001", "Juan Dela Cruz", "juan@example.com", "committed", 2, "2026-05-20"],
  ["member_002", "Maria Santos", "maria@example.com", "committed", 1, "2026-05-18"],
  ["member_003", "Leah Mendoza", "leah@example.com", "committed", 0, null],
  ["member_004", "Carlo Reyes", "carlo@example.com", "committed", 3, "2026-05-14"],
  ["member_005", "Nina Villanueva", "nina@example.com", "committed", 1, "2026-04-30"],
  ["member_006", "Paolo Garcia", "paolo@example.com", "committed", 2, "2026-05-29"],
  ["member_007", "Ana Flores", "ana@example.com", "committed", 4, "2026-05-10"],
  ["member_008", "Miguel Torres", "miguel@example.com", "committed", 2, "2026-04-12"],
  ["member_009", "Bea Navarro", "bea@example.com", "committed", 1, "2026-05-06"],
  ["member_010", "Kim Bautista", "kim@example.com", "committed", 0, null],
  ["member_011", "Omar Lim", "omar@example.com", "committed", 1, "2026-05-02"],
].map(([id, displayName, email, membershipPlan, previousSessionCount, lastSessionDate]) => ({
  id,
  displayName,
  email,
  avatarUrl: "",
  membershipPlan,
  membershipStatus: "active",
  membershipMonth: "2026-06",
  previousSessionCount,
  lastSessionDate,
}));

function appointment({
  id,
  memberId,
  coachId = null,
  dateKey,
  startTime,
  status,
  focus,
  currentSituation,
  desiredOutcome = "clear_action",
  emotionalState = "motivated",
  coachingApproach = "calm_honest",
  dataConsent = "allow",
  specialFlags = {},
  submittedAt,
  confirmedAt = null,
  completedAt = null,
  cancelledAt = null,
  internalNotes = "",
  preparationNotes = "",
  sessionOutcome = "",
  agreedAction = "",
  followUpNeeded = false,
}) {
  const [hour, minute] = startTime.split(":").map(Number);
  const end = new Date(2026, 0, 1, hour, minute + 30);
  const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

  return {
    id,
    memberId,
    coachId,
    membershipMonth: "2026-06",
    dateKey,
    startTime,
    endTime,
    timezone: "Asia/Manila",
    durationMinutes: 30,
    status,
    focus,
    currentSituation,
    desiredOutcome,
    emotionalState,
    coachingApproach,
    dataConsent,
    specialFlags: {
      bettingRelated: false,
      essentialMoneyRisk: false,
      urgentConcern: false,
      ...specialFlags,
    },
    internalNotes,
    preparationNotes,
    questionsToAsk: "",
    sensitivities: "",
    sessionNotes: "",
    sessionOutcome,
    agreedAction,
    followUpNotes: "",
    followUpNeeded,
    submittedAt,
    confirmedAt,
    completedAt,
    cancelledAt,
    updatedAt: submittedAt,
  };
}

const appointments = [
  appointment({
    id: "appointment_001",
    memberId: "member_002",
    dateKey: "2026-06-19",
    startTime: "10:30",
    status: "pending",
    focus: "urgent_problem",
    currentSituation: "My rent and electricity bill are due this week, but part of the money was used for an unexpected family need.",
    desiredOutcome: "adjust_plan",
    emotionalState: "pressured",
    coachingApproach: "gentle_supportive",
    specialFlags: { essentialMoneyRisk: true, urgentConcern: true },
    submittedAt: "2026-06-19T01:15:00.000Z",
  }),
  appointment({
    id: "appointment_002",
    memberId: "member_001",
    dateKey: "2026-06-25",
    startTime: "12:30",
    status: "pending",
    focus: "income_stability",
    currentSituation: "My income changes every month and I keep building a plan around the highest possible amount instead of the safest amount.",
    desiredOutcome: "adjust_plan",
    emotionalState: "confused",
    coachingApproach: "calm_honest",
    submittedAt: "2026-06-18T10:00:00.000Z",
  }),
  appointment({
    id: "appointment_003",
    memberId: "member_003",
    dateKey: "2026-06-27",
    startTime: "11:00",
    status: "pending",
    focus: "betting_harm",
    currentSituation: "I have used money meant for groceries more than once because I thought I could replace it after winning.",
    desiredOutcome: "clear_action",
    emotionalState: "overwhelmed",
    coachingApproach: "direct_firm",
    specialFlags: { bettingRelated: true, essentialMoneyRisk: true, urgentConcern: true },
    submittedAt: "2026-06-18T14:20:00.000Z",
  }),
  appointment({
    id: "appointment_004",
    memberId: "member_004",
    coachId: "coach_001",
    dateKey: "2026-06-19",
    startTime: "13:00",
    status: "confirmed",
    focus: "progress_accountability",
    currentSituation: "I followed my weekly limits for three weeks, then slipped after a stressful work schedule.",
    desiredOutcome: "review_progress",
    emotionalState: "hopeful",
    coachingApproach: "adaptive",
    submittedAt: "2026-06-16T03:00:00.000Z",
    confirmedAt: "2026-06-16T05:30:00.000Z",
    preparationNotes: "Start with the three successful weeks before discussing the setback.",
  }),
  appointment({
    id: "appointment_005",
    memberId: "member_005",
    coachId: "coach_002",
    dateKey: "2026-06-20",
    startTime: "10:00",
    status: "confirmed",
    focus: "debt_bills",
    currentSituation: "I want to organize three overdue balances and decide what to contact first.",
    desiredOutcome: "make_decision",
    emotionalState: "discouraged",
    coachingApproach: "gentle_supportive",
    dataConsent: "answers_only",
    submittedAt: "2026-06-15T08:10:00.000Z",
    confirmedAt: "2026-06-15T10:30:00.000Z",
  }),
  appointment({
    id: "appointment_006",
    memberId: "member_006",
    coachId: "coach_001",
    dateKey: "2026-06-30",
    startTime: "14:00",
    status: "confirmed",
    focus: "impulsive_spending",
    currentSituation: "I keep buying small things after night shifts because it feels like a reward, then I regret the total later.",
    desiredOutcome: "understand_pattern",
    emotionalState: "motivated",
    coachingApproach: "direct_firm",
    submittedAt: "2026-06-17T04:30:00.000Z",
    confirmedAt: "2026-06-17T06:15:00.000Z",
  }),
  appointment({
    id: "appointment_007",
    memberId: "member_007",
    coachId: "coach_001",
    dateKey: "2026-06-10",
    startTime: "10:30",
    status: "completed",
    focus: "budget_cashflow",
    currentSituation: "My category limits looked correct, but I was forgetting irregular bills.",
    desiredOutcome: "adjust_plan",
    emotionalState: "calm",
    coachingApproach: "gentle_supportive",
    submittedAt: "2026-06-06T05:00:00.000Z",
    confirmedAt: "2026-06-06T06:00:00.000Z",
    completedAt: "2026-06-10T03:00:00.000Z",
    agreedAction: "Add quarterly bills to the monthly sinking-fund view.",
    sessionOutcome: "",
    followUpNeeded: true,
  }),
  appointment({
    id: "appointment_008",
    memberId: "member_008",
    coachId: "coach_002",
    dateKey: "2026-06-12",
    startTime: "11:30",
    status: "completed",
    focus: "savings",
    currentSituation: "I save only what remains, so most months nothing is transferred.",
    desiredOutcome: "clear_action",
    emotionalState: "motivated",
    coachingApproach: "calm_honest",
    submittedAt: "2026-06-08T02:40:00.000Z",
    confirmedAt: "2026-06-08T03:10:00.000Z",
    completedAt: "2026-06-12T04:00:00.000Z",
    sessionOutcome: "Created a realistic payday-first savings amount.",
    agreedAction: "Transfer ₱500 within 24 hours of each payday.",
  }),
  appointment({
    id: "appointment_009",
    memberId: "member_009",
    coachId: "coach_001",
    dateKey: "2026-06-14",
    startTime: "13:30",
    status: "cancelled",
    focus: "upcoming_expense",
    currentSituation: "I need to prepare for school enrollment costs next month.",
    emotionalState: "hopeful",
    coachingApproach: "calm_honest",
    submittedAt: "2026-06-09T09:20:00.000Z",
    confirmedAt: "2026-06-09T10:00:00.000Z",
    cancelledAt: "2026-06-13T07:00:00.000Z",
  }),
  appointment({
    id: "appointment_010",
    memberId: "member_010",
    dateKey: "2026-06-24",
    startTime: "10:00",
    status: "reschedule_requested",
    focus: "clara_setup",
    currentSituation: "I selected a time that now overlaps with work and need a later slot.",
    desiredOutcome: "setup_feature",
    emotionalState: "calm",
    coachingApproach: "adaptive",
    submittedAt: "2026-06-17T10:25:00.000Z",
  }),
  appointment({
    id: "appointment_011",
    memberId: "member_011",
    coachId: "coach_001",
    dateKey: "2026-06-18",
    startTime: "14:30",
    status: "no_show",
    focus: "decision",
    currentSituation: "I wanted help comparing whether to repair or replace a work laptop.",
    desiredOutcome: "make_decision",
    emotionalState: "confused",
    coachingApproach: "calm_honest",
    submittedAt: "2026-06-14T05:10:00.000Z",
    confirmedAt: "2026-06-14T06:00:00.000Z",
  }),
];

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildAvailability(settings = DEFAULT_SETTINGS, sourceAppointments = appointments) {
  const result = [];
  const start = new Date(2026, 5, 1);
  const end = new Date(2026, 7, 31);
  const appointmentBySlot = new Map(
    sourceAppointments.map((item) => [`${item.dateKey}_${item.startTime.replace(":", "-")}`, item])
  );

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const working = settings.workingDays.includes(cursor.getDay()) && !(settings.sundayOff && cursor.getDay() === 0);
    if (!working) continue;

    const key = dateKey(cursor);
    const startMinutes = minutesFromTime(settings.dayStart);
    const endMinutes = minutesFromTime(settings.dayEnd);

    for (let minutes = startMinutes; minutes + settings.durationMinutes <= endMinutes; minutes += settings.durationMinutes) {
      const startTime = timeFromMinutes(minutes);
      const endTime = timeFromMinutes(minutes + settings.durationMinutes);
      const id = `${key}_${startTime.replace(":", "-")}`;
      const linkedAppointment = appointmentBySlot.get(id);
      let status = "available";

      if (linkedAppointment) {
        if (["pending", "reschedule_requested"].includes(linkedAppointment.status)) status = "pending";
        if (["confirmed", "completed", "no_show"].includes(linkedAppointment.status)) status = "booked";
      }

      result.push({
        id,
        dateKey: key,
        startTime,
        endTime,
        coachId: linkedAppointment?.coachId || settings.defaultCoachId,
        status,
        appointmentId: status === "available" ? null : linkedAppointment?.id || null,
        blockReason: "",
        manuallyBlocked: false,
      });
    }
  }

  const blockSlot = (id, reason) => {
    const slot = result.find((item) => item.id === id);
    if (!slot || slot.appointmentId) return;
    slot.status = "blocked";
    slot.blockReason = reason;
    slot.manuallyBlocked = true;
  };

  blockSlot("2026-06-19_12-00", "Private preparation time");
  blockSlot("2026-06-26_14-30", "Admin hold");

  return result;
}

export function createMockCoachingSeed() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    coaches: coaches.map((item) => ({ ...item })),
    members: members.map((item) => ({ ...item })),
    appointments: appointments.map((item) => ({
      ...item,
      specialFlags: { ...item.specialFlags },
    })),
    availability: buildAvailability(DEFAULT_SETTINGS, appointments),
    dateBlocks: {
      "2026-07-04": { reason: "Personal day off", type: "personal_day" },
      "2026-07-20": { reason: "Holiday", type: "holiday" },
    },
    customHours: {
      "2026-07-11": { dayStart: "11:00", dayEnd: "14:00" },
    },
    lastUpdatedAt: "2026-06-19T10:00:00.000Z",
  };
}
