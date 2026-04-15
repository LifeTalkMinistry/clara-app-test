const DEFAULT_STARTER_DAY_LIMIT = 5;

const COMPLETE_STATUSES = new Set(["pending", "submitted", "reviewed", "approved", "completed"]);
const REVISION_STATUSES = new Set(["rejected", "needs_revision"]);

const PLAN_TO_EXPERIENCE_TIER = {
  free: "free",
  basic: "entry",
  diy: "entry",
  entry: "entry",
  transformation: "core",
  diwm: "core",
  core: "core",
  student: "core",
  elite: "coaching",
  ldit: "coaching",
  coaching: "coaching",
};

export const EXPERIENCE_TIER_LABELS = {
  free: "Free",
  entry: "Entry",
  core: "Core",
  coaching: "Coaching",
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

function sortTasks(tasks = []) {
  return [...tasks].sort((a, b) => {
    const weekDiff = Number(a.week || a.week_number || 0) - Number(b.week || b.week_number || 0);
    if (weekDiff !== 0) return weekDiff;

    const dayDiff = Number(a.day || a.day_number || 0) - Number(b.day || b.day_number || 0);
    if (dayDiff !== 0) return dayDiff;

    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
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
      profileLike?.entry_program_days,
      profileLike?.program_preview_days,
      enrollment?.starter_program_days,
      enrollment?.starter_day_limit,
      enrollment?.entry_program_days
    ) || DEFAULT_STARTER_DAY_LIMIT
  );
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

export function buildProgramJourney(tasks = [], submissions = [], options = {}) {
  const sortedTasks = sortTasks(tasks);
  const submissionMap = buildSubmissionMap(submissions);
  const tier = resolveExperienceTier(options.profile, options.enrollment, options.plan);
  const starterDayLimit = getStarterDayLimit(options.profile, options.enrollment);
  const accessibleTaskCount =
    tier === "entry"
      ? Math.min(starterDayLimit, sortedTasks.length)
      : tier === "free"
        ? 0
        : sortedTasks.length;

  let activeIndex = -1;

  sortedTasks.forEach((task, index) => {
    if (index >= accessibleTaskCount || activeIndex !== -1) return;

    const submission = submissionMap.get(task.id);
    const meta = getSubmissionMeta(submission);
    const isPublished = task.is_active !== false && task.status !== "inactive";

    if (!isPublished) return;
    if (!meta.isComplete) {
      activeIndex = index;
    }
  });

  const items = sortedTasks.map((task, index) => {
    const submission = submissionMap.get(task.id) || null;
    const submissionMeta = getSubmissionMeta(submission);
    const isPublished = task.is_active !== false && task.status !== "inactive";
    const isBeyondTierLimit = index >= accessibleTaskCount;
    const isFuture = activeIndex !== -1 && index > activeIndex;
    const isActive = activeIndex === index && !isBeyondTierLimit && isPublished;

    let state = "locked";
    let lockedReason = "";

    if (!isPublished) {
      state = "locked";
      lockedReason = "This day is not published yet.";
    } else if (submissionMeta.isComplete) {
      state = "completed";
    } else if (isActive) {
      state = "active";
    } else if (isBeyondTierLimit) {
      state = "locked";
      lockedReason =
        tier === "entry"
          ? "Continue your reset by upgrading to Core."
          : "This day is not available on your current access level.";
    } else if (isFuture) {
      state = "locked";
      lockedReason = "Complete the current day to unlock this step.";
    } else if (submissionMeta.needsRevision) {
      state = "active";
    }

    return {
      ...task,
      index,
      submission,
      submissionMeta,
      isPublished,
      isBeyondTierLimit,
      isFuture,
      isActive: state === "active",
      isCompleted: state === "completed",
      state,
      lockedReason,
    };
  });

  const completedItems = items.filter((item) => item.isCompleted);
  const activeItem = items.find((item) => item.isActive) || null;
  const firstLockedItem = items.find((item) => item.state === "locked") || null;
  const nextItem = activeItem
    ? items.find((item) => item.index > activeItem.index)
    : items.find((item) => !item.isCompleted) || null;

  const accessibleCompletedCount = items.filter(
    (item) => item.index < accessibleTaskCount && item.isCompleted
  ).length;

  const accessibleTotal = Math.max(accessibleTaskCount, 1);
  const percentComplete =
    accessibleTaskCount === 0
      ? 0
      : Math.round((accessibleCompletedCount / accessibleTotal) * 100);

  const latestSubmission = submissions[0] || null;

  let state = "locked";
  if (tier === "free") {
    state = "locked";
  } else if (activeItem && completedItems.length === 0) {
    state = "not_started";
  } else if (activeItem) {
    state = "in_progress";
  } else if (tier === "entry" && accessibleCompletedCount >= accessibleTaskCount) {
    state = "starter_complete";
  } else if (accessibleTaskCount > 0 && accessibleCompletedCount >= accessibleTaskCount) {
    state = "all_complete";
  }

  return {
    tier,
    tierLabel: EXPERIENCE_TIER_LABELS[tier] || "Program",
    starterDayLimit,
    state,
    items,
    totalCount: items.length,
    accessibleTaskCount,
    completedCount: completedItems.length,
    accessibleCompletedCount,
    percentComplete,
    activeItem,
    currentItem: activeItem || completedItems[completedItems.length - 1] || null,
    nextItem,
    firstLockedItem,
    latestSubmission,
  };
}

export function summarizeCoachingRequests(requests = []) {
  const ordered = [...requests].sort((a, b) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const nextApproved =
    ordered.find((item) => normalizeLower(item.status) === "approved") || null;
  const pending =
    ordered.find((item) => normalizeLower(item.status) === "pending") || null;
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
      eyebrow: "Upgrade",
      title: "Unlock the full financial toolkit",
      body: "Track your money now, then unlock CLARA's guided system when you're ready.",
      ctaLabel: "View Plans",
      href: "/enroll",
    };
  }

  if (onboardingRequired) {
    if (journey.tier === "entry") {
      return {
        eyebrow: "Starter Path",
        title: "Start your guided reset",
        body: "Your starter path is ready. Begin with the first guided days and build momentum.",
        ctaLabel: "Begin Setup",
        action: "onboarding",
      };
    }

    if (journey.tier === "coaching") {
      return {
        eyebrow: "Coaching Active",
        title: "Your coaching journey is ready",
        body: "Complete your arrival setup, then step into Day 1 with your support layer in place.",
        ctaLabel: "Begin Setup",
        action: "onboarding",
      };
    }

    return {
      eyebrow: "30-Day Reset",
      title: "Your next guided step is ready",
      body: "Complete your setup and enter the full CLARA reset with structure from Day 1.",
      ctaLabel: "Begin Setup",
      action: "onboarding",
    };
  }

  if (journey.tier === "entry" && journey.state === "starter_complete") {
    return {
      eyebrow: "Starter Complete",
      title: "You have the tools. Now let's guide you.",
      body: "You've finished your starter path. Upgrade to Core to continue the full 30-day reset.",
      ctaLabel: "Upgrade to Core",
      href: "/enroll",
    };
  }

  if (journey.tier === "coaching" && coachingSummary?.hasPendingSession) {
    const session = coachingSummary.nextApproved || coachingSummary.pending;
    const statusLabel = normalize(session?.status || "pending").replaceAll("_", " ");

    return {
      eyebrow: "Coaching Layer",
      title: "Your coaching journey is active",
      body: session?.topic
        ? `${session.topic} is ${statusLabel.toLowerCase()}. Continue your guided day and keep your support layer moving.`
        : "Your next coaching checkpoint is in motion. Continue your guided day and keep momentum.",
      ctaLabel: "Open Program",
      href: "/tasks",
    };
  }

  if (journey.activeItem) {
    return {
      eyebrow: journey.tier === "coaching" ? "Coaching Journey" : "Today's Guided Step",
      title:
        journey.tier === "core"
          ? `Continue Day ${journey.activeItem.day} of your 30-day reset`
          : journey.tier === "coaching"
            ? "Continue your guided day"
            : "Continue your starter path",
      body: journey.activeItem.title || "Your next guided task is ready.",
      ctaLabel: "Open Today's Task",
      href: "/tasks",
    };
  }

  if (journey.state === "all_complete") {
    return {
      eyebrow: "Complete",
      title: "Your guided reset is complete",
      body: "You've finished the current journey. Review your progress and keep the structure going.",
      ctaLabel: "Review Program",
      href: "/tasks",
    };
  }

  return {
    eyebrow: "Program",
    title: "Your guided path is ready",
    body: "Open your program to see what is complete, what is next, and where to continue.",
    ctaLabel: "Open Program",
    href: "/tasks",
  };
}
