import {
  getChallengeDayUnlockLabel,
  getCurrentChallengeDay,
  getNextUnlockAt,
  isChallengeDayUnlocked,
} from "@/lib/challenge-schedule";

const DEFAULT_STARTER_DAY_LIMIT = 5;
const PROGRAM_LENGTH = 30;
const COMPLETE_STATUSES = new Set(["pending", "submitted", "reviewed", "approved", "completed"]);
const REVISION_STATUSES = new Set(["rejected", "needs_revision"]);

const PLAN_TO_EXPERIENCE_TIER = {
  free: "free",
  committed: "committed_249",
  committed_249: "committed_249",
  clara_commitment_249: "committed_249",
  pro: "committed_249",
  pro_99: "committed_249",
  core: "committed_249",
  core_599: "committed_249",
  coaching: "committed_249",
  coaching_1299: "committed_249",
  life_os: "committed_249",
  lifeos: "committed_249",
  life_os_499: "committed_249",
  lifeos_499: "committed_249",
  clara_lifeos_499: "committed_249",
};

export const EXPERIENCE_TIER_LABELS = {
  free: "Free",
  pro_99: "Committed",
  core_599: "Committed",
  coaching_1299: "Committed",
  committed_249: "Committed",
};

const normalize = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

function toPositiveInt(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return Math.floor(num);
  }

  return null;
}

function normalizeTierAccess(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeLower).filter(Boolean);
  }

  const raw = normalize(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeLower).filter(Boolean);
    }
  } catch {
    // ignore
  }

  return raw
    .split(",")
    .map((item) => normalizeLower(item))
    .filter(Boolean);
}

function sortTasks(tasks = []) {
  return [...tasks].sort((a, b) => {
    const sortDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0);
    if (sortDiff !== 0) return sortDiff;

    const dayDiff = Number(a.day || a.day_number || 0) - Number(b.day || b.day_number || 0);
    if (dayDiff !== 0) return dayDiff;

    return Number(a.week || a.week_number || 0) - Number(b.week || b.week_number || 0);
  });
}

export function normalizeProgramTask(task = {}) {
  const day = Number(task.day ?? task.day_number ?? task.sort_order ?? 1);
  const week = Number(task.week ?? task.week_number ?? (Math.ceil(day / 7) || 1));
  const sortOrder = Number(task.sort_order ?? day ?? 0);
  const title = normalize(task.title || `Day ${day}`);
  const description = normalize(task.description);
  const taskInstruction = normalize(
    task.task_instruction || task.main_action_instruction || task.main_instruction || description
  );
  const whyThisMatters = normalize(task.why_this_matters || task.main_why_it_matters || task.why_it_matters);
  const rewardTitle = normalize(task.reward_title || `Day ${day} Complete`);

  return {
    ...task,
    week,
    day,
    week_number: week,
    day_number: day,
    sort_order: sortOrder,
    title,
    short_label: normalize(task.short_label || title),
    theme: normalize(task.theme || ""),
    description,
    why_this_matters: whyThisMatters,
    task_instruction: taskInstruction,
    reflection_prompt: normalize(task.reflection_prompt || ""),
    journal_placeholder: normalize(task.journal_placeholder || ""),
    question_1: normalize(task.question_1 || ""),
    question_2: normalize(task.question_2 || ""),
    question_3: normalize(task.question_3 || ""),
    completion_button_text: normalize(task.completion_button_text || "Mark Complete"),
    milestone_type: normalizeLower(task.milestone_type || ""),
    reward_title: rewardTitle,
    reward_message: normalize(task.reward_message || ""),
    estimated_minutes: Number(task.estimated_minutes || 10),
    tier_access: normalizeTierAccess(task.tier_access),
    is_active: typeof task.is_active === "boolean" ? task.is_active : task.status !== "inactive",
    program_family: normalize(task.program_family || "reset_30"),
    program_template_key: normalize(task.program_template_key || `day_${String(day).padStart(2, "0")}`),

    difficulty_mode_enabled: !!task.difficulty_mode_enabled,
    main_action_instruction: taskInstruction,
    main_why_it_matters: whyThisMatters,
    main_optional_guidance: normalize(task.main_optional_guidance || task.optional_guidance || ""),
    main_points: Number(task.main_points ?? task.points ?? 10),
    proof_required: task.proof_required || "none",
    require_detailed_answer: !!task.require_detailed_answer,
    interview_candidate_task: !!task.interview_candidate_task,
  };
}

export function resolveExperienceTier(profileLike, enrollment = null, fallbackPlan = "") {
  const candidates = [
    fallbackPlan,
    profileLike?.plan,
    enrollment?.plan,
    enrollment?.plan_key,
    enrollment?.tier,
    enrollment?.selected_plan,
    profileLike?.selected_plan,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLower(candidate);
    if (PLAN_TO_EXPERIENCE_TIER[normalized]) {
      return PLAN_TO_EXPERIENCE_TIER[normalized];
    }
  }

  return "free";
}

export function getStarterDayLimit(profileLike, enrollment = null) {
  return (
    toPositiveInt(
      profileLike?.starter_program_days,
      profileLike?.starter_day_limit,
      profileLike?.program_preview_days,
      enrollment?.starter_program_days,
      enrollment?.starter_day_limit,
    ) || DEFAULT_STARTER_DAY_LIMIT
  );
}

export function taskSupportsTier(task, tier) {
  if (!task) return false;
  if (tier === "free") return false;

  const tierAccess = normalizeTierAccess(task.tier_access);
  if (tierAccess.length === 0) return true;

  if (tier === "committed_249") {
    return tierAccess.includes("committed_249");
  }

  return false;
}

export function getSubmissionMeta(submission) {
  if (!submission) {
    return {
      exists: false,
      status: "not_started",
      isComplete: false,
      needsRevision: false,
      isUnderReview: false,
      isApproved: false,
    };
  }

  const status = normalizeLower(submission.status || "submitted");

  return {
    exists: true,
    status,
    isComplete: COMPLETE_STATUSES.has(status),
    needsRevision: REVISION_STATUSES.has(status),
    isUnderReview: status === "pending" || status === "submitted" || status === "reviewed",
    isApproved: status === "approved" || status === "completed",
  };
}

function buildSubmissionMap(submissions = []) {
  return submissions.reduce((map, submission) => {
    if (!submission?.task_id) return map;
    if (!map.has(submission.task_id)) {
      map.set(submission.task_id, submission);
    }
    return map;
  }, new Map());
}

export function calculateUnlockedProgramDay(programRecord, totalDays = PROGRAM_LENGTH) {
  if (!programRecord?.challenge_started) return 0;

  const startDateValue =
    programRecord?.challenge_local_start_date ||
    programRecord?.program_start_date ||
    programRecord?.started_at;
  if (!startDateValue) return 0;

  const scheduledUnlocked = getCurrentChallengeDay(startDateValue);
  const manualUnlocked = Number(programRecord?.manual_unlock_until || 0);
  const overrideDay = Number(programRecord?.current_day_override || 0);

  return Math.max(1, Math.min(totalDays, Math.max(scheduledUnlocked, manualUnlocked, overrideDay)));
}

export function calculateLegacyUnlockedProgramDay(programRecord, totalDays = PROGRAM_LENGTH) {
  const startDateValue = programRecord?.program_start_date || programRecord?.started_at;
  if (!startDateValue) return 0;

  const startDate = new Date(startDateValue);
  if (Number.isNaN(startDate.getTime())) return 1;

  startDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor((today.getTime() - startDate.getTime()) / 86400000);
  const autoUnlocked = Math.max(1, dayDiff + 1);
  const manualUnlocked = Number(programRecord?.manual_unlock_until || 0);
  const overrideDay = Number(programRecord?.current_day_override || 0);

  return Math.max(1, Math.min(totalDays, Math.max(autoUnlocked, manualUnlocked, overrideDay)));
}

export function buildProgramJourney(tasks = [], submissions = [], options = {}) {
  const tier = resolveExperienceTier(options.profile, options.enrollment, options.plan);
  const starterDayLimit = getStarterDayLimit(options.profile, options.enrollment);
  const normalizedTasks = sortTasks(tasks.map(normalizeProgramTask)).filter(
    (task) => task.program_family === "reset_30"
  );
  const totalDays = normalizedTasks.length || PROGRAM_LENGTH;
  const unlockedDay = calculateUnlockedProgramDay(options.programRecord, totalDays);
  const challengeStarted = Boolean(options.programRecord?.challenge_started);
  const challengeStartDate =
    options.programRecord?.challenge_local_start_date || options.programRecord?.program_start_date || "";
  const submissionMap = buildSubmissionMap(submissions);

  const items = normalizedTasks.map((task, index) => {
    const submission = submissionMap.get(task.id) || null;
    const submissionMeta = getSubmissionMeta(submission);
    const isPublished = task.is_active !== false && task.status !== "inactive";
    const isTierAllowed = taskSupportsTier(task, tier);
    const isVisibleToPro = tier === "committed_249";
    const isUnlockedByDate =
      challengeStarted &&
      task.day <= unlockedDay &&
      isChallengeDayUnlocked(challengeStartDate, task.day);
    const isToday = task.day === unlockedDay;

    let state = "locked";
    let lockedReason = "";

    if (!isPublished) {
      state = "locked";
      lockedReason = "This day is currently inactive.";
    } else if (!isTierAllowed || isVisibleToPro) {
      state = "locked";
      lockedReason =
        tier === "committed_249"
          ? "Start your Committed access to begin the 30-day program."
          : "This day is not available on your current tier.";
    } else if (!challengeStarted) {
      state = "locked";
      lockedReason = "Start the challenge to unlock Day 1.";
    } else if (submissionMeta.isComplete) {
      state = "completed";
    } else if (isToday || submissionMeta.needsRevision) {
      state = "active";
    } else if (isUnlockedByDate) {
      state = "available";
    } else {
      state = "locked";
      lockedReason = `Unlocks ${getChallengeDayUnlockLabel(challengeStartDate, task.day)}.`;
    }

    return {
      ...task,
      index,
      submission,
      submissionMeta,
      isPublished,
      isTierAllowed,
      isProProgramBlocked: isVisibleToPro,
      isUnlockedByDate,
      isToday,
      isCurrentDay: state === "active",
      isCompleted: state === "completed",
      state,
      lockedReason,
    };
  });

  const visibleItems = items.filter((item) => item.isPublished);
  const completedItems = visibleItems.filter((item) => item.isCompleted);
  const activeItem = visibleItems.find((item) => item.state === "active") || null;
  const todayItem =
    visibleItems.find((item) => item.day === Math.min(unlockedDay, visibleItems.length || unlockedDay)) ||
    activeItem ||
    null;
  const nextItem =
    visibleItems.find((item) => item.day > (todayItem?.day || 0) && item.isTierAllowed) || null;
  const firstLockedItem = visibleItems.find((item) => item.state === "locked") || null;
  const accessibleItems = visibleItems.filter((item) => item.isTierAllowed && !item.isProProgramBlocked);
  const accessibleCompletedCount = accessibleItems.filter((item) => item.isCompleted).length;
  const percentComplete =
    accessibleItems.length === 0 ? 0 : Math.round((accessibleCompletedCount / accessibleItems.length) * 100);

  let state = "locked";

  if (tier === "free") {
    state = "locked";
  } else if (!challengeStarted) {
    state = "available_not_started";
  } else if (accessibleItems.length > 0 && accessibleCompletedCount >= accessibleItems.length) {
    state = "all_complete";
  } else if (completedItems.length > 0) {
    state = "in_progress";
  } else {
    state = "not_started";
  }

  return {
    tier,
    tierLabel: EXPERIENCE_TIER_LABELS[tier] || "Program",
    starterDayLimit,
    unlockedDay,
    state,
    items: visibleItems,
    totalCount: visibleItems.length,
    accessibleTaskCount: accessibleItems.length,
    completedCount: completedItems.length,
    accessibleCompletedCount,
    percentComplete,
    activeItem,
    todayItem,
    currentItem: todayItem || activeItem || completedItems[completedItems.length - 1] || null,
    nextItem,
    firstLockedItem,
    latestSubmission: submissions[0] || null,
    programRecord: options.programRecord || null,
    challengeStarted,
    challengeStartDate,
    nextUnlockAt: getNextUnlockAt(challengeStartDate, unlockedDay),
  };
}

export function summarizeCoachingRequests(requests = []) {
  const ordered = [...requests].sort((a, b) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const nextApproved = ordered.find((item) => normalizeLower(item.status) === "approved") || null;
  const pending = ordered.find((item) => normalizeLower(item.status) === "pending") || null;
  const completed = ordered.filter((item) => normalizeLower(item.status) === "completed");

  return {
    all: ordered,
    nextApproved,
    pending,
    completedCount: completed.length,
    hasPendingSession: Boolean(nextApproved || pending),
    latest: ordered[0] || null,
  };
}

export function getProgramBubbleContent(journey, options = {}) {
  const onboardingRequired = options.onboardingRequired === true;
  const coachingSummary = options.coachingSummary || null;

  if (!journey || journey.tier === "free") {
    return {
      kind: "upgrade",
      eyebrow: "Upgrade",
      title: "Unlock the full financial toolkit",
      body: "Track your money now, then unlock CLARA's guided system when you're ready.",
      ctaLabel: "View Plans",
      href: "/enroll",
    };
  }

  if (onboardingRequired) {
    return {
      kind: "onboarding",
      eyebrow: journey.tier === "committed_249" ? "Committed Journey" : "30-Day Reset",
      title:
        journey.tier === "committed_249"
            ? "Your Committed layer is ready"
            : "Your guided reset is ready",
      body: "Complete your setup and begin the next step in your program.",
      ctaLabel: "Begin Setup",
      action: "onboarding",
    };
  }

  if (journey.tier === "committed_249" && coachingSummary?.hasPendingSession) {
    const session = coachingSummary.nextApproved || coachingSummary.pending;
    return {
      kind: "committed_support_active",
      eyebrow: "Committed Support",
      title: "Your Committed support is active",
      body: session?.topic
        ? `${session.topic} is in motion. Continue today's guided step and keep your support layer active.`
        : "Your support layer is active. Continue today's guided step.",
      ctaLabel: "Open Program",
      href: "/tasks",
    };
  }

  if (journey.state === "available_not_started") {
    return {
      kind: "start_challenge",
      eyebrow: journey.tier === "committed_249" ? "Committed Journey" : "30-Day Program",
      title: "Your CLARA challenge is ready",
      body: "Start the challenge when you are ready. Day 1 opens immediately, then each next day unlocks at 6:00 AM.",
      ctaLabel: "Start Challenge",
      href: "/tasks",
    };
  }

  if (journey.todayItem) {
    return {
      kind: "task_reminder",
      eyebrow: journey.tier === "committed_249" ? "Committed Journey" : "Today's Task",
      title: `Continue Day ${journey.todayItem.day} of your reset`,
      body: journey.todayItem.title || "Your next guided task is ready.",
      ctaLabel: "Open Today's Task",
      href: "/tasks",
    };
  }

  if (journey.state === "all_complete") {
    return {
      kind: "all_complete",
      eyebrow: "Complete",
      title: "Your 30-day journey is complete",
      body: "Review what you built and decide what the next chapter should look like.",
      ctaLabel: "Review Program",
      href: "/tasks",
    };
  }

  return {
    kind: "program",
    eyebrow: "Program",
    title: "Your guided path is ready",
    body: "Open your program to see what is complete, what is next, and what unlocks later.",
    ctaLabel: "Open Program",
    href: "/tasks",
  };
}
