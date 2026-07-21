import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "..");

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("vault summary listens for IndexedDB completion before read requests can finish", () => {
  const source = readRepositoryFile("src/lib/local-vault-migration.js");
  const start = source.indexOf("async function summarizeVaults");
  const end = source.indexOf("async function resolveLegacyCandidate", start);
  const summarizeVaults = source.slice(start, end);

  const transactionIndex = summarizeVaults.indexOf(
    'const transaction = db.transaction(stores, "readonly");'
  );
  const completionListenerIndex = summarizeVaults.indexOf(
    "const transactionDone = transactionResult(transaction);"
  );
  const requestIndex = summarizeVaults.indexOf("const requests = stores.map");
  const awaitRequestsIndex = summarizeVaults.indexOf(
    "const recordGroups = await Promise.all(requests);"
  );
  const awaitTransactionIndex = summarizeVaults.indexOf("await transactionDone;");

  assert.ok(transactionIndex >= 0, "the readonly transaction must exist");
  assert.ok(
    completionListenerIndex > transactionIndex,
    "the transaction completion promise must be created after the transaction"
  );
  assert.ok(
    completionListenerIndex < requestIndex,
    "the completion listener must be attached before IndexedDB reads can finish"
  );
  assert.ok(
    requestIndex < awaitRequestsIndex,
    "read requests must be awaited after they are created"
  );
  assert.ok(
    awaitRequestsIndex < awaitTransactionIndex,
    "the completed read values must be collected before awaiting transaction completion"
  );
});

test("authentication startup still releases the global loader in a finally block", () => {
  const source = readRepositoryFile("src/context/AuthContext.jsx");
  const startupStart = source.indexOf("(async () => {", source.indexOf("useEffect(() =>"));
  const startupEnd = source.indexOf("return () =>", startupStart);
  const startup = source.slice(startupStart, startupEnd);

  assert.match(startup, /\.finally\(\(\) => \{/);
  assert.match(startup, /setLoading\(false\)/);
  assert.match(startup, /setAuthReady\(true\)/);
});
