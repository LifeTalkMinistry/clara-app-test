const PAID_PLANS = new Set(["beta", "committed"]);
const BLOCKED_ACCOUNT_STATUSES = new Set(["suspended", "disabled", "deleted"]);

function dateMs(value) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : null;
}

export function resolveEffectiveMembership(user, membership, now = new Date()) {
  const accountStatus = String(user?.account_status || "active").toLowerCase();
  const source = membership || {};
  const plan = String(source.plan || "free").toLowerCase();
  const subscriptionStatus = String(source.subscription_status || "active").toLowerCase();
  const currentPeriodEndMs = dateMs(source.current_period_end);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);

  if (BLOCKED_ACCOUNT_STATUSES.has(accountStatus)) {
    return {
      blocked: true,
      blockReason: accountStatus,
      effectivePlan: "free",
      effectiveSubscriptionStatus: "suspended",
      hasPaidAccess: false,
    };
  }

  if (!PAID_PLANS.has(plan)) {
    return {
      blocked: false,
      blockReason: null,
      effectivePlan: "free",
      effectiveSubscriptionStatus: "active",
      hasPaidAccess: false,
    };
  }

  const periodStillActive = currentPeriodEndMs !== null && currentPeriodEndMs > nowMs;
  const activePaid = subscriptionStatus === "active" && (!currentPeriodEndMs || periodStillActive);
  const paidThroughCancellation = subscriptionStatus === "cancelled" && periodStillActive;

  if (activePaid || paidThroughCancellation) {
    return {
      blocked: false,
      blockReason: null,
      effectivePlan: plan,
      effectiveSubscriptionStatus: subscriptionStatus,
      hasPaidAccess: true,
    };
  }

  return {
    blocked: false,
    blockReason: null,
    effectivePlan: "free",
    effectiveSubscriptionStatus:
      subscriptionStatus === "cancelled" || subscriptionStatus === "expired"
        ? subscriptionStatus
        : "expired",
    hasPaidAccess: false,
  };
}

export function serializeMembership(user, membership, offlineGraceHours = 24) {
  const effective = resolveEffectiveMembership(user, membership);
  const graceEnd = new Date(Date.now() + Number(offlineGraceHours) * 60 * 60 * 1000);
  const periodEnd = membership?.current_period_end
    ? new Date(membership.current_period_end)
    : null;
  const offlineValidUntil =
    effective.hasPaidAccess && periodEnd && periodEnd < graceEnd ? periodEnd : graceEnd;

  return {
    id: membership?.id || null,
    userId: user?.id || membership?.user_id || null,
    plan: membership?.plan || "free",
    subscriptionStatus: membership?.subscription_status || "active",
    source: membership?.source || "free",
    startedAt: membership?.started_at || null,
    currentPeriodEnd: membership?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(membership?.cancel_at_period_end),
    cancelledAt: membership?.cancelled_at || null,
    expiredAt: membership?.expired_at || null,
    refundedAt: membership?.refunded_at || null,
    suspendedAt: membership?.suspended_at || null,
    effectivePlan: effective.effectivePlan,
    effectiveSubscriptionStatus: effective.effectiveSubscriptionStatus,
    hasPaidAccess: effective.hasPaidAccess,
    blocked: effective.blocked,
    blockReason: effective.blockReason,
    offlineValidUntil: offlineValidUntil.toISOString(),
  };
}
