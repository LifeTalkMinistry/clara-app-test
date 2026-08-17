const JUAN_POSE_ASSETS = Object.freeze({
  phone: {
    primary: "characters/juan/juan-phone.webp",
    fallback: "juan-character.svg",
  },
});

/**
 * Canonical human character used throughout the CLARA guided tour.
 *
 * Production artwork lives under public/characters/juan/. Keep Juan's face,
 * hair, skin tone, clothing, proportions, and illustration language consistent.
 * New poses should be added to JUAN_POSE_ASSETS instead of introducing a second
 * Juan implementation.
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
  const asset = JUAN_POSE_ASSETS[resolvedPose];
  const primaryPath = `${import.meta.env.BASE_URL}${asset.primary}`;
  const fallbackPath = `${import.meta.env.BASE_URL}${asset.fallback}`;
  const classes = [
    "clara-juan-character",
    compact ? "is-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const useFallback = (event) => {
    const image = event.currentTarget;
    if (image.dataset.juanFallbackApplied === "true") return;
    image.dataset.juanFallbackApplied = "true";
    image.src = fallbackPath;
  };

  return (
    <div
      className={classes}
      data-juan-pose={resolvedPose}
      data-requested-juan-pose={pose}
    >
      <img
        src={primaryPath}
        alt={decorative ? "" : "Juan, a full-time earner holding a smartphone"}
        aria-hidden={decorative ? "true" : undefined}
        draggable="false"
        decoding="async"
        loading="eager"
        onError={useFallback}
      />
    </div>
  );
}
