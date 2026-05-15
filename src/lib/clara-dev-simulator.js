export const CLARA_DEV_IDENTITY_KEY = "clara_dev_identity_override_v1";
export const CLARA_DEV_IDENTITY_EVENT = "clara-dev-identity-changed";

export const DEV_IDENTITY_SCENARIOS = [
  {
    id: "fresh_install",
    label: "Fresh Install",
    description: "Pretend this device has never opened CLARA before.",
  },
  {
    id: "demo_user",
    label: "Demo User",
    description: "Route into the future guided demo experience.",
  },
  {
    id: "active_user",
    label: "Active User",
    description: "Pretend the user already has real wallets, budgets, and expenses.",
  },
  {
    id: "tenured_user",
    label: "Tenured User",
    description: "Pretend the user has been using CLARA for a while.",
  },
  {
    id: "subscription_expired",
    label: "Subscription Expired",
    description: "Test expired access, soft locks, and renewal prompts.",
  },
  {
    id: "heavy_spender",
    label: "Heavy Spender",
    description: "Test pressured spending, warnings, and behavioral coaching.",
  },
  {
    id: "savings_focused",
    label: "Savings Focused",
    description: "Test goal protection, emergency fund, and savings-first guidance.",
  },
  {
    id: "empty_state",
    label: "Empty State",
    description: "Test pages with no wallet, budget, expense, or goal data.",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitDevIdentityChange(detail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(CLARA_DEV_IDENTITY_EVENT, {
      detail,
    })
  );
}

export function getDevIdentityScenarios() {
  return DEV_IDENTITY_SCENARIOS;
}

export function getDevIdentityScenario(scenarioId) {
  return DEV_IDENTITY_SCENARIOS.find((scenario) => scenario.id === scenarioId) || null;
}

export function readClaraDevIdentityOverride() {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(CLARA_DEV_IDENTITY_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const scenario = getDevIdentityScenario(parsed?.scenarioId);

    if (!scenario) return null;

    return {
      version: 1,
      scenarioId: scenario.id,
      label: scenario.label,
      appliedAt: parsed?.appliedAt || null,
    };
  } catch {
    return null;
  }
}

export function writeClaraDevIdentityOverride(scenarioId) {
  const scenario = getDevIdentityScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown CLARA developer scenario: ${scenarioId}`);
  }

  const override = {
    version: 1,
    scenarioId: scenario.id,
    label: scenario.label,
    appliedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    window.localStorage.setItem(CLARA_DEV_IDENTITY_KEY, JSON.stringify(override));
  }

  emitDevIdentityChange(override);
  return override;
}

export function clearClaraDevIdentityOverride() {
  if (canUseStorage()) {
    window.localStorage.removeItem(CLARA_DEV_IDENTITY_KEY);
  }

  emitDevIdentityChange(null);
}

export function reloadForDevIdentityChange() {
  if (typeof window === "undefined") return;
  window.setTimeout(() => window.location.reload(), 180);
}
