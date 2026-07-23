import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBackendMembershipProfile,
  isBackendCommittedActive,
  normalizeBackendPlan,
  normalizeBackendStatus,
} from "../src/lib/backend-membership-authority.js";
import {
  runBackendMembershipAuthorityMigration,
  BACKEND_MEMBERSHIP_MIGRATION_MARKER,
  LEGACY_MEMBERSHIP_KEYS,
} from "../src/lib/backend-membership-migration.js";
import {
  normalizeUser,
  isStoredBackendUserSnapshotFresh,
} from "../src/lib/clara-backend-client.js";
import {
  resolveMembership,
  COMMITTED_PLAN_KEY,
  FREE_PLAN_KEY,
} from "../src/lib/membership.js";

function createStorage(initial = {}) {
  const values = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("backend plan and status normalize conservatively", () => {
  assert.equal(normalizeBackendPlan("committed"), "committed");
  assert.equal(normalizeBackendPlan("premium"), "free");
  assert.equal(normalizeBackendStatus("active"), "active");
  assert.equal(normalizeBackendStatus("approved"), "inactive");
});

test("only active committed backend users unlock committed access", () => {
  const cases = [
    [{ plan: "free", status: "active", role: "user" }, false],
    [{ plan: "free", status: "active", role: "admin" }, false],
    [{ plan: "free", status: "active", role: "advertiser" }, false],
    [{ plan: "committed", status: "active", role: "user" }, true],
    [{ plan: "committed", status: "pending", role: "user" }, false],
    [{ plan: "committed", status: "inactive", role: "user" }, false],
    [{ plan: "premium", status: "active", role: "admin" }, false],
    [{ plan: null, status: null, role: "admin" }, false],
  ];

  cases.forEach(([serverUser, expected]) => {
    const profile = buildBackendMembershipProfile(serverUser);
    const membership = resolveMembership({ profile });
    assert.equal(isBackendCommittedActive(serverUser), expected);
    assert.equal(membership.hasCommittedAccess, expected);
    assert.equal(
      profile.plan,
      serverUser.plan === "committed" ? COMMITTED_PLAN_KEY : FREE_PLAN_KEY
    );
  });
});

test("backend profile overwrites local membership claims without deleting local data", () => {
  const profile = buildBackendMembershipProfile(
    { plan: "free", status: "active" },
    {
      budget_currency: "PHP",
      wallet_count: 3,
      plan: "committed_249",
      is_activated: true,
      program_active: true,
    }
  );

  assert.equal(profile.budget_currency, "PHP");
  assert.equal(profile.wallet_count, 3);
  assert.equal(profile.plan, "free");
  assert.equal(profile.is_activated, false);
  assert.equal(profile.program_active, false);
  assert.equal(profile.membership_source, "backend");
});

test("backend user normalization preserves plan, status, and timestamps", () => {
  assert.deepEqual(
    normalizeUser({
      id: 4,
      name: "Max",
      email: "MAX@example.com",
      role: "admin",
      plan: "committed",
      status: "pending",
      created_at: "created",
      updated_at: "updated",
    }),
    {
      id: 4,
      name: "Max",
      email: "max@example.com",
      role: "admin",
      plan: "committed",
      status: "pending",
      created_at: "created",
      updated_at: "updated",
    }
  );

  assert.equal(normalizeUser({ id: 5, plan: "pro", status: "approved" }).plan, "free");
  assert.equal(
    normalizeUser({ id: 5, plan: "pro", status: "approved" }).status,
    "inactive"
  );
});

test("offline membership snapshots expire", () => {
  const now = Date.now();
  assert.equal(
    isStoredBackendUserSnapshotFresh(new Date(now - 60_000).toISOString(), now),
    true
  );
  assert.equal(
    isStoredBackendUserSnapshotFresh(
      new Date(now - 73 * 60 * 60 * 1000).toISOString(),
      now
    ),
    false
  );
  assert.equal(isStoredBackendUserSnapshotFresh(null, now), false);
});

test("legacy client grants are removed without touching financial records", () => {
  const entitlementKey = "clara_google_play_entitlement_v1:vault-1";
  const localStorage = createStorage({
    clara_hidden_admin_session_v1: "yes",
    clara_ios_access_session_v1: "yes",
    clara_ios_access_offline_v1: "yes",
    clara_dev_membership_preview: "yes",
    clara_dev_plan_preview: "yes",
    [entitlementKey]: JSON.stringify({
      state: "active",
      purchaseState: "ACCESS_CODE",
      grantSource: "access_code",
      developerAccess: true,
    }),
    clara_budget_v1: JSON.stringify({ amount: 10000 }),
  });
  const sessionStorage = createStorage({
    clara_hidden_admin_session_v1: "yes",
  });
  globalThis.window = { localStorage, sessionStorage };

  try {
    const result = runBackendMembershipAuthorityMigration();
    LEGACY_MEMBERSHIP_KEYS.forEach((key) => {
      assert.equal(localStorage.getItem(key), null);
      assert.equal(sessionStorage.getItem(key), null);
    });

    const entitlement = JSON.parse(localStorage.getItem(entitlementKey));
    assert.equal(entitlement.state, "inactive");
    assert.equal(entitlement.purchaseState, "UNSPECIFIED");
    assert.equal(entitlement.developerAccess, false);
    assert.equal("grantSource" in entitlement, false);
    assert.deepEqual(JSON.parse(localStorage.getItem("clara_budget_v1")), {
      amount: 10000,
    });
    assert.equal(
      localStorage.getItem(BACKEND_MEMBERSHIP_MIGRATION_MARKER),
      "complete"
    );
    assert.equal(result.neutralizedEntitlements, 1);

    const secondRun = runBackendMembershipAuthorityMigration();
    assert.equal(secondRun.neutralizedEntitlements, 0);
  } finally {
    delete globalThis.window;
  }
});

test("production app no longer imports or renders in-app administration", () => {
  const appSource = readFileSync(
    new URL("../src/App.jsx", import.meta.url),
    "utf8"
  );
  const budgetCardSource = readFileSync(
    new URL("../src/components/BudgetCard.jsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(appSource, /AdminPanel|AdminRoute|HiddenAdminRoute|AdminRescueButton/);
  assert.doesNotMatch(appSource, /pages\/admin|features\/coaching-admin/);
  assert.match(appSource, /path="\/admin\/\*"/);
  assert.doesNotMatch(
    budgetCardSource,
    /verifyHiddenAdminPassword|writeDeveloperMembershipPreview|hiddenAdmin/
  );
});
