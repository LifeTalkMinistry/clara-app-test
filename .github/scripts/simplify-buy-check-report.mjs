import { readFileSync, writeFileSync } from "node:fs";

const jsPath = "src/clara-buy-check-report-content-polish.js";
const cssPath = "src/clara-buy-check-report-content-polish.css";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing expected block: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected one block but found multiple: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let js = readFileSync(jsPath, "utf8");

const oldJsBlock = `function renderBullets(items = []) {
  return \`<ul class="clara-buy-check-card-bullets">\${items
    .filter(Boolean)
    .map((item) => \`<li>\${escapeHtml(item)}</li>\`)
    .join("")}</ul>\`;
}

function polishReportCards() {
  const report = document.querySelector("[data-clara-buy-check-report]");
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__;
  if (!report || !context) return;

  report.querySelectorAll("article").forEach((article) => {
    if (article.dataset.claraContentPolished === "true") return;

    const eyebrow = clean(article.querySelector("p")?.textContent || "");
    const kind = cardKindFromEyebrow(eyebrow);
    const cardData = limitCardData(kind, buildCardData(kind, context));
    if (!cardData) return;

    const title = article.querySelector("h3");
    const paragraphs = article.querySelectorAll("p");
    const body = paragraphs[1];
    const oldNote = paragraphs[2];

    if (title && cardData.title) title.textContent = cardData.title;
    if (body) body.textContent = cardData.body;
    if (oldNote) {
      oldNote.className = "clara-buy-check-card-points";
      oldNote.innerHTML = renderBullets(cardData.bullets);
    }

    article.dataset.claraContentPolished = "true";
  });
}
`;

const newJsBlock = `function getCardDetails(article) {
  try {
    const details = JSON.parse(article?.dataset.claraCardDetails || "[]");
    return safeArray(details).map(clean).filter(Boolean);
  } catch {
    return [];
  }
}

function getActiveReportCard(report) {
  const cards = Array.from(report?.querySelectorAll("article") || []);
  if (!cards.length) return null;

  const track = cards[0].parentElement;
  if (!track) return cards[0];

  const viewportCenter = track.scrollLeft + track.clientWidth / 2;
  return cards.reduce((closest, card) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const closestCenter = closest.offsetLeft + closest.offsetWidth / 2;
    return Math.abs(cardCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter)
      ? card
      : closest;
  }, cards[0]);
}

function closeReportDetails(report) {
  report?.querySelector("[data-clara-buy-check-details-dialog]")?.remove();
}

function updateDetailsButton(report) {
  const button = report?.querySelector("[data-clara-buy-check-details-button]");
  const activeCard = getActiveReportCard(report);
  const details = getCardDetails(activeCard);
  if (!button) return;

  button.hidden = details.length === 0;
  const title = clean(activeCard?.querySelector("h3")?.textContent || "this card");
  button.setAttribute("aria-label", \`View detailed explanation for \${title}\`);
}

function openReportDetails(report) {
  const activeCard = getActiveReportCard(report);
  const details = getCardDetails(activeCard);
  if (!activeCard || !details.length) return;

  closeReportDetails(report);

  const paragraphs = activeCard.querySelectorAll("p");
  const eyebrow = clean(paragraphs[0]?.textContent || "BUY CHECK DETAILS");
  const body = clean(paragraphs[1]?.textContent || "");
  const title = clean(activeCard.querySelector("h3")?.textContent || "Detailed explanation");
  const dialog = document.createElement("div");
  dialog.className = "clara-buy-check-details-dialog";
  dialog.dataset.claraBuyCheckDetailsDialog = "true";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", \`Detailed explanation for \${title}\`);
  dialog.innerHTML = \`
    <div class="clara-buy-check-details-sheet">
      <button type="button" class="clara-buy-check-details-close" data-clara-buy-check-details-close="true" aria-label="Close detailed explanation">×</button>
      <p class="clara-buy-check-details-eyebrow">\${escapeHtml(eyebrow)}</p>
      <h3>\${escapeHtml(title)}</h3>
      \${body ? \`<p class="clara-buy-check-details-summary">\${escapeHtml(body)}</p>\` : ""}
      <div class="clara-buy-check-details-list">
        \${details.map((item, index) => \`
          <div class="clara-buy-check-details-item">
            <span aria-hidden="true">\${String(index + 1).padStart(2, "0")}</span>
            <p>\${escapeHtml(item)}</p>
          </div>
        \`).join("")}
      </div>
    </div>
  \`;

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-clara-buy-check-details-close]")) {
      closeReportDetails(report);
    }
  });

  report.appendChild(dialog);
  requestAnimationFrame(() => dialog.querySelector("[data-clara-buy-check-details-close]")?.focus());
}

function ensureReportDetailsUi(report) {
  const section = report.querySelector(":scope > section") || report.querySelector("section");
  const cards = Array.from(report.querySelectorAll("article"));
  const track = cards[0]?.parentElement;
  if (!section || !cards.length) return;

  let button = report.querySelector("[data-clara-buy-check-details-button]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "clara-buy-check-details-button";
    button.dataset.claraBuyCheckDetailsButton = "true";
    button.innerHTML = \`
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 10.75v5.25"></path>
        <circle cx="12" cy="7.7" r="0.75" class="clara-buy-check-details-dot"></circle>
      </svg>
    \`;
    button.addEventListener("click", () => openReportDetails(report));
    section.appendChild(button);
  }

  if (track && track.dataset.claraDetailsTracking !== "true") {
    track.dataset.claraDetailsTracking = "true";
    let scrollFrame = 0;
    track.addEventListener("scroll", () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => updateDetailsButton(report));
    }, { passive: true });
  }

  updateDetailsButton(report);
}

function polishReportCards() {
  const report = document.querySelector("[data-clara-buy-check-report]");
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__;
  if (!report || !context) return;

  report.querySelectorAll("article").forEach((article) => {
    if (article.dataset.claraContentPolished === "true") return;

    const eyebrow = clean(article.querySelector("p")?.textContent || "");
    const kind = cardKindFromEyebrow(eyebrow);
    const cardData = limitCardData(kind, buildCardData(kind, context));
    if (!cardData) return;

    const title = article.querySelector("h3");
    const paragraphs = article.querySelectorAll("p");
    const body = paragraphs[1];
    const oldNote = paragraphs[2];

    if (title && cardData.title) title.textContent = cardData.title;
    if (body) body.textContent = cardData.body;

    article.dataset.claraCardDetails = JSON.stringify(safeArray(cardData.bullets));
    if (oldNote) {
      oldNote.className = "clara-buy-check-card-points";
      oldNote.hidden = true;
      oldNote.setAttribute("aria-hidden", "true");
      oldNote.textContent = "";
    }

    article.dataset.claraContentPolished = "true";
  });

  ensureReportDetailsUi(report);
}
`;

js = replaceOnce(js, oldJsBlock, newJsBlock, "report card detail rendering");

const oldInstallBlock = `  const observer = new MutationObserver(() => polishReportCards());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  polishReportCards();
}`;

const newInstallBlock = `  const observer = new MutationObserver(() => polishReportCards());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dialog = document.querySelector("[data-clara-buy-check-details-dialog]");
    if (!dialog) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    dialog.remove();
  }, true);

  polishReportCards();
}`;

js = replaceOnce(js, oldInstallBlock, newInstallBlock, "details Escape handler");
writeFileSync(jsPath, js);

let css = readFileSync(cssPath, "utf8");
const oldPointsCss = `[data-clara-buy-check-report] .clara-buy-check-card-points {
  margin-top: 16px !important;
  color: rgba(226, 244, 255, 0.84) !important;
}`;
const newPointsCss = `[data-clara-buy-check-report] .clara-buy-check-card-points {
  display: none !important;
}`;
css = replaceOnce(css, oldPointsCss, newPointsCss, "hide visible bullet area");

css += `

/* Progressive disclosure: keep report cards quiet, reveal full reasoning on demand. */
[data-clara-buy-check-report] .clara-buy-check-details-button {
  position: absolute;
  top: 13px;
  right: 13px;
  z-index: 4;
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(186, 230, 253, 0.24);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.18);
  color: rgba(224, 242, 254, 0.72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
}

[data-clara-buy-check-report] .clara-buy-check-details-button:hover,
[data-clara-buy-check-report] .clara-buy-check-details-button:focus-visible {
  border-color: rgba(165, 243, 252, 0.52);
  background: rgba(34, 211, 238, 0.1);
  color: rgba(236, 254, 255, 0.96);
  outline: none;
}

[data-clara-buy-check-report] .clara-buy-check-details-button:active {
  transform: scale(0.94);
}

[data-clara-buy-check-report] .clara-buy-check-details-button svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

[data-clara-buy-check-report] .clara-buy-check-details-button .clara-buy-check-details-dot {
  fill: currentColor;
  stroke: none;
}

[data-clara-buy-check-report] .clara-buy-check-details-dialog {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 18px;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(13px);
  -webkit-backdrop-filter: blur(13px);
}

[data-clara-buy-check-report] .clara-buy-check-details-sheet {
  position: relative;
  width: min(100%, 380px);
  max-height: min(76vh, 650px);
  overflow-y: auto;
  border: 1px solid rgba(186, 230, 253, 0.18);
  border-radius: 28px;
  background: linear-gradient(155deg, rgba(8, 47, 73, 0.97), rgba(30, 27, 75, 0.98) 62%, rgba(15, 23, 42, 0.99));
  padding: 24px 20px 22px;
  color: rgba(248, 250, 252, 0.96);
  text-align: left;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.46), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

[data-clara-buy-check-report] .clara-buy-check-details-close {
  position: absolute;
  top: 15px;
  right: 15px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(241, 245, 249, 0.78);
  font-size: 22px;
  line-height: 1;
}

[data-clara-buy-check-report] .clara-buy-check-details-eyebrow {
  margin: 0;
  padding-right: 44px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(165, 243, 252, 0.62);
}

[data-clara-buy-check-report] .clara-buy-check-details-sheet h3 {
  margin: 9px 44px 0 0;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -0.02em;
}

[data-clara-buy-check-report] .clara-buy-check-details-summary {
  margin: 16px 0 0;
  font-size: 13.5px;
  line-height: 1.65;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.82);
}

[data-clara-buy-check-report] .clara-buy-check-details-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

[data-clara-buy-check-report] .clara-buy-check-details-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.045);
  padding: 12px;
}

[data-clara-buy-check-report] .clara-buy-check-details-item > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.1);
  color: rgba(153, 246, 228, 0.8);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

[data-clara-buy-check-report] .clara-buy-check-details-item > p {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.55;
  font-weight: 750;
  color: rgba(241, 245, 249, 0.88);
}

@media (min-width: 640px) {
  [data-clara-buy-check-report] .clara-buy-check-details-dialog {
    align-items: center;
  }
}
`;

writeFileSync(cssPath, css);

const finalJs = readFileSync(jsPath, "utf8");
const finalCss = readFileSync(cssPath, "utf8");
const requiredJs = [
  "data-clara-buy-check-details-button",
  "data-clara-buy-check-details-dialog",
  "article.dataset.claraCardDetails",
  "oldNote.hidden = true",
  "getActiveReportCard",
];
const forbiddenJs = ["oldNote.innerHTML = renderBullets"];
const requiredCss = [
  ".clara-buy-check-details-button",
  ".clara-buy-check-details-dialog",
  "display: none !important",
];

for (const marker of requiredJs) {
  if (!finalJs.includes(marker)) throw new Error(`Missing JS marker: ${marker}`);
}
for (const marker of forbiddenJs) {
  if (finalJs.includes(marker)) throw new Error(`Old visible bullet rendering remains: ${marker}`);
}
for (const marker of requiredCss) {
  if (!finalCss.includes(marker)) throw new Error(`Missing CSS marker: ${marker}`);
}

console.log("Buy Check report simplified with on-demand details.");
