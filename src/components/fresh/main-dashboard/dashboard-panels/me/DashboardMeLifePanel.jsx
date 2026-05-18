REPLACE_IN_FILE::function fallbackReply({ field, value, action }) {
  if (action === "ask") {
    return `Of course — what should I remember instead for your ${field.label.toLowerCase()}? Tell me the corrected version and I’ll update it.`;
  }
  return `Got it — I’ll remember your ${field.label.toLowerCase()} as “${value}.” I’ll use this when giving you more personal money guidance.`;
}::function fallbackReply({ field, value, action, current }) {
  if (action === "ask") {
    return `I understand your current ${field.label.toLowerCase()} as “${current || "not set yet"}.” What should I update it to instead?`;
  }
  return `Got it — I’ll remember your ${field.label.toLowerCase()} as “${value}.” I’ll use this when giving you more personal money guidance.`;
}

REPLACE_IN_FILE::const fallback = fallbackReply({ field, value, action });::const fallback = fallbackReply({ field, value, action, current });

REPLACE_IN_FILE::System action: ${action === "ask" ? "Ask for the corrected value. Do not save yet." : `Saved the new value: ${value}`}
Tone: ${DRAWER_TONE[drawer.id]}

Reply naturally as CLARA in 1-3 short sentences. Be warm, personal, and financially aware. Do not sound like a form or settings page. Do not mention technical storage.::System action: ${action === "ask" ? "The user wants to change the current memory but did NOT provide the new value yet. You must ask a proper probing follow-up question specific to this memory field. Do NOT assume or save anything yet." : `Saved the new value: ${value}`}
Tone: ${DRAWER_TONE[drawer.id]}

Critical behavior rules:
- If the user says things like 'change that', 'update it', 'fix this', or similar vague correction requests, you MUST ask for the exact replacement value.
- Your probing question must directly reference the memory topic and current value.
- Example: 'I currently understand that you have no dependents. What should I update that to instead?'
- Do NOT respond vaguely.
- Do NOT repeat the user's vague statement.
- Sound emotionally intelligent and conversational.

Reply naturally as CLARA in 1-3 short sentences. Be warm, personal, and financially aware. Do not sound like a form or settings page. Do not mention technical storage.