import {
  CLARA_ACCOUNT_LINKING_ENABLED,
  CLARA_AUTH_ENABLED,
} from "@/config/claraFeatureFlags";

const LOCAL_EMAIL = "local@clara.app";

function findExactText(value) {
  return [...document.querySelectorAll("*")].filter(
    (node) => String(node.textContent || "").trim() === value
  );
}

function patch() {
  const localEmailNodes = findExactText(LOCAL_EMAIL);
  const localMode = localEmailNodes.length > 0;

  localEmailNodes.forEach((node) => {
    node.textContent = "Stored on this device";
  });

  if (!localMode) return;

  findExactText("Signed in as").forEach((node) => {
    node.textContent = "Status";
  });

  findExactText("Log out").forEach((button) => {
    if (button.parentElement) button.parentElement.style.display = "none";
  });

  const heading = findExactText("Your CLARA data is private")[0];
  const section = heading?.closest("section");
  if (!section || section.querySelector("#clara-link-local-data")) return;

  const button = document.createElement("button");
  button.id = "clara-link-local-data";
  button.type = "button";
  button.textContent = "Protect & link my data";
  button.className =
    "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950";
  button.onclick = () => {
    if (!CLARA_AUTH_ENABLED || !CLARA_ACCOUNT_LINKING_ENABLED) {
      window.alert(
        "Account linking is temporarily unavailable. Your current data remains safe on this device."
      );
      return;
    }
    window.location.hash = "#/login?intent=link-local-vault";
  };

  const details = [...section.querySelectorAll("button")].find((node) =>
    String(node.textContent || "").includes("View data details")
  );
  section.insertBefore(button, details || null);
}

export function installLocalVaultSettingsExperience() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      patch();
    });
  };
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("hashchange", schedule);
  schedule();
}
