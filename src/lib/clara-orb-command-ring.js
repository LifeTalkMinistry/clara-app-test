export const CLARA_ORB_COMMAND_SELECT_EVENT = "clara:orb-command-select";

export const ORB_COMMAND_HOLD_MS = 520;
export const ORB_COMMAND_PRE_HOLD_MOVE_PX = 14;
export const ORB_COMMAND_MIN_DEAD_ZONE_PX = 52;
export const ORB_COMMAND_MAX_DEAD_ZONE_PX = 78;

export function normalizeOrbCommandAngle(angle) {
  return ((Number(angle) % 360) + 360) % 360;
}

export function getOrbCommandAngularDistance(leftAngle, rightAngle) {
  const delta = Math.abs(
    normalizeOrbCommandAngle(leftAngle) - normalizeOrbCommandAngle(rightAngle)
  );
  return Math.min(delta, 360 - delta);
}

// Selected command labels are rendered below their action circles. On the upper
// half of the ring that direction points back toward the Orb, while wide labels
// near the left/right sides can also extend inward horizontally. Give every
// command a small geometry-derived radial allowance so text stays outside the
// Orb instead of special-casing individual clock positions.
export function getOrbCommandVisualRadiusMultiplier(angle, label = "") {
  const radians = (normalizeOrbCommandAngle(angle) * Math.PI) / 180;
  const upperArcInwardFactor = Math.max(0, -Math.sin(radians));
  const horizontalLabelExposure = Math.abs(Math.cos(radians));
  const labelWidthFactor = Math.min(String(label).trim().length / 18, 1);

  const upperArcAllowance = upperArcInwardFactor * 0.2;
  const labelWidthAllowance = horizontalLabelExposure * labelWidthFactor * 0.2;

  return 1 + upperArcAllowance + labelWidthAllowance;
}

const ORB_COMMAND_LAYOUT = [
  { id: "log-expense", label: "Log Expense", angle: -90 },
  { id: "add-income", label: "Add Income", angle: -50 },
  { id: "wallet", label: "Wallet", angle: -10 },
  { id: "calendar", label: "Calendar", angle: 30 },
  { id: "money-schedule", label: "Money Schedule", angle: 70 },
  { id: "emergency-fund", label: "Emergency Fund", angle: 110 },
  { id: "savings-goal", label: "Savings Goal", angle: 150 },
  { id: "debt-obligation", label: "Debt / Obligation", angle: 190 },
  { id: "weekly-cross-check", label: "Weekly Cross-Check", angle: 230 },
];

export const CLARA_ORB_COMMANDS = Object.freeze(
  ORB_COMMAND_LAYOUT.map((command) =>
    Object.freeze({
      ...command,
      radius: getOrbCommandVisualRadiusMultiplier(command.angle, command.label),
    })
  )
);

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
