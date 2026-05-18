// CLARA Life Stage Images
//
// This is the central image registry for the Me page / Life Stage hero.
//
// Upload your images here:
// src/assets/life-stages/
//
// Recommended filenames:
// - young-professional.jpg
// - living-with-partner.jpg
// - family-household.jpg
// - working-student.jpg
// - single-parent.jpg
// - full-time-earner.jpg
// - freelance-gig-worker.jpg
// - business-builder.jpg
// - recovery-season.jpg
// - transitioning-life-stage.jpg
//
// After uploading the files, uncomment the imports below and assign them
// inside LIFE_STAGE_IMAGES.

// import youngProfessional from "@/assets/life-stages/young-professional.jpg";
// import livingWithPartner from "@/assets/life-stages/living-with-partner.jpg";
// import familyHousehold from "@/assets/life-stages/family-household.jpg";
// import workingStudent from "@/assets/life-stages/working-student.jpg";
// import singleParent from "@/assets/life-stages/single-parent.jpg";
// import fullTimeEarner from "@/assets/life-stages/full-time-earner.jpg";
// import freelanceGigWorker from "@/assets/life-stages/freelance-gig-worker.jpg";
// import businessBuilder from "@/assets/life-stages/business-builder.jpg";
// import recoverySeason from "@/assets/life-stages/recovery-season.jpg";
// import transitioningLifeStage from "@/assets/life-stages/transitioning-life-stage.jpg";

export const LIFE_STAGE_IMAGES = {
  youngProfessional: "",
  livingWithPartner: "",
  familyHousehold: "",
  workingStudent: "",
  singleParent: "",
  fullTimeEarner: "",
  freelanceGigWorker: "",
  businessBuilder: "",
  recoverySeason: "",
  transitioningLifeStage: "",
};

export const LIFE_STAGE_IMAGE_BY_LABEL = {
  "Young Professional": LIFE_STAGE_IMAGES.youngProfessional,
  "Living With Partner": LIFE_STAGE_IMAGES.livingWithPartner,
  "Living with Partner": LIFE_STAGE_IMAGES.livingWithPartner,
  "Family Household": LIFE_STAGE_IMAGES.familyHousehold,
  "Working Student": LIFE_STAGE_IMAGES.workingStudent,
  "Single Parent": LIFE_STAGE_IMAGES.singleParent,
  "Full-Time Earner": LIFE_STAGE_IMAGES.fullTimeEarner,
  "Freelance / Gig Worker": LIFE_STAGE_IMAGES.freelanceGigWorker,
  "Freelance Season": LIFE_STAGE_IMAGES.freelanceGigWorker,
  "Business Builder": LIFE_STAGE_IMAGES.businessBuilder,
  "Recovery Season": LIFE_STAGE_IMAGES.recoverySeason,
  "Transitioning Life Stage": LIFE_STAGE_IMAGES.transitioningLifeStage,
};

export function getLifeStageImage(stageName) {
  return LIFE_STAGE_IMAGE_BY_LABEL[stageName] || "";
}
