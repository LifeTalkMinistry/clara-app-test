import { supabase } from "@/lib/supabaseClient";

const ADMIN_RECOVERY_EMAILS = new Set([
  "jeromemirabuenos62@gmail.com",
  "lifetalkministry@gmail.com",
]);

function hasRecoveryEmailVisibleInSettings() {
  const bodyText = String(document.body?.textContent || "").toLowerCase();
  return [...ADMIN_RECOVERY_EMAILS].some((email) => bodyText.includes(email));
}

async function isCurrentUserAdmin() {
  try {
    if (hasRecoveryEmailVisibleInSettings()) return true;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return false;

    const email = String(user.email || "").trim().toLowerCase();
    if (ADMIN_RECOVERY_EMAILS.has(email)) return true;

    const { data } = await supabase
      .from("profiles")
      .select("role, plan, email")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(data?.role || "").trim().toLowerCase();
    const plan = String(data?.plan || "").trim().toLowerCase();
    const profileEmail = String(data?.email || "").trim().toLowerCase();

    return role === "admin" || plan === "admin" || ADMIN_RECOVERY_EMAILS.has(profileEmail);
  } catch (error) {
    console.warn("Admin check skipped:", error);
    return hasRecoveryEmailVisibleInSettings();
  }
}

function findCardByText(label) {
  const needle = String(label || "").trim().toLowerCase();
  if (!needle) return null;

  const candidates = Array.from(
    document.querySelectorAll("button, a, [role='button'], div")
  )
    .filter((element) => {
      const text = String(element.textContent || "").trim().toLowerCase();
      return text.includes(needle) && text.length <= 260;
    })
    .sort(
      (a, b) =>
        String(a.textContent || "").length - String(b.textContent || "").length
    );

  const match = candidates[0];
  if (!match) return null;

  return (
    match.closest("button") ||
    match.closest("a") ||
    match.closest("[role='button']") ||
    match.closest(".theme-panel-card") ||
    match.closest(".launcher-card") ||
    match.closest("[class*='rounded']") ||
    match
  );
}

function buildAdminSettingsButton(referenceCard) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "clara-settings-admin-shortcut";
  button.setAttribute("aria-label", "Open admin panel from settings");

  button.className = referenceCard?.className || "theme-panel-card";
  button.style.width = "100%";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.gap = "14px";
  button.style.marginTop = "12px";
  button.style.padding = "16px";
  button.style.borderRadius = "22px";
  button.style.border =
    "1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent)";
  button.style.background =
    "linear-gradient(180deg, color-mix(in srgb, var(--theme-card) 94%, transparent), color-mix(in srgb, var(--theme-card-alt) 94%, transparent))";
  button.style.color = "white";
  button.style.boxShadow = "0 18px 48px rgba(0, 0, 0, 0.22)";

  button.innerHTML = `
    <span style="display:flex;height:44px;width:44px;align-items:center;justify-content:center;border-radius:16px;background:rgba(16,185,129,.12);color:#86efac;flex-shrink:0;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      </svg>
    </span>
    <span style="min-width:0;flex:1;text-align:left;">
      <span style="display:block;font-size:14px;font-weight:700;color:white;">Admin Panel</span>
      <span style="margin-top:4px;display:block;font-size:12px;color:rgba(255,255,255,.55);">Manage CLARA platform controls.</span>
    </span>
    <span style="color:rgba(255,255,255,.35);font-size:20px;line-height:1;">›</span>
  `;

  button.addEventListener("click", () => {
    window.location.hash = "#/admin";
  });

  return button;
}

export function installSettingsAdminShortcutPatch() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  let disposed = false;
  let observer = null;
  let debounceTimer = null;

  const apply = async () => {
    if (disposed) return;

    const hash = String(window.location.hash || "").toLowerCase();
    const isSettingsPage = hash.includes("/settings");

    const existing = document.getElementById("clara-settings-admin-shortcut");
    if (!isSettingsPage) {
      existing?.remove();
      return;
    }

    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      existing?.remove();
      return;
    }

    const aboutCard = findCardByText("About CLARA");
    const logoutCard = findCardByText("Log out");
    const referenceCard = aboutCard || logoutCard;
    if (!referenceCard?.parentElement) return;

    if (existing) {
      if (aboutCard && existing.previousElementSibling !== aboutCard) {
        aboutCard.insertAdjacentElement("afterend", existing);
      }
      return;
    }

    const adminButton = buildAdminSettingsButton(referenceCard);

    if (aboutCard?.parentElement) {
      aboutCard.insertAdjacentElement("afterend", adminButton);
      return;
    }

    if (logoutCard?.parentElement) {
      logoutCard.insertAdjacentElement("beforebegin", adminButton);
    }
  };

  const scheduleApply = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      apply().catch((error) =>
        console.warn("Admin settings shortcut skipped:", error)
      );
    }, 120);
  };

  window.addEventListener("hashchange", scheduleApply);
  window.addEventListener("focus", scheduleApply);

  if (document.body) {
    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  scheduleApply();

  return () => {
    disposed = true;
    window.clearTimeout(debounceTimer);
    window.removeEventListener("hashchange", scheduleApply);
    window.removeEventListener("focus", scheduleApply);
    observer?.disconnect();
  };
}
