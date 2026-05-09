import { useEffect } from "react";
import { hasCompletedProgramOnboarding } from "@/lib/access-control";
import {
  clearProgramPromptSeenThisSession,
  readProgramPromptSeenThisSession,
} from "@/components/fresh/main-dashboard/program-prompts/programPromptSession";

export default function useDashboardProgramPromptController({
  floatingProgramBubble = null,
  userId = null,
  profileData = null,
  dashboardShellReady = false,
  showOnboarding = false,
  dailyRemindersEnabled = true,
  hasPaidProgramAccess = false,
  setProgramPromptSeenThisSession,
  setShowProgramStart,
} = {}) {
  useEffect(() => {
    if (!floatingProgramBubble || !userId) {
      setProgramPromptSeenThisSession(false);
      return;
    }

    const seen = readProgramPromptSeenThisSession(userId, floatingProgramBubble);
    setProgramPromptSeenThisSession(seen);
  }, [floatingProgramBubble, setProgramPromptSeenThisSession, userId]);

  useEffect(() => {
    if (!userId || !floatingProgramBubble) return;
    if (floatingProgramBubble?.action !== "onboarding") return;

    const completed = hasCompletedProgramOnboarding(profileData);

    if (!completed) {
      clearProgramPromptSeenThisSession(userId, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);

      if (
        dashboardShellReady &&
        !showOnboarding &&
        dailyRemindersEnabled &&
        hasPaidProgramAccess
      ) {
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
    userId,
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

    if (!floatingProgramBubble || !userId) {
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
      clearProgramPromptSeenThisSession(userId, floatingProgramBubble);
      setProgramPromptSeenThisSession(false);
      setShowProgramStart(true);
      return;
    }

    const seen = readProgramPromptSeenThisSession(userId, floatingProgramBubble);
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
    userId,
  ]);
}
