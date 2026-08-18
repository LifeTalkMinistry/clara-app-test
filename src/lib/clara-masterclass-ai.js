import { getStoredBackendToken } from "./clara-backend-client.js";

const MASTERCLASS_ENDPOINT = "/api/clara-masterclass-gemini";
const MASTERCLASS_PRODUCTION_ENDPOINT = "https://clara-app-test.vercel.app/api/clara-masterclass-gemini";
const MASTERCLASS_TIMEOUT_MS = 30000;
const SUPPORTED_MASTERCLASS_IDS = new Set(["budget", "emergency-fund"]);
const SUPPORTED_MODES = new Set(["explain_another_way", "follow_up_question"]);

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function resolveEndpoint() {
  const envUrl = import.meta.env.VITE_CLARA_MASTERCLASS_AI_URL;
  if (envUrl) return envUrl;
  if (typeof window === "undefined") return MASTERCLASS_ENDPOINT;

  const protocol = window.location?.protocol || "";
  const hostname = window.location?.hostname || "";
  const isNativeLike =
    protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:" ||
    hostname === "localhost" || hostname === "127.0.0.1" || Boolean(window.Capacitor?.isNativePlatform?.());
  const isGitHubPages = hostname === "github.io" || hostname.endsWith(".github.io");
  return isNativeLike || isGitHubPages ? MASTERCLASS_PRODUCTION_ENDPOINT : MASTERCLASS_ENDPOINT;
}

function makeError(payload = {}, status = 0) {
  const error = new Error(payload?.error || payload?.message || "CLARA could not generate that clarification right now.");
  error.code = payload?.code || "CLARA_MASTERCLASS_AI_FAILED";
  error.status = status;
  error.usage = payload?.usage || null;
  return error;
}

export async function requestClaraMasterclassAi({ masterclassId, mode, prompt, signal } = {}) {
  const cleanMasterclassId = cleanText(masterclassId).toLowerCase();
  const cleanPrompt = String(prompt || "").trim();
  const cleanMode = cleanText(mode).toLowerCase();

  if (!SUPPORTED_MASTERCLASS_IDS.has(cleanMasterclassId)) throw makeError({ error: "That CLARA Masterclass is not supported." }, 400);
  if (!cleanPrompt) throw makeError({ error: "The CLARA masterclass prompt is empty." }, 400);
  if (!SUPPORTED_MODES.has(cleanMode)) throw makeError({ error: "That CLARA masterclass clarification mode is not supported." }, 400);

  const token = getStoredBackendToken();
  if (!token) {
    throw makeError({ code: "CLARA_MASTERCLASS_AUTH_REQUIRED", error: "Your CLARA session is required before I can generate a custom clarification." }, 401);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), MASTERCLASS_TIMEOUT_MS);
  const abortFromParent = () => controller.abort();
  signal?.addEventListener?.("abort", abortFromParent, { once: true });

  try {
    const response = await fetch(resolveEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({ masterclassId: cleanMasterclassId, mode: cleanMode, prompt: cleanPrompt }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw makeError(payload, response.status);

    const text = cleanText(payload?.text || "");
    if (!text) throw makeError({ error: "CLARA returned an empty clarification." }, 502);
    return { text, usage: payload?.usage || null, model: payload?.model || "", masterclassId: cleanMasterclassId };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw makeError({ code: "CLARA_MASTERCLASS_AI_TIMEOUT", error: "That clarification took too long. You can try again or continue the masterclass." }, 504);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener?.("abort", abortFromParent);
  }
}
