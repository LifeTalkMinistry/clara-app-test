const KEY = "clara_behavioral_memory_v1";

const LAYERS = {
  1: ["LEVEL 1", "Core Identity", "Your current life situation and pressure points."],
  2: ["LEVEL 2", "Behavioral Spending Profile", "How emotions, habits, and triggers shape spending."],
  3: ["LEVEL 3", "Life Pattern Intelligence", "How routine, sleep, energy, and environment affect spending."],
  4: ["LEVEL 4", "Financial Infrastructure", "Wallets, budgets, goals, obligations, and payday rhythm."],
};

function readMemory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function safe(value = "") {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function relativeTime(date) {
  const diff = Date.now() - new Date(date || Date.now()).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours <= 1) return "Updated recently";
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

function installStyles() {
  if (document.getElementById("clara-me-panel-style")) return;
  const style = document.createElement("style");
  style.id = "clara-me-panel-style";
  style.textContent = `
    .clara-me-memory-panel{margin-top:20px;margin-bottom:18px;border:1px solid rgba(110,231,183,.18);border-radius:28px;background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(6,182,212,.07),rgba(124,58,237,.11));padding:16px;box-shadow:0 20px 55px rgba(0,0,0,.25);color:white}.clara-me-memory-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}.clara-me-memory-orb{height:44px;width:44px;border-radius:18px;border:1px solid rgba(110,231,183,.24);background:rgba(110,231,183,.12);display:grid;place-items:center;font-size:21px;flex-shrink:0}.clara-me-memory-title{flex:1;min-width:0}.clara-me-memory-title p{font-size:11px;font-weight:900;letter-spacing:.2em;color:rgba(167,243,208,.78);text-transform:uppercase;margin:0}.clara-me-memory-title h2{font-size:20px;font-weight:900;margin:4px 0 0}.clara-me-memory-title span{display:block;margin-top:8px;color:rgba(203,213,225,.82);font-size:13px;line-height:1.6}.clara-me-count{display:inline-flex;gap:6px;align-items:center;margin-top:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:999px;padding:5px 10px;font-size:11px;color:rgba(255,255,255,.78)}
    .clara-me-layer{margin-top:10px;border:1px solid rgba(255,255,255,.10);border-radius:22px;background:rgba(255,255,255,.045);overflow:hidden}.clara-me-layer summary{cursor:pointer;list-style:none;padding:14px 15px;display:flex;justify-content:space-between;gap:12px;align-items:center}.clara-me-layer summary::-webkit-details-marker{display:none}.clara-me-layer summary p{font-size:10px;font-weight:900;letter-spacing:.18em;color:rgba(165,243,252,.65);margin:0}.clara-me-layer summary h3{font-size:15px;font-weight:900;margin:4px 0 0}.clara-me-layer summary span{display:block;font-size:12px;line-height:1.5;color:rgba(203,213,225,.66);margin-top:4px}.clara-me-layer summary b{border:1px solid rgba(110,231,183,.16);background:rgba(110,231,183,.1);color:rgb(209,250,229);border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800}
    .clara-me-list{border-top:1px solid rgba(255,255,255,.1);padding:12px 14px;display:grid;gap:9px}.clara-me-card{border:1px solid rgba(255,255,255,.1);background:rgba(2,6,23,.35);border-radius:18px;padding:12px}.clara-me-card-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.clara-me-card strong{display:block;font-size:13px;font-weight:800}.clara-me-card span{display:block;font-size:13px;line-height:1.55;color:rgba(226,232,240,.92);margin-top:6px}.clara-me-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.clara-me-meta-tag{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);border-radius:999px;padding:4px 8px;font-size:10px;color:rgba(226,232,240,.74)}
    .clara-me-actions{display:flex;gap:8px;margin-top:12px}.clara-me-btn{border:none;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:800;color:white;cursor:pointer}.clara-me-btn.pin{background:rgba(251,191,36,.18);border:1px solid rgba(251,191,36,.22)}.clara-me-btn.edit{background:rgba(14,165,233,.18);border:1px solid rgba(14,165,233,.22)}.clara-me-btn.remove{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.22)}
    .clara-me-empty{font-size:13px;color:rgba(203,213,225,.65);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;background:rgba(2,6,23,.24);line-height:1.6}
  `;
  document.head.appendChild(style);
}

function getProfileContainer() {
  return Array.from(document.querySelectorAll("div")).find((element) => {
    const className = String(element.className || "");
    const text = String(element.innerText || "");
    return className.includes("max-w-md") && text.includes("Personal Information") && text.includes("Account Identity");
  });
}

function attachActions(panel) {
  panel.querySelectorAll("[data-clara-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.claraRemove;
      window.CLARA_BEHAVIORAL_MEMORY?.removeItem?.(key);
    });
  });

  panel.querySelectorAll("[data-clara-pin]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.claraPin;
      window.CLARA_BEHAVIORAL_MEMORY?.togglePin?.(key);
    });
  });

  panel.querySelectorAll("[data-clara-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.claraEdit;
      const current = button.dataset.current || "";
      const next = window.prompt("Update what CLARA should remember:", current);
      if (!next || !next.trim()) return;
      window.CLARA_BEHAVIORAL_MEMORY?.updateItem?.(key, { value: next.trim(), source: "manual-edit" });
    });
  });
}

function renderPanel() {
  if (!String(window.location.hash || "").includes("/profile")) return;
  const container = getProfileContainer();
  if (!container) return;

  document.getElementById("clara-me-memory-panel")?.remove();

  const memory = readMemory();
  const allItems = Object.values(memory.items || {}).filter((item) => item?.value);
  const groups = { 1: [], 2: [], 3: [], 4: [] };

  allItems
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(b.pinned) - Number(a.pinned);
      return Number(b.weight || 0) - Number(a.weight || 0);
    })
    .forEach((item) => groups[item.layer || 2].push(item));

  const panel = document.createElement("section");
  panel.id = "clara-me-memory-panel";
  panel.className = "clara-me-memory-panel";
  panel.innerHTML = `
    <div class="clara-me-memory-head">
      <div class="clara-me-memory-orb">🧠</div>
      <div class="clara-me-memory-title">
        <p>CLARA MEMORY SYSTEM</p>
        <h2>CLARA’s Understanding of You</h2>
        <span>This is CLARA’s evolving behavioral understanding based on your conversations, patterns, emotions, pressure, and financial habits.</span>
        <div class="clara-me-count">${allItems.length} remembered details • ${relativeTime(memory.updatedAt)}</div>
      </div>
    </div>
    ${allItems.length ? Object.entries(LAYERS).map(([id, layer]) => `
      <details class="clara-me-layer" ${id === "1" ? "open" : ""}>
        <summary><div><p>${layer[0]}</p><h3>${layer[1]}</h3><span>${layer[2]}</span></div><b>${groups[id].length}</b></summary>
        <div class="clara-me-list">
          ${groups[id].length ? groups[id].map((item) => `
            <article class="clara-me-card">
              <div class="clara-me-card-top">
                <strong>${safe(item.label || item.key)}</strong>
                <div>${item.pinned ? "📌" : ""}</div>
              </div>
              <span>${safe(item.value)}</span>
              <div class="clara-me-meta">
                <div class="clara-me-meta-tag">Weight ${Number(item.weight || 1)}</div>
                <div class="clara-me-meta-tag">${safe(relativeTime(item.updatedAt))}</div>
                <div class="clara-me-meta-tag">${safe(item.source || "memory")}</div>
              </div>
              <div class="clara-me-actions">
                <button class="clara-me-btn pin" data-clara-pin="${safe(item.key)}">${item.pinned ? "Unpin" : "Pin"}</button>
                <button class="clara-me-btn edit" data-clara-edit="${safe(item.key)}" data-current="${safe(item.value)}">Edit</button>
                <button class="clara-me-btn remove" data-clara-remove="${safe(item.key)}">Remove</button>
              </div>
            </article>
          `).join("") : `<div class="clara-me-empty">Nothing saved in this layer yet.</div>`}
        </div>
      </details>
    `).join("") : `<div class="clara-me-empty">Nothing saved yet. Open Talk to CLARA and let CLARA understand your routines, emotional spending behavior, life patterns, and financial situation.</div>`}
  `;

  const personalInfo = Array.from(container.querySelectorAll("p")).find((p) => p.textContent.trim() === "Personal Information");
  const anchor = personalInfo?.closest("div");
  if (anchor) container.insertBefore(panel, anchor);
  else container.appendChild(panel);

  attachActions(panel);
}

export function installClaraMePanel() {
  if (typeof window === "undefined") return;
  installStyles();
  const run = () => window.requestAnimationFrame(renderPanel);
  run();
  window.addEventListener("hashchange", () => setTimeout(run, 160));
  window.addEventListener("clara-behavioral-memory-updated", () => setTimeout(run, 80));
  const root = document.getElementById("root");
  if (root) new MutationObserver(() => setTimeout(run, 120)).observe(root, { childList: true, subtree: true });
}

installClaraMePanel();
