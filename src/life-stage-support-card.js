const SUPPORT_COPY = {
  title: "You’re not alone.",
  body: "Many people in this life stage are experiencing similar financial pressure.",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findLifeStageRoot() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard(hero) {
  if (!hero) return null;
  let current = hero.nextElementSibling;
  while (current) {
    const title = clean(current.querySelector("h3")?.textContent);
    if (title || current.querySelector("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function enhanceSupportCard() {
  const hero = findLifeStageRoot();
  const card = findSupportCard(hero);
  if (!hero || !card) return;

  const title = card.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!title || !body) return;

  card.dataset.claraSupportCard = "true";
  title.textContent = SUPPORT_COPY.title;
  body.textContent = SUPPORT_COPY.body;

  card.querySelectorAll("[data-clara-support-signal='true']").forEach((node) => node.remove());
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_SUPPORT_CARD__) {
  window.__CLARA_LIFE_SUPPORT_CARD__ = true;
  const observer = new MutationObserver(() => window.requestAnimationFrame(enhanceSupportCard));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(enhanceSupportCard);
}
