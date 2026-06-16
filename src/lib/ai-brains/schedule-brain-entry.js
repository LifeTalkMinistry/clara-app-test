import { CLARA_BRAINS } from "./brain-router";
import { SCHEDULE_BRAIN_EMERGENCY_FALLBACK, buildScheduleBrainPrompt, sanitizeScheduleBrainReply } from "./schedule-brain";

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
  const prompt = buildScheduleBrainPrompt({ userMessage: message, context, recentConversation: conversationHistory });
  if (!apiKey || !discoverGeminiModelCandidates || !requestGeminiText) return SCHEDULE_BRAIN_EMERGENCY_FALLBACK;

  const modelCandidates = await discoverGeminiModelCandidates({ apiKey, signal });
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      if (shouldDebugClaraAi?.()) console.log("[CLARA Brain] Trying Schedule Brain", { model });
      const text = await requestGeminiText({ apiKey, model, prompt, signal });
      const scheduleReply = sanitizeScheduleBrainReply(text);
      if (scheduleReply) return scheduleReply;
      lastError = new Error(`Gemini returned an incomplete Schedule Brain reply using ${model}.`);
      lastError.model = model;
      lastError.partialReply = text;
    } catch (error) {
      if (shouldDebugClaraAi?.()) console.warn("[CLARA Brain] Schedule Brain failed", { model, message: error?.message, status: error?.status, payload: error?.payload });
      lastError = error;
    }
  }

  if (shouldDebugClaraAi?.() && lastError) console.warn("[CLARA Brain] Schedule Brain emergency fallback used", lastError);
  return SCHEDULE_BRAIN_EMERGENCY_FALLBACK;
}
