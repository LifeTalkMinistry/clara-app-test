import { supabase } from "@/lib/supabaseClient";

export const UNIVERSAL_ONBOARDING_SETTINGS_DEFAULTS = {
  onboarding_welcome_badge: "A Guided Arrival",
  onboarding_welcome_headline: "Welcome to CLARA.",
  onboarding_welcome_subheadline:
    "A calm, structured system that helps you understand your money, build discipline, and move forward with clarity.",
  onboarding_welcome_cta: "Start your setup",
  onboarding_welcome_media_url: "",
  onboarding_slide_1_title: "More than a tracker",
  onboarding_slide_1_description:
    "CLARA helps you understand the behavior behind your money, not just the numbers on a screen.",
  onboarding_slide_2_title: "Built for real progress",
  onboarding_slide_2_description:
    "You get guided structure, clear next steps, and tools that support consistency without overwhelming you.",
  onboarding_slide_3_title: "Designed to meet you where you are",
  onboarding_slide_3_description:
    "Some people need simple tools. Others want a guided system. CLARA is built to support both.",
  onboarding_slide_4_title: "A better starting point",
  onboarding_slide_4_description:
    "Your first steps should feel focused, trustworthy, and worth continuing. That is what this setup is for.",
  onboarding_founder_badge: "Why CLARA Exists",
  onboarding_founder_headline: "Created to bring clarity where money often feels heavy.",
  onboarding_founder_body:
    "CLARA was built for people who want more than generic budgeting. It exists to give structure, reduce noise, and make progress feel possible again one clear step at a time.",
  onboarding_founder_media_url: "",
  onboarding_teaser_badge: "Next Layer",
  onboarding_teaser_headline: "There is more guidance available when you want it.",
  onboarding_teaser_body:
    "CLARA can stay lightweight, or it can guide you through a more structured path when you are ready for deeper support.",
  onboarding_teaser_cta: "Explore guided options",
  onboarding_result_tools_title: "PRO is your cleanest starting point.",
  onboarding_result_tools_body:
    "A simple entry into CLARA focused on essential financial visibility, tracking, and beginner-friendly control.",
  onboarding_result_tools_primary_cta: "Choose PRO",
  onboarding_result_tools_secondary_cta: "View all tiers",
  onboarding_result_system_title: "CORE fits your daily spending needs best.",
  onboarding_result_system_body:
    "Your answers point toward more guidance, structure, and advanced daily spending intelligence through CLARA Companion.",
  onboarding_result_system_primary_cta: "Choose CORE",
  onboarding_result_system_secondary_cta: "View all tiers",
  onboarding_result_guidance_title: "Life OS may be the right fit.",
  onboarding_result_guidance_body:
    "Your answers suggest you want broader decision support, planning context, and CLARA's deepest operating-system intelligence.",
  onboarding_result_guidance_primary_cta: "Choose Life OS",
  onboarding_result_guidance_secondary_cta: "View all tiers",
};

export const UNIVERSAL_ONBOARDING_SETTINGS_KEYS = Object.keys(
  UNIVERSAL_ONBOARDING_SETTINGS_DEFAULTS
);

export function buildUniversalOnboardingContent(settings = {}) {
  const merged = {
    ...UNIVERSAL_ONBOARDING_SETTINGS_DEFAULTS,
    ...settings,
  };

  return {
    welcome: {
      badge: merged.onboarding_welcome_badge,
      headline: merged.onboarding_welcome_headline,
      subheadline: merged.onboarding_welcome_subheadline,
      cta: merged.onboarding_welcome_cta,
      mediaUrl: merged.onboarding_welcome_media_url,
    },
    slides: [1, 2, 3, 4].map((index) => ({
      id: `slide-${index}`,
      title: merged[`onboarding_slide_${index}_title`],
      description: merged[`onboarding_slide_${index}_description`],
    })),
    founder: {
      badge: merged.onboarding_founder_badge,
      headline: merged.onboarding_founder_headline,
      body: merged.onboarding_founder_body,
      mediaUrl: merged.onboarding_founder_media_url,
    },
    teaser: {
      badge: merged.onboarding_teaser_badge,
      headline: merged.onboarding_teaser_headline,
      body: merged.onboarding_teaser_body,
      cta: merged.onboarding_teaser_cta,
    },
    results: {
      tools: {
        title: merged.onboarding_result_tools_title,
        body: merged.onboarding_result_tools_body,
        primaryCta: merged.onboarding_result_tools_primary_cta,
        secondaryCta: merged.onboarding_result_tools_secondary_cta,
      },
      system: {
        title: merged.onboarding_result_system_title,
        body: merged.onboarding_result_system_body,
        primaryCta: merged.onboarding_result_system_primary_cta,
        secondaryCta: merged.onboarding_result_system_secondary_cta,
      },
      guidance: {
        title: merged.onboarding_result_guidance_title,
        body: merged.onboarding_result_guidance_body,
        primaryCta: merged.onboarding_result_guidance_primary_cta,
        secondaryCta: merged.onboarding_result_guidance_secondary_cta,
      },
    },
  };
}

export async function loadUniversalOnboardingContent() {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", UNIVERSAL_ONBOARDING_SETTINGS_KEYS);

    if (error) {
      throw error;
    }

    const settings = (data || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return buildUniversalOnboardingContent(settings);
  } catch (error) {
    console.warn("Falling back to default onboarding content:", error);
    return buildUniversalOnboardingContent();
  }
}
