const HERO_REFINED_ATTR = "data-clara-challenge-hero-refined";
const INFO_MODAL_ID = "clara-challenge-hub-info-modal";
let refinementQueued = false;

function findChallengeHero() {
  const challengeView = document.querySelector(".clara-community-challenges-view") || document;
  return (
    Array.from(challengeView.querySelectorAll("section")).find((section) => {
      const text = String(section.textContent || "");
      return text.includes("Challenge Hub") && (
        text.includes("Consistency wins here.") ||
        text.includes("Consistency builds financial strength.")
      );
    }) || null
  );
}

function closeInfoModal() {
  document.getElementById(INFO_MODAL_ID)?.remove();
}

function infoIconSvg() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
      <path d="M12 10.7v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="12" cy="7.7" r="1" fill="currentColor" />
    </svg>
  `;
}

function openInfoModal() {
  closeInfoModal();

  const overlay = document.createElement("div");
  overlay.id = INFO_MODAL_ID;
  overlay.setAttribute("role", "presentation");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: "12px",
    paddingBottom: "max(12px, env(safe-area-inset-bottom))",
    background: "rgba(1, 2, 23, 0.74)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  });

  const sheet = document.createElement("section");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "clara-challenge-hub-info-title");
  Object.assign(sheet.style, {
    position: "relative",
    width: "min(100%, 430px)",
    borderRadius: "26px",
    border: "1px solid rgba(94, 234, 212, 0.16)",
    background: "linear-gradient(155deg, rgba(7, 27, 45, 0.99), rgba(7, 15, 35, 0.995))",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.48)",
    padding: "22px 20px 20px",
    color: "#fff",
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close Challenge Hub information");
  closeButton.textContent = "×";
  Object.assign(closeButton.style, {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "34px",
    height: "34px",
    borderRadius: "13px",
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.64)",
    fontSize: "22px",
    lineHeight: "1",
    cursor: "pointer",
  });
  closeButton.addEventListener("click", closeInfoModal);

  const eyebrow = document.createElement("p");
  eyebrow.textContent = "CHALLENGE HUB";
  Object.assign(eyebrow.style, {
    margin: "0 44px 0 0",
    color: "rgba(250, 204, 21, .78)",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: ".18em",
  });

  const title = document.createElement("h3");
  title.id = "clara-challenge-hub-info-title";
  title.textContent = "Consistency is the advantage.";
  Object.assign(title.style, {
    margin: "8px 44px 0 0",
    fontSize: "21px",
    lineHeight: "1.2",
    letterSpacing: "-.025em",
    fontWeight: "900",
  });

  const body = document.createElement("p");
  body.textContent = "Money habits are built through repeated action. Weekly challenges train short streaks, Monthly Missions reward steady in-app activity, and the 30-Day Race tests long-form discipline. CLARA measures your consistency—not your income.";
  Object.assign(body.style, {
    margin: "14px 0 0",
    color: "rgba(255,255,255,.56)",
    fontSize: "12px",
    lineHeight: "1.75",
    fontWeight: "650",
  });

  const principle = document.createElement("div");
  principle.textContent = "Small actions, repeated well, become financial strength.";
  Object.assign(principle.style, {
    marginTop: "16px",
    borderRadius: "18px",
    border: "1px solid rgba(250, 204, 21, .14)",
    background: "rgba(250, 204, 21, .045)",
    padding: "12px 13px",
    color: "rgba(254, 240, 138, .78)",
    fontSize: "11px",
    lineHeight: "1.55",
    fontWeight: "800",
  });

  sheet.append(closeButton, eyebrow, title, body, principle);
  overlay.appendChild(sheet);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeInfoModal();
  });
  document.body.appendChild(overlay);
}

function refineChallengeHero() {
  refinementQueued = false;
  const hero = findChallengeHero();
  if (!hero || hero.getAttribute(HERO_REFINED_ATTR) === "true") return;

  const contentRow = Array.from(hero.children).find((child) =>
    String(child.textContent || "").includes("Challenge Hub"),
  );
  if (!contentRow) return;

  const textBlock = Array.from(contentRow.children).find((child) =>
    String(child.textContent || "").includes("Challenge Hub"),
  );
  if (!textBlock) return;

  Array.from(contentRow.children).forEach((child) => {
    if (child !== textBlock && child.querySelector?.("svg")) child.remove();
  });

  contentRow.style.gap = "0";
  textBlock.style.flex = "1 1 auto";
  textBlock.style.width = "100%";
  textBlock.style.paddingRight = "46px";

  const eyebrow = Array.from(textBlock.querySelectorAll("p")).find(
    (node) => String(node.textContent || "").trim().toLowerCase() === "challenge hub",
  );
  if (eyebrow) {
    eyebrow.style.letterSpacing = ".22em";
  }

  const heading = textBlock.querySelector("h2");
  if (heading) {
    heading.textContent = "Consistency builds financial strength.";
    heading.style.maxWidth = "290px";
    heading.style.lineHeight = "1.18";
  }

  Array.from(textBlock.querySelectorAll("p")).forEach((node) => {
    if (node !== eyebrow && String(node.textContent || "").includes("Weekly, monthly")) {
      node.remove();
    }
  });

  const infoButton = document.createElement("button");
  infoButton.type = "button";
  infoButton.setAttribute("aria-label", "About Challenge Hub");
  infoButton.innerHTML = infoIconSvg();
  Object.assign(infoButton.style, {
    position: "absolute",
    top: "18px",
    right: "18px",
    zIndex: "3",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    padding: "0",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,.11)",
    background: "rgba(255,255,255,.035)",
    color: "rgba(255,255,255,.52)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.035)",
    cursor: "pointer",
  });
  infoButton.addEventListener("click", openInfoModal);
  hero.appendChild(infoButton);
  hero.setAttribute(HERO_REFINED_ATTR, "true");
}

function queueRefinement() {
  if (refinementQueued) return;
  refinementQueued = true;
  window.requestAnimationFrame(refineChallengeHero);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const observer = new MutationObserver(queueRefinement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", queueRefinement, true);
  window.addEventListener("hashchange", queueRefinement);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeInfoModal();
  });
  window.setTimeout(queueRefinement, 0);
}
