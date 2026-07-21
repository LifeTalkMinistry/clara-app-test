import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeVaults } from "../src/lib/local-vault-migration.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "..");

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("vault summary cannot miss a transaction that completes with the final read", async () => {
  let pendingReads = 0;
  let completionListenerWasPresent = false;

  const transaction = {
    oncomplete: null,
    onerror: null,
    onabort: null,
    objectStore() {
      return {
        getAll() {
          const request = {
            result: [],
            onsuccess: null,
            onerror: null,
          };
          pendingReads += 1;

          queueMicrotask(() => {
            request.onsuccess?.();
            pendingReads -= 1;

            if (pendingReads === 0) {
              completionListenerWasPresent = typeof transaction.oncomplete === "function";
              transaction.oncomplete?.();
            }
          });

          return request;
        },
      };
    },
  };

  const database = {
    objectStoreNames: {
      contains() {
        return true;
      },
    },
    transaction() {
      return transaction;
    },
  };

  const result = await Promise.race([
    summarizeVaults(database),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("vault summary remained pending after transaction completion")),
        250
      )
    ),
  ]);

  assert.equal(completionListenerWasPresent, true);
  assert.equal(result.counts.size, 0);
  assert.equal(result.updatedAt.size, 0);
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
