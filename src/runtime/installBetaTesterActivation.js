import {
  normalizeBetaTesterCodeInput,
  redeemBetaTesterCode,
} from "@/lib/beta-tester-access-client";
import "./beta-tester-activation.css";

const SECTION_SELECTOR = "[data-clara-beta-tester-activation='true']";
const MEMBERSHIP_TITLE = "CLARA Committed Version";
const SCHEDULE_LABEL = "Schedule My Session";
let scanQueued = false;

function normalizedText(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function findButtonByText(root, label) {
  return Array.from(root?.querySelectorAll?.("button") || []).find(
    (button) => normalizedText(button) === label
  );
}

function findMembershipPanel() {
  const title = Array.from(document.querySelectorAll("p")).find(
    (node) => normalizedText(node) === MEMBERSHIP_TITLE
  );
  if (!title) return null;

  let candidate = title.parentElement;
  for (let depth = 0; candidate && depth < 7; depth += 1) {
    if (findButtonByText(candidate, SCHEDULE_LABEL)) return candidate;
    candidate = candidate.parentElement;
  }

  return null;
}

function createBetaTesterSection(panel) {
  if (!panel || panel.querySelector(SECTION_SELECTOR)) return;

  const scheduleButton = findButtonByText(panel, SCHEDULE_LABEL);
  const actionStack = scheduleButton?.parentElement;
  if (!scheduleButton || !actionStack) return;

  panel.classList.add("clara-beta-membership-panel");

  const section = document.createElement("section");
  section.dataset.claraBetaTesterActivation = "true";
  section.className = "clara-beta-tester-activation";
  section.innerHTML = `
    <div class="clara-beta-tester-badge">Founding Tester Access</div>
    <h4 class="clara-beta-tester-title">I’m a Beta Tester</h4>
    <p class="clara-beta-tester-copy">
      Enter the shared 6-character beta tester code to activate the Committed Version on this signed-in account.
    </p>
    <form class="clara-beta-tester-form" novalidate>
      <label class="clara-beta-tester-label" for="clara-beta-tester-code">
        Universal beta tester code
      </label>
      <input
        id="clara-beta-tester-code"
        class="clara-beta-tester-input"
        type="text"
        inputmode="text"
        autocomplete="off"
        autocapitalize="characters"
        maxlength="6"
        placeholder="ABC123"
        aria-describedby="clara-beta-tester-help clara-beta-tester-feedback"
        spellcheck="false"
      />
      <p id="clara-beta-tester-help" class="clara-beta-tester-help">
        Approved beta testers use the same code. Activation applies only to the account currently signed in.
      </p>
      <button class="clara-beta-tester-button" type="submit" disabled>
        Activate My Committed Version
      </button>
      <p id="clara-beta-tester-feedback" class="clara-beta-tester-feedback" aria-live="polite"></p>
    </form>
  `;

  const form = section.querySelector("form");
  const input = section.querySelector("input");
  const button = section.querySelector("button");
  const feedback = section.querySelector(".clara-beta-tester-feedback");

  input.addEventListener("input", () => {
    const normalized = normalizeBetaTesterCodeInput(input.value);
    if (input.value !== normalized) input.value = normalized;
    button.disabled = normalized.length !== 6;
    feedback.textContent = "";
    feedback.dataset.state = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = normalizeBetaTesterCodeInput(input.value);
    if (code.length !== 6 || button.dataset.loading === "true") return;

    button.dataset.loading = "true";
    button.disabled = true;
    button.textContent = "Activating…";
    feedback.textContent = "Securely checking the universal beta tester code…";
    feedback.dataset.state = "loading";

    try {
      await redeemBetaTesterCode(code);
      input.disabled = true;
      button.textContent = "Committed Version Activated ✓";
      feedback.textContent = "Welcome, Founding Beta Tester. Your account is now activated.";
      feedback.dataset.state = "success";

      window.setTimeout(() => {
        window.location.reload();
      }, 1100);
    } catch (error) {
      button.dataset.loading = "false";
      button.disabled = false;
      button.textContent = "Activate My Committed Version";
      feedback.textContent =
        error?.message || "CLARA could not activate this beta tester code.";
      feedback.dataset.state = "error";
      input.focus();
      input.select();
    }
  });

  actionStack.insertBefore(section, scheduleButton.nextSibling);
}

function scanForMembershipPanel() {
  scanQueued = false;
  createBetaTesterSection(findMembershipPanel());
}

function queueScan() {
  if (scanQueued || typeof window === "undefined") return;
  scanQueued = true;
  window.requestAnimationFrame(scanForMembershipPanel);
}

if (typeof document !== "undefined") {
  queueScan();

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
