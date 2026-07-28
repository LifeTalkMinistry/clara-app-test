import fs from "node:fs";

const files = {
  hub: "src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx",
  toggle: "src/components/fresh/main-dashboard/learning-hub/ui/LearningHubToggleButton.jsx",
  sound: "src/runtime/installLearningHubOpenSound.js",
  pkg: "package.json",
  test: "tests/learning-hub-first-click.test.mjs",
};

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch anchor: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch anchor is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function update(path, mutate) {
  const original = fs.readFileSync(path, "utf8");
  const next = mutate(original);
  if (next === original) {
    console.log(`No changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, next);
  console.log(`Updated ${path}`);
}

update(files.hub, (input) => {
  let source = input;

  source = replaceOnce(
    source,
    'import { CalendarDays, ScrollText } from "lucide-react";',
    'import { CalendarDays, LoaderCircle, ScrollText } from "lucide-react";',
    "Learning Hub loading icon import",
  );

  source = replaceOnce(
    source,
    'const LearningHubLoaded = lazy(() => import("./LearningHubLoaded"));',
    `let learningHubModulePromise = null;

function loadLearningHubModule() {
  if (!learningHubModulePromise) {
    learningHubModulePromise = import("./LearningHubLoaded").catch((error) => {
      learningHubModulePromise = null;
      throw error;
    });
  }

  return learningHubModulePromise;
}

function preloadLearningHub() {
  return loadLearningHubModule().catch((error) => {
    console.warn("Learning Hub preload failed:", error?.message || error);
    return null;
  });
}

const LearningHubLoaded = lazy(loadLearningHubModule);`,
    "stable Learning Hub loader",
  );

  source = replaceOnce(
    source,
    'function emitLearningHubPhase(phase) {',
    `function LearningHubOpeningPlaceholder() {
  return (
    <div
      data-clara-learning-hub-opening="true"
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-10 w-fit items-center justify-center gap-2 rounded-full border border-cyan-100/15 bg-[rgba(6,18,38,0.68)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/72 shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-cyan-100/80" />
      <span>Opening Learning Hub</span>
    </div>
  );
}

function emitLearningHubPhase(phase) {`,
    "visible first-open fallback",
  );

  source = replaceOnce(
    source,
    `  }, []);

  const handleOpenCoachingCalendar = () => {`,
    `  }, []);

  useEffect(() => {
    if (
      isGuideMode ||
      isLocked ||
      shouldLoadHub ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    let cancelled = false;
    const warmLearningHub = () => {
      if (!cancelled) void preloadLearningHub();
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmLearningHub, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(warmLearningHub, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isGuideMode, isLocked, shouldLoadHub]);

  const handleOpenCoachingCalendar = () => {`,
    "idle Learning Hub preload",
  );

  source = replaceOnce(
    source,
    `    if (isLocked) {
      openCommittedVersionModal();
      return;
    }

    setShouldLoadHub(true);
  };`,
    `    if (isLocked) {
      openCommittedVersionModal();
      return;
    }

    void preloadLearningHub();
    setShouldLoadHub(true);
  };`,
    "first click preload kick",
  );

  source = replaceOnce(
    source,
    '<Suspense fallback={null}>\n            <LearningHubLoaded',
    '<Suspense fallback={<LearningHubOpeningPlaceholder />}>\n            <LearningHubLoaded',
    "non-empty Learning Hub suspense fallback",
  );

  return source;
});

update(files.toggle, (input) =>
  replaceOnce(
    input,
    `      type="button"
      data-clara-guide-learning-hub-toggle={guideTarget ? "true" : undefined}`,
    `      type="button"
      data-clara-learning-hub-toggle="true"
      data-clara-guide-learning-hub-toggle={guideTarget ? "true" : undefined}`,
    "stable Learning Hub toggle marker",
  ),
);

update(files.sound, (input) =>
  replaceOnce(
    input,
    `const LEARNING_HUB_TOGGLE_SELECTOR = [
  'button[aria-label="Open Learning Hub."]',
  'button[aria-label="Collapse Learning Hub."]',`,
    `const LEARNING_HUB_TOGGLE_SELECTOR = [
  'button[data-clara-learning-hub-toggle="true"]',`,
    "sound selector uses stable marker",
  ),
);

const testSource = `import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("Learning Hub first click has one React owner and visible loading feedback", async () => {
  const [hubSource, toggleSource, soundSource] = await Promise.all([
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubToggleButton.jsx"),
    read("../src/runtime/installLearningHubOpenSound.js"),
  ]);

  assert.match(hubSource, /const \\[shouldLoadHub, setShouldLoadHub\\] = useState\\(false\\)/);
  assert.match(hubSource, /void preloadLearningHub\\(\\);\\s*setShouldLoadHub\\(true\\)/);
  assert.match(hubSource, /requestIdleCallback\\(warmLearningHub/);
  assert.match(hubSource, /fallback={<LearningHubOpeningPlaceholder \\/>}/);
  assert.match(hubSource, /data-clara-learning-hub-opening="true"/);
  assert.doesNotMatch(hubSource, /MutationObserver/);
  assert.doesNotMatch(hubSource, /document\\.addEventListener\\(\\s*["']click/);

  assert.match(toggleSource, /data-clara-learning-hub-toggle="true"/);
  assert.match(soundSource, /button\\[data-clara-learning-hub-toggle="true"\\]/);
  assert.doesNotMatch(soundSource, /aria-label="Open Learning Hub\\."/);
  assert.doesNotMatch(soundSource, /aria-label="Collapse Learning Hub\\."/);
});
`;

fs.writeFileSync(files.test, testSource);
console.log(`Updated ${files.test}`);

update(files.pkg, (input) =>
  replaceOnce(
    input,
    'tests/dashboard-top-nav-ownership.test.mjs tests/cloud-vault-sync.test.mjs",',
    'tests/dashboard-top-nav-ownership.test.mjs tests/cloud-vault-sync.test.mjs tests/learning-hub-first-click.test.mjs",',
    "include Learning Hub first-click regression",
  ),
);
