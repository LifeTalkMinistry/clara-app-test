const MODAL_ID = "clara-profile-under-construction-modal";
const STYLE_ID = "clara-profile-under-construction-style";
const PROFILE_SELECTOR =
  '.clara-community-shell-header a[aria-label="Open Community profile"]';

let installed = false;
let previousBodyOverflow = "";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgba(2, 8, 23, .76);
      -webkit-backdrop-filter: blur(13px);
      backdrop-filter: blur(13px);
      animation: claraProfileBackdropIn .16s ease-out both;
    }
    #${MODAL_ID} .clara-profile-construction-card {
      position: relative;
      width: min(100%, 380px);
      overflow: hidden;
      border: 1px solid rgba(113, 244, 234, .18);
      border-radius: 30px;
      padding: 32px 24px 24px;
      color: #fff;
      text-align: center;
      background:
        radial-gradient(circle at 50% 0%, rgba(43,225,216,.14), transparent 34%),
        radial-gradient(circle at 88% 12%, rgba(99,86,232,.14), transparent 34%),
        linear-gradient(180deg, #0a1830 0%, #071225 100%);
      box-shadow: 0 28px 90px rgba(0,0,0,.58), 0 0 42px rgba(43,225,216,.08);
      animation: claraProfileCardIn .2s cubic-bezier(.2,.8,.2,1) both;
    }
    #${MODAL_ID} .clara-profile-construction-close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 999px;
      background: rgba(255,255,255,.04);
      color: rgba(255,255,255,.62);
      font: 300 22px/1 system-ui, sans-serif;
      cursor: pointer;
    }
    #${MODAL_ID} .clara-profile-construction-close:hover {
      background: rgba(255,255,255,.08);
      color: #fff;
    }
    #${MODAL_ID} .clara-profile-construction-icon {
      width: 66px;
      height: 66px;
      margin: 0 auto;
      display: grid;
      place-items: center;
      border: 1px solid rgba(94,234,212,.18);
      border-radius: 22px;
      background: rgba(11,32,52,.92);
      box-shadow: 0 0 32px rgba(43,225,216,.12);
    }
    #${MODAL_ID} .clara-profile-construction-icon svg {
      width: 29px;
      height: 29px;
      fill: none;
      stroke: rgba(143,255,248,.84);
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #${MODAL_ID} .clara-profile-construction-kicker {
      margin: 20px 0 0;
      color: rgba(143,255,248,.5);
      font: 900 10px/1.2 system-ui, sans-serif;
      letter-spacing: .24em;
      text-transform: uppercase;
    }
    #${MODAL_ID} .clara-profile-construction-title {
      margin: 8px 0 0;
      color: #fff;
      font: 900 27px/1.08 system-ui, sans-serif;
      letter-spacing: -.04em;
    }
    #${MODAL_ID} .clara-profile-construction-copy {
      max-width: 282px;
      margin: 12px auto 0;
      color: rgba(255,255,255,.5);
      font: 650 13px/1.75 system-ui, sans-serif;
    }
    #${MODAL_ID} .clara-profile-construction-note {
      margin-top: 22px;
      padding: 12px 14px;
      border: 1px solid rgba(94,234,212,.1);
      border-radius: 16px;
      background: rgba(94,234,212,.045);
      color: rgba(143,255,248,.6);
      font: 900 10px/1.35 system-ui, sans-serif;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    #${MODAL_ID} .clara-profile-construction-cta {
      width: 100%;
      height: 48px;
      margin-top: 18px;
      border: 1px solid rgba(105,240,231,.22);
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(37,191,212,.3), rgba(99,86,232,.3));
      color: #fff;
      font: 900 14px/1 system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(42,104,180,.16);
    }
    #${MODAL_ID} .clara-profile-construction-cta:hover {
      border-color: rgba(105,240,231,.4);
      background: linear-gradient(135deg, rgba(37,191,212,.4), rgba(99,86,232,.4));
    }
    @keyframes claraProfileBackdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes claraProfileCardIn {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #${MODAL_ID},
      #${MODAL_ID} .clara-profile-construction-card { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function closeProfileModal() {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  modal.remove();
  document.body.style.overflow = previousBodyOverflow;
  document.removeEventListener("keydown", onModalKeyDown, true);
}

function onModalKeyDown(event) {
  if (event.key === "Escape") closeProfileModal();
}

function openProfileModal() {
  if (document.getElementById(MODAL_ID)) return;
  ensureStyle();

  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "clara-profile-construction-title");
  modal.innerHTML = `
    <section class="clara-profile-construction-card">
      <button class="clara-profile-construction-close" type="button" aria-label="Close Profile notice">×</button>
      <div class="clara-profile-construction-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M14.7 6.3a4 4 0 0 0-5-5L7.6 3.4l3 3-4.3 4.3a2 2 0 0 0 0 2.8l4.2 4.2a2 2 0 0 0 2.8 0l4.3-4.3 3 3 2.1-2.1a4 4 0 0 0-5-5" transform="scale(.82) translate(1.8 1.8)" />
          <path d="M5 19l-2 2" />
        </svg>
      </div>
      <p class="clara-profile-construction-kicker">CLARA PROFILE</p>
      <h2 id="clara-profile-construction-title" class="clara-profile-construction-title">Under Construction</h2>
      <p class="clara-profile-construction-copy">We’re rebuilding Profile for a more personal CLARA experience. It isn’t part of the current release yet.</p>
      <div class="clara-profile-construction-note">Coming in a future CLARA update</div>
      <button class="clara-profile-construction-cta" type="button">Got it</button>
    </section>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeProfileModal();
  });
  modal.querySelector(".clara-profile-construction-close")?.addEventListener("click", closeProfileModal);
  modal.querySelector(".clara-profile-construction-cta")?.addEventListener("click", closeProfileModal);

  document.body.appendChild(modal);
  document.addEventListener("keydown", onModalKeyDown, true);
  modal.querySelector(".clara-profile-construction-close")?.focus();
}

function isProfileHash() {
  const hash = window.location.hash || "";
  if (!hash.includes("/community")) return false;
  const query = hash.split("?")[1] || "";
  return new URLSearchParams(query).get("view") === "profile";
}

function blockDirectProfileRoute() {
  if (!isProfileHash()) return;

  const hash = window.location.hash || "#/community?view=profile";
  const [pathPart, query = ""] = hash.split("?");
  const params = new URLSearchParams(query);
  params.set("view", "home");
  params.delete("learning");

  window.location.hash = `${pathPart}?${params.toString()}`;
  window.setTimeout(openProfileModal, 0);
}

function onProfileClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const profileLink = target?.closest(PROFILE_SELECTOR);
  if (!profileLink) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  openProfileModal();
}

export function installProfileUnderConstructionModal() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  document.addEventListener("click", onProfileClick, true);
  window.addEventListener("hashchange", blockDirectProfileRoute);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", blockDirectProfileRoute, { once: true });
  } else {
    blockDirectProfileRoute();
  }
}

installProfileUnderConstructionModal();
