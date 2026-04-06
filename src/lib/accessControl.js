export function getPlan(profile) {
  const status = String(profile?.enrollment_status || "").toLowerCase();

  if (["approved", "active"].includes(status)) {
    return profile?.plan_key || "diy"; // fallback if missing
  }

  return "free";
}

export function hasAccess(profile, feature) {
  const plan = getPlan(profile);

  const access = {
    free: {
      modules: false,
      tasks: false,
      community_post: false,
      messages: false,
      coaching: false,
    },

    diy: {
      modules: true,
      tasks: true,
      community_post: true,
      messages: false,
      coaching: false,
    },

    diwm: {
      modules: true,
      tasks: true,
      community_post: true,
      messages: true,
      coaching: true,
    },

    vip: {
      modules: true,
      tasks: true,
      community_post: true,
      messages: true,
      coaching: true,
    },
  };

  return access[plan]?.[feature] || false;
}