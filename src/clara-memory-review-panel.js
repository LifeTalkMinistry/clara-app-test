import {
  MEMORY_CABINET_DEFINITIONS,
  readMemoryCabinet,
  removeMemoryFromCabinet,
  getMemoryCabinetStats,
} from "@/lib/memory-cabinets";

const PANEL_ID = "clara-memory-review-panel";
const BUTTON_ID = "clara-memory-review-button";

function isEnabled() {
  if (typeof window === "undefined") return false;

  try {
    return (
      import.meta.env.DEV ||
      import.meta.env.VITE_CLARA_DEBUG_AI === "true" ||
      window.localStorage?.getItem("CLARA_DEBUG_AI") === "true" ||
      window.localStorage?.getItem("CLARA_DEBUG_AI") === "1" ||
      window.localStorage?.getItem("CLARA_MEMORY_REVIEW_PANEL") === "true"
    );
  } catch {
    return false;
  }
}

function safeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function moneyDate(value = "") {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value || "");
  }
}

function removeExistingPanel() {
  document.getElementById(PANEL_ID)?.remove();
}

function memoryCard(memory = {}, cabinetName = "") {
  const count = Number(memory.occurrenceCount || 1);
  const strength = safeText(memory.patternStrength) || (count >= 3 ? "repeated" : count >= 2 ? "emerging" : "new");
  const signals = Array.isArray(memory.signals) ? memory.signals.slice(0, 4) : [];

  return `
    <article class="clara-memory-review-card" data-memory-id="${memory.id}" data-cabinet-name="${cabinetName}">
      <div class="clara-memory-review-card-top">
        <span>${strength}</span>
        <span>${count}x</span>
      </div>
      <p class="clara-memory-review-summary">${safeText(memory.summary)}</p>
      ${signals.length ? `<p class="clara-memory-review-signals">${signals.map(safeText).join(" · ")}</p>` : ""}
      <div class="clara-memory-review-meta">
        <span>First: ${moneyDate(memory.firstSeenAt || memory.createdAt)}</span>
        <span>Last: ${moneyDate(memory.lastSeenAt || memory.updatedAt)}</span>
      </div>
      <button type="button" class="clara-memory-review-delete" data-memory-id="${memory.id}" data-cabinet-name="${cabinetName}">Delete memory</button>
    </article>
  `;
}

function renderPanel(activeCabinet = "Spending Memory") {
  const stats = getMemoryCabinetStats();
  const selected = stats.find((item) => item.name === activeCabinet)?.name || stats[0]?.name || "Spending Memory";
  const memories = readMemoryCabinet(selected);
  const total = stats.reduce((sum, item) => sum + Number(item.count || 0), 0);

  return `
    <div id="${PANEL_ID}" class="clara-memory-review-shell" role="dialog" aria-label="CLARA Memory Review Panel">
      <div class="clara-memory-review-backdrop" data-close-memory-review="true"></div>
      <section class="clara-memory-review-panel">
        <header class="clara-memory-review-header">
          <div>
            <p>CLARA Internal</p>
            <h2>Memory Review</h2>
            <span>${total} saved memory pattern${total === 1 ? "" : "s"}</span>
          </div>
          <button type="button" data-close-memory-review="true" aria-label="Close memory review">×</button>
        </header>

        <nav class="clara-memory-review-tabs" aria-label="Memory cabinets">
          ${stats
            .map(
              (cabinet) => `
                <button type="button" data-cabinet-tab="${cabinet.name}" class="${cabinet.name === selected ? "active" : ""}">
                  <span>${cabinet.name.replace(" Memory", "")}</span>
                  <b>${cabinet.count}</b>
                </button>
              `
            )
            .join("")}
        </nav>

        <main class="clara-memory-review-list">
          ${memories.length
            ? memories.map((memory) => memoryCard(memory, selected)).join("")
            : `<div class="clara-memory-review-empty">No saved memories in ${selected} yet.</div>`}
        </main>
      </section>
    </div>
  `;
}

function injectStyles() {
  if (document.getElementById("clara-memory-review-styles")) return;

  const style = document.createElement("style");
  style.id = "clara-memory-review-styles";
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed;
      left: 18px;
      bottom: 112px;
      z-index: 360;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 999px;
      background: rgba(8,18,31,.72);
      color: rgba(224,255,246,.92);
      padding: 10px 13px;
      font: 800 11px/1 system-ui, sans-serif;
      letter-spacing: .12em;
      text-transform: uppercase;
      box-shadow: 0 18px 50px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.12);
      backdrop-filter: blur(18px);
    }
    .clara-memory-review-shell { position: fixed; inset: 0; z-index: 420; display: flex; justify-content: center; align-items: flex-end; color: white; }
    .clara-memory-review-backdrop { position: absolute; inset: 0; background: rgba(2,6,23,.58); backdrop-filter: blur(5px); }
    .clara-memory-review-panel {
      position: relative;
      width: min(430px, 100vw);
      max-height: 88vh;
      overflow: hidden;
      border-radius: 32px 32px 0 0;
      border: 1px solid rgba(255,255,255,.12);
      background: linear-gradient(145deg, rgba(3,12,22,.95), rgba(19,34,55,.9));
      box-shadow: 0 -22px 90px rgba(0,0,0,.54), inset 0 1px 0 rgba(255,255,255,.10);
      backdrop-filter: blur(24px);
    }
    .clara-memory-review-header { display: flex; justify-content: space-between; gap: 16px; padding: 20px 20px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
    .clara-memory-review-header p { margin: 0 0 6px; color: rgba(125,211,252,.7); font: 900 10px/1 system-ui; letter-spacing: .22em; text-transform: uppercase; }
    .clara-memory-review-header h2 { margin: 0; font: 950 22px/1.05 system-ui; }
    .clara-memory-review-header span { display: block; margin-top: 7px; color: rgba(226,232,240,.68); font: 700 12px/1.4 system-ui; }
    .clara-memory-review-header button { width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: white; font-size: 24px; }
    .clara-memory-review-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,.07); }
    .clara-memory-review-tabs button { flex: 0 0 auto; border: 1px solid rgba(255,255,255,.09); border-radius: 999px; background: rgba(255,255,255,.045); color: rgba(226,232,240,.74); padding: 9px 11px; font: 800 11px/1 system-ui; }
    .clara-memory-review-tabs button.active { border-color: rgba(110,231,183,.35); background: rgba(45,212,191,.15); color: rgba(209,250,229,.98); box-shadow: 0 0 28px rgba(45,212,191,.13); }
    .clara-memory-review-tabs b { margin-left: 7px; color: rgba(255,255,255,.55); }
    .clara-memory-review-list { max-height: 58vh; overflow-y: auto; padding: 14px 14px 22px; }
    .clara-memory-review-card { margin-bottom: 10px; border: 1px solid rgba(255,255,255,.09); border-radius: 24px; background: rgba(255,255,255,.055); padding: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,.07); }
    .clara-memory-review-card-top { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px; color: rgba(110,231,183,.92); font: 900 10px/1 system-ui; text-transform: uppercase; letter-spacing: .16em; }
    .clara-memory-review-summary { margin: 0; color: rgba(248,250,252,.94); font: 750 13px/1.55 system-ui; }
    .clara-memory-review-signals { margin: 10px 0 0; color: rgba(125,211,252,.72); font: 700 11px/1.45 system-ui; }
    .clara-memory-review-meta { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; color: rgba(203,213,225,.52); font: 650 10.5px/1.4 system-ui; }
    .clara-memory-review-delete { margin-top: 12px; border: 1px solid rgba(248,113,113,.22); border-radius: 999px; background: rgba(127,29,29,.16); color: rgba(254,202,202,.84); padding: 8px 11px; font: 850 11px/1 system-ui; }
    .clara-memory-review-empty { border: 1px dashed rgba(255,255,255,.14); border-radius: 24px; padding: 28px 18px; text-align: center; color: rgba(226,232,240,.62); font: 800 13px/1.5 system-ui; }
  `;
  document.head.appendChild(style);
}

function openPanel(cabinetName = "Spending Memory") {
  if (!isEnabled()) return;
  injectStyles();
  removeExistingPanel();
  document.body.insertAdjacentHTML("beforeend", renderPanel(cabinetName));
}

function installButton() {
  if (!isEnabled() || document.getElementById(BUTTON_ID)) return;
  injectStyles();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Memory";
  button.setAttribute("aria-label", "Open CLARA memory review panel");
  button.addEventListener("click", () => openPanel());
  document.body.appendChild(button);
}

function installPanelEvents() {
  document.addEventListener("click", (event) => {
    const close = event.target?.closest?.("[data-close-memory-review]");
    if (close) {
      removeExistingPanel();
      return;
    }

    const tab = event.target?.closest?.("[data-cabinet-tab]");
    if (tab) {
      openPanel(tab.getAttribute("data-cabinet-tab"));
      return;
    }

    const deleteButton = event.target?.closest?.(".clara-memory-review-delete");
    if (deleteButton) {
      const id = deleteButton.getAttribute("data-memory-id");
      const cabinetName = deleteButton.getAttribute("data-cabinet-name");
      removeMemoryFromCabinet(cabinetName, id);
      openPanel(cabinetName);
    }
  });
}

export function installClaraMemoryReviewPanel() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.openClaraMemoryReviewPanel = openPanel;

  if (!isEnabled()) return;

  installPanelEvents();
  window.addEventListener("DOMContentLoaded", installButton);
  if (document.body) installButton();

  window.addEventListener("clara-memory-cabinet-updated", () => {
    if (document.getElementById(PANEL_ID)) openPanel(document.querySelector(".clara-memory-review-tabs .active")?.getAttribute("data-cabinet-tab") || "Spending Memory");
  });
}

installClaraMemoryReviewPanel();
