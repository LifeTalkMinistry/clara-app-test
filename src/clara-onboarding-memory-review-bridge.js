const ONBOARDING_MEMORY_REVIEW_SECTION_ID = "clara-onboarding-memory-review-section";
const ACTIVE_MEMORY_USER_ID_KEY = "clara_active_memory_user_id";
const MEMORY_STORAGE_PREFIX = "clara_memory_";

const ONBOARDING_MEMORY_LABELS = {
  onboarding_commitment: "Commitment",
  onboarding_lifestyle_clarity: "Lifestyle clarity",
  onboarding_money_pressure: "Money pressure",
  onboarding_spending_trigger: "Spending trigger",
  onboarding_guidance_style: "Guidance style",
  onboarding_guidance_intensity: "Guidance intensity",
};

const ONBOARDING_MEMORY_ORDER = Object.keys(ONBOARDING_MEMORY_LABELS);

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeParseMemoryList(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getMemoryStorageKeys() {
  if (typeof window === "undefined" || !window.localStorage) return [];

  const activeUserId = clean(window.localStorage.getItem(ACTIVE_MEMORY_USER_ID_KEY));
  if (activeUserId) return [`${MEMORY_STORAGE_PREFIX}${activeUserId}`];

  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(MEMORY_STORAGE_PREFIX)) keys.push(key);
  }

  return keys;
}

function readOnboardingMemories() {
  const newestByCategory = new Map();

  getMemoryStorageKeys().forEach((key) => {
    safeParseMemoryList(key).forEach((memory) => {
      const category = clean(memory?.category);
      const content = clean(memory?.content);
      if (!category.startsWith("onboarding_") || !content) return;

      const previous = newestByCategory.get(category);
      if (!previous || Number(memory?.timestamp || 0) >= Number(previous?.timestamp || 0)) {
        newestByCategory.set(category, { category, content, timestamp: memory?.timestamp || 0 });
      }
    });
  });

  return ONBOARDING_MEMORY_ORDER.map((category) => newestByCategory.get(category)).filter(Boolean);
}

function getMemorySignature(memories = []) {
  return JSON.stringify(memories.map((memory) => [memory.category, memory.content, memory.timestamp]));
}

function createOnboardingSectionHtml(memories = [], signature = "") {
  const items = memories
    .map((memory) => {
      const label = ONBOARDING_MEMORY_LABELS[memory.category] || "Onboarding";
      return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(memory.content)}</li>`;
    })
    .join("");

  return `
    <section id="${ONBOARDING_MEMORY_REVIEW_SECTION_ID}" class="clara-memory-section" data-onboarding-memory-signature="${escapeHtml(signature)}">
      <h4>Starting Profile</h4>
      <ul>${items}</ul>
    </section>
  `;
}

function installOnboardingMemoryReviewSection() {
  if (typeof document === "undefined") return;

  const reviewList = document.querySelector("#clara-assistant-memory-panel .clara-memory-review-list");
  const existingSection = document.getElementById(ONBOARDING_MEMORY_REVIEW_SECTION_ID);
  if (!reviewList) {
    existingSection?.remove();
    return;
  }

  const memories = readOnboardingMemories();
  if (!memories.length) {
    existingSection?.remove();
    return;
  }

  const signature = getMemorySignature(memories);
  if (existingSection?.dataset?.onboardingMemorySignature === signature) return;

  existingSection?.remove();

  const anchor = reviewList.querySelector(".clara-memory-context-disclaimer") || reviewList.firstElementChild;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = createOnboardingSectionHtml(memories, signature).trim();
  const section = wrapper.firstElementChild;

  if (anchor?.nextSibling) {
    reviewList.insertBefore(section, anchor.nextSibling);
  } else {
    reviewList.appendChild(section);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("clara-onboarding-memory-updated", installOnboardingMemoryReviewSection);
  window.addEventListener("clara-user-context-story-updated", installOnboardingMemoryReviewSection);
  window.addEventListener("storage", installOnboardingMemoryReviewSection);

  if (typeof document !== "undefined") {
    installOnboardingMemoryReviewSection();

    const observer = new MutationObserver(installOnboardingMemoryReviewSection);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}
