const MONTHLY_COACHING_ROUTE = "/welcome-session";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isMonthlyCoachingRoute() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || window.location.pathname || "").includes(
    MONTHLY_COACHING_ROUTE,
  );
}

function replaceLeafText(root, from, to) {
  root.querySelectorAll("h1, p, div, button, span").forEach((element) => {
    if (element.children.length > 0) return;
    if (normalizeText(element.textContent) !== from) return;
    element.textContent = to;
  });
}

function hideLeafText(root, exactText) {
  root.querySelectorAll("p, span").forEach((element) => {
    if (element.children.length > 0) return;
    if (normalizeText(element.textContent) !== exactText) return;
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
  });
}

function patchMonthlyCoachingPage() {
  if (typeof document === "undefined" || !isMonthlyCoachingRoute()) return;

  const root = document.getElementById("root") || document;

  replaceLeafText(root, "CLARA Human Support", "Personal CLARA Support");
  replaceLeafText(root, "Monthly Support Session", "Monthly Coaching");
  replaceLeafText(root, "Monthly support times", "Monthly coaching times");
  replaceLeafText(root, "Unlock monthly support", "Unlock monthly coaching");
  replaceLeafText(
    root,
    "Your active CLARA Committed membership includes one personal 30-minute support and coaching session each month.",
    "One personal 30-minute coaching session is included with every active membership month.",
  );

  hideLeafText(root, "Personal CLARA support");
  hideLeafText(
    root,
    "Use your session to review your CLARA setup, discuss a money concern, understand your progress, or decide your next practical step.",
  );

  root.querySelectorAll('[aria-label="Back to Monthly Support Session overview"]').forEach(
    (element) => {
      element.setAttribute("aria-label", "Back to Monthly Coaching overview");
    },
  );

  const title = Array.from(root.querySelectorAll("h1")).find(
    (element) => normalizeText(element.textContent) === "Monthly Coaching",
  );
  const hero = title?.closest("section");
  if (hero) {
    hero.style.minHeight = "0px";
  }
}

export function installMonthlyCoachingCopy() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraMonthlyCoachingCopyInstalled) return;
  window.__claraMonthlyCoachingCopyInstalled = true;

  let scheduled = false;
  const schedulePatch = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      patchMonthlyCoachingPage();
    });
  };

  schedulePatch();
  window.addEventListener("hashchange", schedulePatch);

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.body, { childList: true, subtree: true });
}
