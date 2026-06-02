import { CLARA_BRAINS } from "./brain-router";
import { buildCoachBrainPrompt as buildBaseCoachBrainPrompt, generateLocalCoachReply, sanitizeCoachBrainReply } from "./coach-brain";
import { buildClaraBrainSubContextPromptBlock } from "./sub-context-selector";

export { generateLocalCoachReply, sanitizeCoachBrainReply };

export function buildCoachBrainPrompt({ userMessage = "", context = {}, recentConversation = [] } = {}) {
  const basePrompt = buildBaseCoachBrainPrompt({ userMessage, context, recentConversation });
  const subContextBlock = buildClaraBrainSubContextPromptBlock({
    brain: CLARA_BRAINS.COACH,
    message: userMessage,
    context,
  });

  const insertionPoint = "\n\nLATEST USER MESSAGE:";
  if (basePrompt.includes(insertionPoint)) {
    return basePrompt.replace(insertionPoint, `\n\n${subContextBlock}${insertionPoint}`);
  }

  return `${basePrompt}\n\n${subContextBlock}`;
}
