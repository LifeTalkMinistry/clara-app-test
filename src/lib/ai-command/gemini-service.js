import { AI_INTENTS, normalizeGeminiCommand } from "@/lib/ai-command/command-parser";
import { compactFinanceSnapshot } from "@/lib/ai-command/finance-context";

const DEFAULT_MODEL = "gemini-1.5-flash";

function getGeminiConfig() {
  return {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_GEMINI_API_KEY || "",
    model: import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL,
  };
}

function extractJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function buildSystemPrompt() {
  return `You are CLARA, a premium voice-first financial and Life OS assistant for Philippine users.
Return strict JSON only. No markdown.
Allowed intents: ${Object.values(AI_INTENTS).join(", ")}.
Write intents are LOG_EXPENSE, ADD_MONEY, TRANSFER_MONEY, CREATE_BUDGET, CREATE_SAVINGS_GOAL.
Read/guidance intents answer directly using available financial context.
Never claim a database write succeeded. The app executor will perform writes after confirmation.
Use PHP peso amounts, Asia/Manila dates, concise calm tone.
JSON shape:
{
  "intent": "ONE_ALLOWED_INTENT",
  "confidence": 0.0,
  "parsedData": {
    "amount": number,
    "item": string,
    "label": string,
    "category": "food|transport|housing|utilities|entertainment|shopping|health|education|personal|other",
    "wallet": string,
    "fromWallet": string,
    "toWallet": string,
    "date": "YYYY-MM-DD",
    "period": "YYYY-MM",
    "targetAmount": number,
    "targetDate": "YYYY-MM-DD",
    "decisionSubject": string
  },
  "assistantMessage": "short natural response if no write confirmation is needed"
}`;
}

export async function askGeminiForUnderstanding({ text, session, financeSnapshot }) {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw Object.assign(new Error("Gemini API key is not configured."), {
      code: "GEMINI_NOT_CONFIGURED",
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const compact = compactFinanceSnapshot(financeSnapshot);
  const recentHistory = (session?.history || []).slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${buildSystemPrompt()}

Current finance context:
${JSON.stringify(compact)}

Current command:
${JSON.stringify(session?.currentCommand || null)}

Recent conversation:
${JSON.stringify(recentHistory)}

User input:
${text}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      topP: 0.9,
      maxOutputTokens: 900,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn("Gemini request failed:", { status: response.status, payload });
    throw Object.assign(new Error(payload?.error?.message || "Gemini request failed."), {
      code: "GEMINI_FAILED",
      status: response.status,
    });
  }

  const textPayload = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  const parsed = extractJson(textPayload);
  return normalizeGeminiCommand(parsed);
}

export function getGeminiStatus() {
  const { apiKey, model } = getGeminiConfig();
  return {
    configured: Boolean(apiKey),
    model,
  };
}
