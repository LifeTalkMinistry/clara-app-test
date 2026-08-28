import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loginSource = readFileSync(
  new URL("../src/pages/Login.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);

test("login preserves the preferred CLARA glassmorphism layout", () => {
  assert.match(loginSource, /Access your CLARA account/);
  assert.match(loginSource, /<ClaraLogo variant="icon" theme="dark" \/>/);
  assert.match(loginSource, /rounded-\[30px\]/);
  assert.match(loginSource, /backdrop-blur-2xl/);
  assert.match(loginSource, /rgba\(12,18,38,0\.72\)/);
  assert.match(loginSource, /Email address/);
  assert.match(loginSource, /Enter your password/);
  assert.match(loginSource, /Forgot password\?/);
  assert.match(loginSource, /from-cyan-400 via-blue-400 to-violet-400/);
  assert.match(loginSource, /New to CLARA\?/);
  assert.match(loginSource, /Create account/);
});

test("preferred login UI remains connected to the custom backend AuthContext", () => {
  assert.match(loginSource, /useAuth/);
  assert.match(loginSource, /await signIn\(\{ email: email\.trim\(\), password \}\)/);
  assert.match(loginSource, /await signUp\(/);
  assert.doesNotMatch(loginSource, /supabase/i);
  assert.doesNotMatch(loginSource, /LOGIN_MAINTENANCE_MODE/);
  assert.doesNotMatch(loginSource, /Welcome back/);
  assert.doesNotMatch(loginSource, /CLARA Account/);
});

test("login remains mounted while an authentication request is processing", () => {
  assert.match(appSource, /const isPublicAuthRoute =/);
  assert.match(appSource, /location\.pathname === "\/login"/);
  assert.match(appSource, /location\.pathname === "\/reset-password"/);
  assert.match(appSource, /loading && !isPublicAuthRoute/);
  assert.doesNotMatch(appSource, /if \(!authReady \|\| loading \|\| roleLoading\)/);
});
