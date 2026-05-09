import { useMemo } from "react";
import { buildProgramJourney } from "@/lib/program-journey";
import { isProgramApproved } from "@/components/fresh/main-dashboard/program-access/programAccessRules";
import { normalizeLower } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardProgramJourneyState({
  tasks = [],
  submissions = [],
  plan,
  profileData,
  user,
  latestEnrollment,
  programRecord,
  isPaid = false,
  isProgramOnboardingCompleted,
} = {}) {
  const programJourney = useMemo(
    () =>
      buildProgramJourney(tasks, submissions, {
        plan,
        profile: profileData || user,
        enrollment: latestEnrollment,
        programRecord,
      }),
    [latestEnrollment, plan, profileData, programRecord, submissions, tasks, user]
  );

  const activeTask = programJourney.todayItem || programJourney.activeItem;
  const nextTask = programJourney.nextItem;

  const onboardingDone = useMemo(() => {
    if (typeof isProgramOnboardingCompleted === "function") {
      return isProgramOnboardingCompleted();
    }
    return false;
  }, [isProgramOnboardingCompleted]);

  const hasPaidProgramAccess = useMemo(() => {
    const approved = isProgramApproved(profileData, isPaid, latestEnrollment);
    const nonFreeTier =
      normalizeLower(programJourney?.tier) !== "free" &&
      normalizeLower(profileData?.plan || plan) !== "free";

    return approved && nonFreeTier;
  }, [profileData, latestEnrollment, isPaid, programJourney?.tier, plan]);

  return {
    programJourney,
    activeTask,
    nextTask,
    onboardingDone,
    hasPaidProgramAccess,
  };
}
