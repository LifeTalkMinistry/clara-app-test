const dashboardRuntimeProgramPrompts = new Set();

const normalizeRuntimeString = (value) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

export const getProgramPromptSessionKey = (userId, bubble) => {
  const safeUserId = normalizeRuntimeString(userId || "guest");
  const bubbleSignature = [
    normalizeRuntimeString(bubble?.kind),
    normalizeRuntimeString(bubble?.action),
    normalizeRuntimeString(bubble?.href),
    normalizeRuntimeString(bubble?.title),
    normalizeRuntimeString(bubble?.body),
    normalizeRuntimeString(bubble?.ctaLabel),
  ]
    .filter(Boolean)
    .join("||");

  return `clara_program_prompt_seen_session_${safeUserId}_${bubbleSignature || "default"}`;
};

export const readProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return false;
  return dashboardRuntimeProgramPrompts.has(getProgramPromptSessionKey(userId, bubble));
};

export const persistProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return;
  dashboardRuntimeProgramPrompts.add(getProgramPromptSessionKey(userId, bubble));
};

export const clearProgramPromptSeenThisSession = (userId, bubble) => {
  if (!userId || !bubble) return;
  dashboardRuntimeProgramPrompts.delete(getProgramPromptSessionKey(userId, bubble));
};
