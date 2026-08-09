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

const PRODUCTION_API_ORIGIN = "https://api.clarapmc.com";

test("production builds point directly to the self-hosted CLARA API hostname", () => {
  assert.match(
    productionEnvironment,
    /^VITE_CLARA_API_URL=https:\/\/api\.clarapmc\.com\s*$/m
  );
});

test("Vercel no longer proxies CLARA backend traffic through a tunnel provider", () => {
  assert.equal(vercelConfig.rewrites, undefined);
  assert.equal(vercelConfig.headers, undefined);
});

test("coaching requests use the same direct backend base as the rest of CLARA", () => {
  assert.match(coachingClientSource, /return getClaraBackendUrl\(\);/);
  assert.doesNotMatch(coachingClientSource, /VERCEL_COACHING_PROXY_PATH/);
  assert.doesNotMatch(coachingClientSource, /ngrok-skip-browser-warning/);
  assert.match(coachingClientSource, /Authorization: `Bearer \$\{authorizedToken\}`/);
});

test("the production API hostname remains the owned CLARA hostname", () => {
  assert.equal(PRODUCTION_API_ORIGIN, "https://api.clarapmc.com");
});

test("Settings backend clients coalesce rapid repeated reads", () => {
  assert.match(billingClientSource, /BILLING_CACHE_TTL_MS/);
  assert.match(billingClientSource, /inFlightRequest/);
  assert.match(legalInformationClientSource, /LEGAL_INFORMATION_CACHE_TTL_MS/);
  assert.match(legalInformationClientSource, /inFlightRequest/);
});
