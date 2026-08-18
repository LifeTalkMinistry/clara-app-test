import { getSavingsGoalsMasterclassQuestionSupportData } from "./clara-savings-goals-masterclass-questions";

export function getSavingsGoalsMasterclassQuestionSupports(
  language = "en",
  stepId = "",
  questionIndex = -1
) {
  const support = getSavingsGoalsMasterclassQuestionSupportData(
    language,
    stepId,
    questionIndex
  );
  return support ? { ...support } : null;
}
