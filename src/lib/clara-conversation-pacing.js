export const CLARA_REPLY_MIN_DELAY_MS = 520;
export const CLARA_REPLY_MAX_DELAY_MS = 700;
export const CLARA_TYPING_MIN_DURATION_MS = 1800;
export const CLARA_TYPING_MAX_DURATION_MS = 5200;
export const CLARA_TYPING_TICK_MS = 28;

// Normal CLARA feature chats unlock their next controls as soon as CLARA
// finishes typing. The longer reading delay remains a Masterclass-only behavior.
export const CLARA_READ_MIN_DELAY_MS = 0;
export const CLARA_READ_MAX_DELAY_MS = 0;

export function getClaraReplyDelay() {
  return Math.round(
    CLARA_REPLY_MIN_DELAY_MS +
      Math.random() * (CLARA_REPLY_MAX_DELAY_MS - CLARA_REPLY_MIN_DELAY_MS)
  );
}

export function getClaraTypingPlan(text = "") {
  const source = String(text || "");
  const totalDuration = Math.min(
    CLARA_TYPING_MAX_DURATION_MS,
    Math.max(CLARA_TYPING_MIN_DURATION_MS, source.length * 7)
  );
  const totalTicks = Math.max(1, Math.ceil(totalDuration / CLARA_TYPING_TICK_MS));
  const charsPerTick = Math.max(1, Math.ceil(source.length / totalTicks));

  return {
    source,
    totalDuration,
    tickMs: CLARA_TYPING_TICK_MS,
    charsPerTick,
  };
}

export function getClaraReadDelay() {
  return 0;
}
