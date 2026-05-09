import { useCallback, useEffect } from "react";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import { getProgramBubbleContent } from "@/lib/program-journey";
import {
  clearProgramPromptSeenThisSession,
  persistProgramPromptSeenThisSession,
  readProgramPromptSeenThisSession,
} from "@/components/fresh/main-dashboard/program-prompts/programPromptSession";

export default function useDashboardProgramPromptFlow({
  dailyRemindersEnabled,
  dashboardShellReady,
  hasPaidProgramAccess,
  markOnboardingCompleted,
  navigate,
  onboardingDone,
  profileData,
  programJourney,
  refreshUser,
  saveOnboardingDraft,
  setOnboardingStep,
  setProgramPromptSeenThisSession,
  setShowOnboarding,
  setShowProgramStart,
  showOnboarding,
  user,
}) {
  const programBubble = getProgramBubbleContent(programJourney, {
    onboardingRequired: hasPaidProgramAccess && !onboardingDone,
  });

  const floatingProgramBubble =
    hasPaidProgramAccess && programBubble && programBubble.kind !== "task_reminder"
      ? programBubble
      : null;

  useEffect(() => {
    if (!floatingProgramBubble || !user?.id) {
      setProgramPromptSeenThisSession(false);
      return;
    }

    const seen = readProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
  }, [floatingProgramBubble, setProgramPromptSeenThisSession, user?.id]);

  useEffect(() => {
    if (!user?.id || !floatingProgramBubble) return;
    if (floatingProgramBubble?.action !== "onboarding") return;

    const completed = hasCompletedProgramOnboarding(profileData);

    if (!completed) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);

      if (dashboardShellReady && !showOnboarding && dailyRemindersEnabled && hasPaidProgramAccess) {
        setShowProgramStart(true);
      }
    }
  }, [
    dailyRemindersEnabled,
    dashboardShellReady,
    floatingProgramBubble,
    hasPaidProgramAccess,
    profileData,
    setProgramPromptSeenThisSession,
    setShowProgramStart,
    showOnboarding,
    user?.id,
  ]);

  useEffect(() => {
    if (!dashboardShellReady) {
      setShowProgramStart(false);
      return;
    }

    if (!dailyRemindersEnabled) {
      setShowProgramStart(false);
      return;
    }

    if (!floatingProgramBubble || !user?.id) {
      setShowProgramStart(false);
      return;
    }

    if (!hasPaidProgramAccess) {
      setShowProgramStart(false);
      return;
    }

    if (showOnboarding) {
      setShowProgramStart(false);
      return;
    }

    const completed = hasCompletedProgramOnboarding(profileData);

    if (floatingProgramBubble?.action === "onboarding" && !completed) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);
      setShowProgramStart(true);
      return;
    }

    const seen = readProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
    setShowProgramStart(!seen);
  }, [
    dailyRemindersEnabled,
    dashboardShellReady,
    floatingProgramBubble,
    hasPaidProgramAccess,
    profileData,
    setProgramPromptSeenThisSession,
    setShowProgramStart,
    showOnboarding,
    user?.id,
  ]);

  const markProgramPromptAsSeen = useCallback(() => {
    if (!user?.id || !floatingProgramBubble) return;
    persistProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    setProgramPromptSeenThisSession(true);
  }, [floatingProgramBubble, setProgramPromptSeenThisSession, user?.id]);

  const startProgramFlow = useCallback(() => {
    setShowProgramStart(false);

    if (floatingProgramBubble?.action === "onboarding") {
      if (user?.id && floatingProgramBubble) {
        clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      }
      setProgramPromptSeenThisSession(false);
      setShowOnboarding(true);
      setOnboardingStep(Number(profileData?.onboarding_step) || 0);
      return;
    }

    markProgramPromptAsSeen();
    navigate(floatingProgramBubble?.href || "/tasks");
  }, [
    floatingProgramBubble,
    markProgramPromptAsSeen,
    navigate,
    profileData?.onboarding_step,
    setOnboardingStep,
    setProgramPromptSeenThisSession,
    setShowOnboarding,
    setShowProgramStart,
    user?.id,
  ]);

  const closeProgramStart = useCallback(() => {
    markProgramPromptAsSeen();
    setShowProgramStart(false);
  }, [markProgramPromptAsSeen, setShowProgramStart]);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);

    const completed = hasCompletedProgramOnboarding(profileData);

    if (!completed && floatingProgramBubble?.action === "onboarding") {
      setShowProgramStart(true);
      setProgramPromptSeenThisSession(false);

      if (user?.id && floatingProgramBubble) {
        clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      }
    }
  }, [
    floatingProgramBubble,
    profileData,
    setProgramPromptSeenThisSession,
    setShowOnboarding,
    setShowProgramStart,
    user?.id,
  ]);

  const finishOnboarding = useCallback(async () => {
    await saveOnboardingDraft();
    await markOnboardingCompleted();
    setShowOnboarding(false);
    setShowProgramStart(false);

    if (user?.id && floatingProgramBubble) {
      clearProgramPromptSeenThisSession(user.id, floatingProgramBubble);
      persistProgramPromptSeenThisSession(user.id, floatingProgramBubble);
    }

    refreshUser?.();
    navigate("/tasks");
  }, [
    floatingProgramBubble,
    markOnboardingCompleted,
    navigate,
    refreshUser,
    saveOnboardingDraft,
    setShowOnboarding,
    setShowProgramStart,
    user?.id,
  ]);

  return {
    closeOnboarding,
    closeProgramStart,
    finishOnboarding,
    floatingProgramBubble,
    markProgramPromptAsSeen,
    programBubble,
    startProgramFlow,
  };
}
