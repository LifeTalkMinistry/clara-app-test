export const CLARA_ORB_COMMAND_SELECT_EVENT = "clara:orb-command-select";

export const ORB_COMMAND_HOLD_MS = 520;
export const ORB_COMMAND_PRE_HOLD_MOVE_PX = 14;
export const ORB_COMMAND_MIN_DEAD_ZONE_PX = 52;
export const ORB_COMMAND_MAX_DEAD_ZONE_PX = 78;

// The presentation stylesheet is browser-only. Keeping the import guarded lets
// the geometry module stay directly importable by the Node regression tests.
if (typeof document !== "undefined") {
  void import("./clara-orb-command-ring.css");
}

export const CLARA_ORB_COMMANDS = Object.freeze([
  Object.freeze({ id: "log-expense", label: "Log Expense", angle: -90, radius: 1 }),
  Object.freeze({ id: "add-income", label: "Add Income", angle: -50, radius: 1 }),
  Object.freeze({ id: "wallet", label: "Wallet", angle: -10, radius: 1 }),
  Object.freeze({ id: "calendar", label: "Calendar", angle: 30, radius: 1 }),
  Object.freeze({ id: "money-schedule", label: "Money Schedule", angle: 70, radius: 1 }),
  Object.freeze({ id: "emergency-fund", label: "Emergency Fund", angle: 110, radius: 1 }),
  Object.freeze({ id: "savings-goal", label: "Savings Goal", angle: 150, radius: 1 }),
  Object.freeze({ id: "debt-obligation", label: "Debt / Obligation", angle: 190, radius: 1 }),
  Object.freeze({ id: "weekly-cross-check", label: "Weekly Cross-Check", angle: 230, radius: 1 }),
]);

export function normalizeOrbCommandAngle(angle) {
  return ((Number(angle) % 360) + 360) % 360;
}

export function getOrbCommandAngularDistance(leftAngle, rightAngle) {
  const delta = Math.abs(
    normalizeOrbCommandAngle(leftAngle) - normalizeOrbCommandAngle(rightAngle)
  );
  return Math.min(delta, 360 - delta);
}

export function getOrbCommandDeadZone(orbWidth) {
  const proposed = Number(orbWidth) * 0.3;
  if (!Number.isFinite(proposed)) return ORB_COMMAND_MIN_DEAD_ZONE_PX;
  return Math.max(
    ORB_COMMAND_MIN_DEAD_ZONE_PX,
    Math.min(ORB_COMMAND_MAX_DEAD_ZONE_PX, proposed)
  );
}

export function getOrbCommandRadius({
  centerX,
  centerY,
  viewportWidth,
  viewportHeight,
  orbWidth,
}) {
  const safeCenterX = Number(centerX) || 0;
  const safeCenterY = Number(centerY) || 0;
  const safeViewportWidth = Number(viewportWidth) || 0;
  const safeViewportHeight = Number(viewportHeight) || 0;
  const safeOrbWidth = Number(orbWidth) || 0;
  const viewportMargin = 12;
  const commandHalfSize = 27;

  const desiredRadius = Math.max(118, Math.min(158, safeOrbWidth * 0.56));
  const maxViewportRadius = Math.min(
    safeCenterX - viewportMargin - commandHalfSize,
    safeViewportWidth - safeCenterX - viewportMargin - commandHalfSize,
    safeCenterY - viewportMargin - commandHalfSize,
    safeViewportHeight - safeCenterY - viewportMargin - commandHalfSize
  );

  if (!Number.isFinite(maxViewportRadius) || maxViewportRadius <= 0) {
    return desiredRadius;
  }

  return Math.max(92, Math.min(desiredRadius, maxViewportRadius));
}

export function getOrbCommandTarget({
  pointerX,
  pointerY,
  centerX,
  centerY,
  deadZonePx,
  commands = CLARA_ORB_COMMANDS,
}) {
  const dx = Number(pointerX) - Number(centerX);
  const dy = Number(pointerY) - Number(centerY);
  const distance = Math.hypot(dx, dy);

  if (!Number.isFinite(distance) || distance <= Number(deadZonePx || 0)) {
    return null;
  }

  const pointerAngle = normalizeOrbCommandAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  let nearestCommand = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const command of commands) {
    const angularDistance = getOrbCommandAngularDistance(pointerAngle, command.angle);
    if (angularDistance < nearestDistance) {
      nearestDistance = angularDistance;
      nearestCommand = command;
    }
  }

  return nearestCommand;
}

export function dispatchClaraOrbCommandSelection(commandId, source = "clara-orb-page") {
  if (typeof window === "undefined") return false;

  const command = CLARA_ORB_COMMANDS.find((item) => item.id === commandId);
  if (!command) return false;

  window.dispatchEvent(
    new CustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
      detail: {
        commandId: command.id,
        commandLabel: command.label,
        source,
      },
    })
  );

  return true;
}
