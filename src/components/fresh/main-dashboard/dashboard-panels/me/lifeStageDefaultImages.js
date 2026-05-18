// CLARA Life Stage Default Images
//
// Place your default cinematic stage images here.
//
// Recommended:
// - portrait orientation
// - dark cinematic style
// - 1080x1920 or similar mobile ratio
// - optimized/compressed images
//
// Example usage:
// import youngEarnerImage from "../../../../assets/life-stages/young-earner.jpg";
//
// Then assign below.

export const LIFE_STAGE_DEFAULT_IMAGES = {
  "Young Earner": "",
  "Working Student": "",
  "Living with Partner": "",
  "Single Parent": "",
  Breadwinner: "",
};

export function getLifeStageDefaultImage(stageName) {
  return LIFE_STAGE_DEFAULT_IMAGES[stageName] || "";
}
