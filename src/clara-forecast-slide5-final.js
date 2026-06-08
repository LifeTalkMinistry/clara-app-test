import "./clara-forecast-slide9-final";

const NEEDS = "Not enough data to generate result";
const NO_LEAK = "No major leak detected";
const NO_DEBT = "No debt records found";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const moneyNumber = (value = "") => Number(clean(value).replace(/[^0-9.-]/g, "")) || 0;

function cardBy(title, eyebrow = "") {
  return Array.from(document.querySelectorAll(".clara-forecast-report-card")).find((card) => {
    const cardTitle = clean(card.querySelector("h3")?.textContent);
    const cardEyebrow = clean(card.querySelector(".clara-forecast-report-eyebrow")?.textContent);
    return cardTitle === title && (!eyebrow || cardEyebrow === eyebrow);
  });
}

function rowValue(card, label) {
  const target = clean(label).toLowerCase();
  const row = Array.from(card?.querySelectorAll?.(".clara-forecast-report-stat-row") || []).find((item) => {
    return clean(item.querySelector("span")?.textContent).toLowerCase() === target;
  });
  return clean(row?.querySelector("strong")?.textContent);
}

function setHero(card, value) {
  let hero = card.querySelector(".clara-forecast-report-hero");
  if (!hero) {
    hero = document.createElement("div");
    hero.className = "clara-forecast-report-hero";
    card.querySelector("h3")?.after(hero);
  }
  hero.textContent = value;
}

function setRows(card, rows) {
  const wrap = card.querySelector(".clara-forecast-report-stats");
  if (!wrap) return;
  wrap.replaceChildren(...rows.map(([label, value]) => {
    const row = document.createElement("div");
    const left = document.createElement("span");
    const right = document.createElement("strong");
    row.className = "clara-forecast-report-stat-row";
    left.textContent = label;
    right.textContent = value;
    row.append(left, right);
    return row;
  }));
}

function finalizeSlideFive() {
  const slide = cardBy("If Nothing Changes", "05 / BAD FUTURE PROJECTION");
  if (!slide || slide.dataset.slideFiveFinal === "true") return;

  const costSlide = cardBy("Cost of These Habits");
  const leakText = rowValue(costSlide, "Forecasted Leak Cost");
  const leakExists = leakText.includes("₱") && moneyNumber(leakText) > 0;
  const moneyLeft = rowValue(slide, "Projected Money Left") || NEEDS;
  const emergency = rowValue(slide, "Projected Emergency Fund") || NEEDS;
  const savings = rowValue(slide, "Projected Savings Progress") || NEEDS;
  const debtRaw = rowValue(slide, "Projected Debt Position");
  const directionRaw = rowValue(slide, "Financial Direction") || NEEDS;
  const hasProjection = moneyLeft !== NEEDS && moneyLeft !== "Not enough data yet";
  const debt = debtRaw.includes("₱") ? `${debtRaw.replace(/\s+remaining$/i, "")} remaining` : NO_DEBT;
  const direction = leakExists && directionRaw === "Improving"
    ? "Improving, but leaking"
    : leakExists && directionRaw === "Stable"
      ? "Stable, but leaking"
      : directionRaw;

  setHero(slide, hasProjection ? (leakExists ? `${leakText} Unfixed` : NO_LEAK) : NEEDS);
  setRows(slide, [
    ["Projected Money Left", moneyLeft],
    ["Projected Emergency Fund", emergency],
    ["Projected Savings Progress", savings],
    ["Projected Debt Position", debt],
    ["Leak Cost Carried Forward", leakExists ? leakText : NO_LEAK],
    ["Money Not Redirected", leakExists ? leakText : NO_LEAK],
    ["Financial Direction", hasProjection ? direction : NEEDS],
  ]);

  const body = slide.querySelector(".clara-forecast-report-body");
  if (body) {
    body.textContent = hasProjection
      ? "This is the unchanged path: your money may still move forward, but the same leak continues to reduce what could have gone to savings, emergency fund, or debt."
      : "CLARA needs more records before it can project what happens if current habits continue.";
  }

  slide.dataset.slideFiveFinal = "true";
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_SLIDE_FIVE_FINAL__) return;
  window.__CLARA_FORECAST_SLIDE_FIVE_FINAL__ = true;
  const run = () => requestAnimationFrame(finalizeSlideFive);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", run, true);
  run();
}

install();
