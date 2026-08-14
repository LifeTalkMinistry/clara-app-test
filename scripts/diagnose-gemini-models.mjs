const apiKey = process.env.GEMINI_API_KEY;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeMessage(value = "") {
  return clean(value).slice(0, 500);
}

if (!apiKey) {
  console.log("[CLARA Gemini diagnostic] GEMINI_API_KEY is not available in the build environment.");
  process.exit(0);
}

try {
  const endpoint = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  endpoint.searchParams.set("pageSize", "1000");
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.warn("[CLARA Gemini diagnostic] models.list failed.", {
      status: response.status,
      upstreamCode: payload?.error?.code,
      upstreamStatus: clean(payload?.error?.status),
      upstreamMessage: safeMessage(payload?.error?.message),
    });
    process.exit(0);
  }

  const models = Array.isArray(payload?.models) ? payload.models : [];
  const usable = models
    .filter((model) => Array.isArray(model?.supportedGenerationMethods))
    .filter((model) => model.supportedGenerationMethods.includes("generateContent"))
    .filter((model) => clean(model?.name).startsWith("models/gemini"))
    .map((model) => ({
      name: clean(model?.name),
      methods: model.supportedGenerationMethods.filter((method) => method === "generateContent"),
    }));

  console.log("[CLARA Gemini diagnostic] generateContent models visible to production credential.", usable);
} catch (error) {
  console.warn("[CLARA Gemini diagnostic] models.list diagnostic could not run.", {
    name: clean(error?.name),
    message: safeMessage(error?.message),
  });
}
