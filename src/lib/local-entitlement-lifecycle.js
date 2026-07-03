import { isLocalBetaMode } from "@/lib/clara-runtime-mode";
import { supabase } from "@/lib/supabaseClient";
import { syncGooglePlayEntitlement } from "@/lib/google-play-billing";

let started = false;
let activeCheck = null;
let lastCheckAt = 0;

async function runCheck(reason, force = false) {
  if (!isLocalBetaMode()) return null;
  if (activeCheck) return activeCheck;
  if (!force && Date.now() - lastCheckAt < 2500) return null;

  lastCheckAt = Date.now();
  activeCheck = (async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;

    return syncGooglePlayEntitlement({
      localUserId: data.user.id,
      reason,
    });
  })()
    .catch((error) => {
      console.warn("[CLARA Entitlement] lifecycle verification unavailable", {
        reason,
        code: error?.responseCode || error?.code || "UNKNOWN",
      });
      return null;
    })
    .finally(() => {
      activeCheck = null;
    });

  return activeCheck;
}

export function startLocalEntitlementLifecycle() {
  if (started || !isLocalBetaMode() || typeof window === "undefined") return;
  started = true;

  window.setTimeout(() => runCheck("app_launch", true), 0);

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      runCheck("app_resume");
    }
  };
  const onFocus = () => runCheck("app_resume");
  const onOnline = () => runCheck("billing_reconnected", true);

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);
}

export { runCheck as runLocalEntitlementCheck };
