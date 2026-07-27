import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
);
const productionEnvironment = readFileSync(
  new URL("../.env.production", import.meta.url),
  "utf8"
);
const backendClientSource = readFileSync(
  new URL("../src/lib/clara-backend-client.js", import.meta.url),
  "utf8"
);
const coachingClientSource = readFileSync(
  new URL("../src/lib/coaching-backend-client.js", import.meta.url),
  "utf8"
);
const billingClientSource = readFileSync(
  new URL("../src/lib/billing-backend-client.js", import.meta.url),
  "utf8"
);
const legalInformationClientSource = readFileSync(
  new URL("../src/lib/legal-information-backend-client.js", import.meta.url),
  "utf8"
);

function createStorage() {
  return {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  };
}

async function importBackendClientForHost(hostname) {
  globalThis.window = {
    location: { hostname },
    localStorage: createStorage(),
  };

  try {
    return await import(
      `../src/lib/clara-backend-client.js?host=${encodeURIComponent(hostname)}-${Date.now()}-${Math.random()}`
    );
  } finally {
    delete globalThis.window;
  }
}

test("Vercel rewrites the stable CLARA API gateway to an active Cloudflare tunnel", () => {
  assert.equal(vercelConfig.rewrites?.length, 1);
  assert.equal(vercelConfig.rewrites[0]?.source, "/clara-api/:path*");
  assert.match(
    String(vercelConfig.rewrites[0]?.destination || ""),
    /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/:path\*$/
  );
});

test("production builds pin native CLARA to the stable Vercel API gateway", () => {
  assert.match(
    productionEnvironment,
    /^VITE_CLARA_API_URL=https:\/\/clara-app-test\.vercel\.app\/clara-api\s*$/m
  );
});

test("Vercel web builds use the same-origin API proxy when no build override is present", async () => {
  const client = await importBackendClientForHost("clara-app-test.vercel.app");

  assert.equal(client.getClaraBackendUrl(), "/clara-api");
  assert.equal(client.VERCEL_API_PROXY_PATH, "/clara-api");
});

test("shared backend requests remain compatible with tunnel providers", () => {
  assert.match(
    backendClientSource,
    /"ngrok-skip-browser-warning": "true"/
  );
});

test("coaching requests are pinned to the working production proxy", () => {
  assert.match(
    coachingClientSource,
    /return isVercelWebRuntime\(\)[\s\S]*VERCEL_COACHING_PROXY_PATH/
  );
  assert.match(coachingClientSource, /Authorization: `Bearer \$\{authorizedToken\}`/);
  assert.doesNotMatch(coachingClientSource, /backendRequest\(/);
});

test("Settings backend clients coalesce rapid repeated reads", () => {
  assert.match(billingClientSource, /BILLING_CACHE_TTL_MS/);
  assert.match(billingClientSource, /inFlightRequest/);
  assert.match(legalInformationClientSource, /LEGAL_INFORMATION_CACHE_TTL_MS/);
  assert.match(legalInformationClientSource, /inFlightRequest/);
});

test("development fallback remains available when no production build override is loaded", async () => {
  const client = await importBackendClientForHost("localhost");

  assert.equal(client.getClaraBackendUrl(), client.DEFAULT_API_URL);
});
