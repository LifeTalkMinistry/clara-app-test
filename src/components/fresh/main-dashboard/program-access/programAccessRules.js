const normalizeRuntimeLower = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase()
    : value == null
      ? ""
      : String(value).trim().toLowerCase();

export const isProgramApproved = (
  profile,
  isPaid,
  enrollmentRecord = null,
  approvedStatuses = new Set()
) => {
  const status = normalizeRuntimeLower(profile?.status);
  const enrollmentStatus = normalizeRuntimeLower(
    enrollmentRecord?.status || profile?.enrollment_status
  );
  const plan = normalizeRuntimeLower(profile?.plan);
  const role = normalizeRuntimeLower(profile?.role);

  return (
    isPaid === true ||
    profile?.is_enrolled === true ||
    profile?.program_active === true ||
    role === "paid_user" ||
    (plan && plan !== "free") ||
    approvedStatuses.has(status) ||
    approvedStatuses.has(enrollmentStatus)
  );
};

export const shouldForceToEnroll = (
  profile,
  enrollmentRecord,
  isPaid,
  approvedStatuses = new Set(),
  pendingStatuses = new Set(),
  blockedToEnrollStatuses = new Set()
) => {
  const role = normalizeRuntimeLower(profile?.role);
  const plan = normalizeRuntimeLower(profile?.plan);
  const profileStatus = normalizeRuntimeLower(profile?.status);
  const enrollmentStatus = normalizeRuntimeLower(
    enrollmentRecord?.status || profile?.enrollment_status
  );

  const hasApproved =
    isProgramApproved(profile, isPaid, enrollmentRecord, approvedStatuses) ||
    approvedStatuses.has(profileStatus) ||
    approvedStatuses.has(enrollmentStatus);

  const pending =
    pendingStatuses.has(profileStatus) ||
    pendingStatuses.has(enrollmentStatus);

  if (hasApproved || pending) return false;

  const freeRole = !role || role === "free_user" || role === "user";
  const freePlan = !plan || plan === "free";

  if (!enrollmentRecord) return false;

  if (freeRole && freePlan && blockedToEnrollStatuses.has(enrollmentStatus)) {
    return true;
  }

  if (freeRole && freePlan && blockedToEnrollStatuses.has(profileStatus)) {
    return true;
  }

  return false;
};
