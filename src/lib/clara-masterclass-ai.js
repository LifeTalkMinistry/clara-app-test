const MASTERCLASS_AI_ENDPOINT = "/api/clara-masterclass-gemini";
const MASTERCLASS_AI_TIMEOUT_MS = 30000;
const SUPPORTED_MASTERCLASS_IDS = new Set(["budget", "emergency-fund"]);
const SUPPORTED_MODES = new Set(["explain_another_way", "follow_up_question"]);

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return String(window.localStorage.getItem("clara_auth_token") || "").trim();
}

function cleanMasterclassId(value) {
  return String(value || "").trim().toLowerCase();
}

export async function requestClaraMasterclassAi({ masterclassId, mode, prompt, signal } = {}) {
  const safeMasterclassId = cleanMasterclassId(masterclassId);
  const safeMode = String(mode || "").trim().toLowerCase();
  const safePrompt = String(prompt || "").trim();

  if (!SUPPORTED_MASTERCLASS_IDS.has(safeMasterclassId)) throw new Error("This CLARA Masterclass is not supported.");
  if (!SUPPORTED_MODES.has(safeMode)) throw new Error("This Masterclass follow-up mode is not supported.");
  if (!safePrompt) throw new Error("CLARA needs a Masterclass prompt before requesting a follow-up.");

  const token = getAuthToken();
  if (!token) throw new Error("Please sign in again before asking CLARA a Masterclass follow-up.");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), MASTERCLASS_AI_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener?.("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(MASTERCLASS_AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ masterclassId: safeMasterclassId, mode: safeMode, prompt: safePrompt }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || payload?.error || "CLARA could not answer this Masterclass follow-up right now.");

    const text = String(payload?.text || "").trim();
    if (!text) throw new Error("CLARA returned an empty Masterclass follow-up.");
    return { text, masterclassId: safeMasterclassId, mode: safeMode, remaining: payload?.remaining };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("CLARA took too long to answer. Please try again.");
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener?.("abort", abortFromCaller);
  }
}
