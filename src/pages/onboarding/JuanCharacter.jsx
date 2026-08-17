const JUAN_POSE_ASSETS = Object.freeze({
  phone: "juan-character.svg",
});

/**
 * Canonical human character used throughout the CLARA guided tour.
 *
 * Keep Juan's face, hair, skin tone, clothing, proportions, and illustration
 * language consistent. New poses should be added as local assets to
 * JUAN_POSE_ASSETS rather than introducing a second Juan implementation.
 */
export default function JuanCharacter({
  pose = "phone",
  compact = false,
  className = "",
  decorative = false,
}) {
  const resolvedPose = Object.prototype.hasOwnProperty.call(JUAN_POSE_ASSETS, pose)
    ? pose
    : "phone";
  const assetPath = `${import.meta.env.BASE_URL}${JUAN_POSE_ASSETS[resolvedPose]}`;
  const classes = [
    "clara-juan-character",
    compact ? "is-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      data-juan-pose={resolvedPose}
      data-requested-juan-pose={pose}
    >
      <img
        src={assetPath}
        alt={decorative ? "" : "Juan, a full-time earner holding a smartphone"}
        aria-hidden={decorative ? "true" : undefined}
        draggable="false"
      />
    </div>
  );
}
