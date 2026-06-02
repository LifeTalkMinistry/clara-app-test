import { CLARA_BRAINS } from "./brain-router";
import { buildScheduleBrainPrompt, generateLocalScheduleReply, sanitizeScheduleBrainReply } from "./schedule-brain";

export function isScheduleBrainRoute(brain) {
  return brain === CLARA_BRAINS.SCHEDULE;
}

export async function generateScheduleBrainReply({
  apiKey,
  message,
  context,
  conversationHistory,
  signal,
  discoverGeminiModelCandidates,
  requestGeminiText,
  shouldDebugClaraAi,
} = {}) {
  const localReply = generateLocalScheduleReply({ userMessage: message, context });
  if (!apiKey || !discoverGeminiModelCandidates || !requestGeminiText) return sanitizeScheduleBrainReply(localReply, localReply);

  const prompt = buildScheduleBrainPrompt({ userMessage: message, context, recentConversation: conversationHistory });
  const modelCandidates = await discoverGeminiModelCandidates({ apiKey, signal });
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      if (shouldDebugClaraAi?.()) console.log("[CLARA Brain] Trying Schedule Brain", { model });
      const text = await requestGeminiText({ apiKey, model, prompt, signal });
      const scheduleReply = sanitizeScheduleBrainReply(text || localReply, localReply);
      if (scheduleReply) return scheduleReply;
    } catch (error) {
      if (shouldDebugClaraAi?.()) console.warn("[CLARA Brain] Schedule Brain failed", { model, message: error?.message, status: error?.status, payload: error?.payload });
      lastError = error;
    }
  }

  if (shouldDebugClaraAi?.() && lastError) console.warn("[CLARA Brain] Schedule Brain fallback used", lastError);
  return sanitizeScheduleBrainReply(localReply, localReply);
}
