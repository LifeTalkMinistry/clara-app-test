import { supabase } from "@/lib/supabaseClient";

export const UNIVERSAL_ONBOARDING_SETTINGS_DEFAULTS = {
  onboarding_welcome_badge: "Guided setup",
  onboarding_welcome_headline: "Welcome to CLARA.",
  onboarding_welcome_subheadline:
    "Let’s understand your starting point, lifestyle, spending pressure, and the kind of guidance that would help you most.",
  onboarding_welcome_cta: "Start my setup",
  onboarding_welcome_media_url: "",
  onboarding_mission_title: "CLARA was built for more than tracking money.",
  onboarding_mission_body:
    "CLARA exists to help people make better money decisions. As it grows, the goal is also to support students, families, and communities in need through the CLARA Charity Fund.",
  onboarding_mission_cta: "Prepare my starting path",
  onboarding_result_title: "Your CLARA starting path is ready.",
  onboarding_result_body:
    "Based on your answers, CLARA will start by helping you understand your lifestyle, notice your spending pressure points, and pause before risky money decisions.",
  onboarding_result_primary_cta: "Enter my dashboard",
  onboarding_result_secondary_cta: "Learn about Committed Version",
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
    mission: {
      title: merged.onboarding_mission_title,
      body: merged.onboarding_mission_body,
      cta: merged.onboarding_mission_cta,
    },
    result: {
      title: merged.onboarding_result_title,
      body: merged.onboarding_result_body,
      primaryCta: merged.onboarding_result_primary_cta,
      secondaryCta: merged.onboarding_result_secondary_cta,
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
