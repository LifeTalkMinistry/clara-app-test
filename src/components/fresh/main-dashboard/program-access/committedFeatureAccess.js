import useUserRole from "@/hooks/useUserRole";

export const CLARA_COMMITTED_PLAN_KEY = "life_os_499";
export const OPEN_COMMITMENT_BOOKLET_EVENT = "clara:open-commitment-booklet";

function normalizePlan(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function canAccessCommittedFeatures({
  isCommitted = false,
  isAdmin = false,
  isAdvertiser = false,
  plan = "",
  previewPlan = "",
} = {}) {
  const effectivePlan = normalizePlan(previewPlan || plan);

  return Boolean(
    isCommitted ||
      isAdmin ||
      isAdvertiser ||
      effectivePlan === CLARA_COMMITTED_PLAN_KEY
  );
}

export function useCommittedFeatureAccess({ previewPlan = "" } = {}) {
  const {
    isCommitted,
    isAdmin,
    isAdvertiser,
    plan,
    user,
  } = useUserRole();

  const resolvedPlan =
    user?.plan || user?.subscription?.plan || plan || "free";

  return canAccessCommittedFeatures({
    isCommitted,
    isAdmin,
    isAdvertiser,
    plan: resolvedPlan,
    previewPlan,
  });
}

export function openCommittedVersionModal() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(OPEN_COMMITMENT_BOOKLET_EVENT));
}
