import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("CLARA app has no Supabase cloud runtime dependency", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(
    Boolean(packageJson.dependencies?.["@supabase/supabase-js"]),
    false,
    "@supabase/supabase-js must not be installed"
  );

  assert.equal(
    fs.existsSync(path.join(root, "src/lib/cloud-supabase-client.js")),
    false,
    "cloud-supabase-client.js must stay removed"
  );

  assert.equal(
    fs.existsSync(path.join(root, "src/lib/supabaseQuotaGuard.js")),
    false,
    "Supabase quota guards must stay removed"
  );

  assert.equal(
    fs.existsSync(path.join(root, "supabase")),
    false,
    "legacy Supabase migrations/functions must stay out of the app repository"
  );
});

test("active source does not depend on Supabase cloud configuration", () => {
  const sourceRoots = ["src", "api"];
  const forbiddenPatterns = [
    /@supabase\/supabase-js/,
    /VITE_SUPABASE_URL/,
    /VITE_SUPABASE_ANON_KEY/,
    /cloud-supabase-client/,
  ];

  const files = [];
  const visit = (relativePath) => {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) return;
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolutePath)) {
        visit(path.join(relativePath, name));
      }
      return;
    }
    if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(relativePath)) files.push(relativePath);
  };

  for (const sourceRoot of sourceRoots) visit(sourceRoot);

  for (const relativePath of files) {
    const content = read(relativePath);
    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(content),
        false,
        `${relativePath} contains forbidden Supabase cloud runtime reference: ${pattern}`
      );
    }
  }
});
