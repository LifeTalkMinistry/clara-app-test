// CLARA Life Stage Images
//
// This is the central image registry for the Me page / Life Stage hero.
//
// Default images live here:
// src/assets/life-stages/
//
// Uploaded filenames currently wired:
// - business-builder-girl.jpg.png
// - business-builder-men.jpg.png
// - family-household.jpg.png
// - freelance-season-girl.jpg.png
// - freelance-season-men.jpg.png
// - full-time-earner-girl.jpg.png
// - full-time-earner-men.jpg.png
// - living-with-partner.jpg.png
// - single-parent-girl.jpg.png
// - single-parent-men.jpg.png
// - working-student-girl.jpg.png
// - working-student-men.jpg.png
// - young-professional-girl.jpg.png
// - young-professional-men.jpg.png

import businessBuilderGirl from "../assets/life-stages/business-builder-girl.jpg.png";
import businessBuilderMen from "../assets/life-stages/business-builder-men.jpg.png";
import familyHousehold from "../assets/life-stages/family-household.jpg.png";
import freelanceSeasonGirl from "../assets/life-stages/freelance-season-girl.jpg.png";
import freelanceSeasonMen from "../assets/life-stages/freelance-season-men.jpg.png";
import fullTimeEarnerGirl from "../assets/life-stages/full-time-earner-girl.jpg.png";
import fullTimeEarnerMen from "../assets/life-stages/full-time-earner-men.jpg.png";
import livingWithPartner from "../assets/life-stages/living-with-partner.jpg.png";
import singleParentGirl from "../assets/life-stages/single-parent-girl.jpg.png";
import singleParentMen from "../assets/life-stages/single-parent-men.jpg.png";
import workingStudentGirl from "../assets/life-stages/working-student-girl.jpg.png";
import workingStudentMen from "../assets/life-stages/working-student-men.jpg.png";
import youngProfessionalGirl from "../assets/life-stages/young-professional-girl.jpg.png";
import youngProfessionalMen from "../assets/life-stages/young-professional-men.jpg.png";

export const LIFE_STAGE_IMAGES = {
  youngProfessional: {
    default: youngProfessionalMen,
    men: youngProfessionalMen,
    male: youngProfessionalMen,
    girl: youngProfessionalGirl,
    female: youngProfessionalGirl,
  },
  livingWithPartner: {
    default: livingWithPartner,
  },
  familyHousehold: {
    default: familyHousehold,
  },
  workingStudent: {
    default: workingStudentGirl,
    men: workingStudentMen,
    male: workingStudentMen,
    girl: workingStudentGirl,
    female: workingStudentGirl,
  },
  singleParent: {
    default: singleParentGirl,
    men: singleParentMen,
    male: singleParentMen,
    girl: singleParentGirl,
    female: singleParentGirl,
  },
  fullTimeEarner: {
    default: fullTimeEarnerMen,
    men: fullTimeEarnerMen,
    male: fullTimeEarnerMen,
    girl: fullTimeEarnerGirl,
    female: fullTimeEarnerGirl,
  },
  freelanceGigWorker: {
    default: freelanceSeasonMen,
    men: freelanceSeasonMen,
    male: freelanceSeasonMen,
    girl: freelanceSeasonGirl,
    female: freelanceSeasonGirl,
  },
  businessBuilder: {
    default: businessBuilderMen,
    men: businessBuilderMen,
    male: businessBuilderMen,
    girl: businessBuilderGirl,
    female: businessBuilderGirl,
  },
  recoverySeason: {
    default: "",
  },
  transitioningLifeStage: {
    default: "",
  },
};

export const LIFE_STAGE_IMAGE_BY_LABEL = {
  "Young Professional": LIFE_STAGE_IMAGES.youngProfessional,
  "Young Earner": LIFE_STAGE_IMAGES.youngProfessional,
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

function resolveStageImage(stageImageEntry, variant = "default") {
  if (!stageImageEntry) return "";
  if (typeof stageImageEntry === "string") return stageImageEntry;
  return stageImageEntry[variant] || stageImageEntry.default || "";
}

export function getLifeStageImage(stageName, variant = "default") {
  return resolveStageImage(LIFE_STAGE_IMAGE_BY_LABEL[stageName], variant);
}

export function getLifeStageImageSet(stageName) {
  return LIFE_STAGE_IMAGE_BY_LABEL[stageName] || { default: "" };
}