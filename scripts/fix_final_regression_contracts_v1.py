from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path, old, new, label):
    source = read(path)
    if new in source:
        return
    if old not in source:
        raise SystemExit(f"{label}: expected source shape not found in {path}")
    write(path, source.replace(old, new, 1))


# Learning Hub is now controlled by its parent via hubOpen/onOpenHub while the
# loaded implementation remains genuinely lazy and is preloaded on idle/open.
replace_once(
    "tests/learning-hub-first-click.test.mjs",
    '''  assert.match(hubSource, /const \\[shouldLoadHub, setShouldLoadHub\\] = useState\\(false\\)/);\n  assert.match(hubSource, /void preloadLearningHub\\(\\);\\s*setShouldLoadHub\\(true\\)/);''',
    '''  assert.match(hubSource, /const LearningHubLoaded = lazy\\(loadLearningHubModule\\)/);\n  assert.match(hubSource, /void preloadLearningHub\\(\\);\\s*onOpenHub\\?\\.\\(\\)/);\n  assert.doesNotMatch(hubSource, /setShouldLoadHub/);''',
    "Learning Hub controlled lazy-open contract",
)

# Weekly Money Review preference authority now lives in the category mapping
# used by isNotificationEventAllowed rather than an event-name special case.
replace_once(
    "tests/settings-integrity-regression.test.mjs",
    '''test("Weekly Money Review visible setting is the authoritative runtime gate", () => {\n  assert.match(\n    notificationRegistrySource,\n    /eventType === "weekly_review_ready"[\\s\\S]*weeklyMoneyReview !== false/\n  );\n});''',
    '''test("Weekly Money Review visible setting is the authoritative runtime gate", () => {\n  assert.match(notificationRegistrySource, /weekly_review_ready: event\\(\\{ category: NOTIFICATION_CATEGORIES\\.WEEKLY_REVIEW/);\n  assert.match(notificationRegistrySource, /\\[NOTIFICATION_CATEGORIES\\.WEEKLY_REVIEW\\]: "weeklyMoneyReview"/);\n  assert.match(notificationRegistrySource, /return preferenceKey \\? preferences\\?\\.\\[preferenceKey\\] !== false : false/);\n});''',
    "Weekly Money Review category preference authority",
)

# The retired auth-retry patch was replaced by the current already-owned
# restore/activation bridge. Settings must not reinstall the retired patch.
replace_once(
    "tests/settings-integrity-regression.test.mjs",
    '''  assert.match(runtimePatchRegistrySource, /clara-google-play-verify-auth-retry/);''',
    '''  assert.match(runtimePatchRegistrySource, /google-play-already-owned-restore-bridge/);\n  assert.doesNotMatch(runtimePatchRegistrySource, /clara-google-play-verify-auth-retry/);''',
    "current Google Play restore bridge ownership",
)

# Supabase is now a retired no-op shim. The active Settings support
# compatibility wrapper is intentionally wired through clara-data-client.
replace_once(
    "tests/settings-integrity-regression.test.mjs",
    '''const supabaseClientSource = readSource("src/lib/supabaseClient.js");''',
    '''const supabaseClientSource = readSource("src/lib/supabaseClient.js");\nconst claraDataClientSource = readSource("src/lib/clara-data-client.js");''',
    "CLARA data client test source",
)
replace_once(
    "tests/settings-integrity-regression.test.mjs",
    '''  assert.match(supabaseClientSource, /withSettingsSupportCompatibility/);''',
    '''  assert.match(claraDataClientSource, /withSettingsSupportCompatibility\\(createLocalDataFacade\\(\\)\\)/);\n  assert.doesNotMatch(supabaseClientSource, /withSettingsSupportCompatibility/);''',
    "Settings support compatibility current wiring",
)

print("Final current-architecture regression contract repair applied.")
