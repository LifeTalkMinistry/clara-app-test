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
  if (!hero || !card) return false;

  const title = card.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!title || !body) return false;

  if (card.dataset.claraSupportCard !== "true") card.dataset.claraSupportCard = "true";
  if (title.textContent !== SUPPORT_COPY.title) title.textContent = SUPPORT_COPY.title;
  if (body.textContent !== SUPPORT_COPY.body) body.textContent = SUPPORT_COPY.body;

  card.querySelectorAll("[data-clara-support-signal='true']").forEach((node) => node.remove());
  return true;
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_SUPPORT_CARD__) {
  window.__CLARA_LIFE_SUPPORT_CARD__ = true;
  let timer = null;
  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(enhanceSupportCard), 240);
  };

  window.addEventListener("hashchange", run);
  window.addEventListener("clara:intelligence-updated", run);
  document.addEventListener("click", run, true);
  window.requestAnimationFrame(enhanceSupportCard);
}
