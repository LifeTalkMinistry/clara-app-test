import { useState } from "react";

export default function useDashboardOnboardingState(initialCache = {}) {
  const [showProgramStart, setShowProgramStart] = useState(false);
  const [programPromptSeenThisSession, setProgramPromptSeenThisSession] =
    useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [commitmentChecked, setCommitmentChecked] = useState(false);
  const [nickname, setNickname] = useState(initialCache.nickname);
  const [reminderTime, setReminderTime] = useState(initialCache.reminderTime);
  const [financialGoal, setFinancialGoal] = useState(initialCache.financialGoal);

  return {
    showProgramStart,
    setShowProgramStart,
    programPromptSeenThisSession,
    setProgramPromptSeenThisSession,
    showOnboarding,
    setShowOnboarding,
    onboardingStep,
    setOnboardingStep,
    savingOnboarding,
    setSavingOnboarding,
    commitmentChecked,
    setCommitmentChecked,
    nickname,
    setNickname,
    reminderTime,
    setReminderTime,
    financialGoal,
    setFinancialGoal,
  };
}
