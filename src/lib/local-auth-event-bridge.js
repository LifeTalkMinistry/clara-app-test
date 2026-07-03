import { GOOGLE_PLAY_ENTITLEMENT_EVENT } from "@/lib/local-google-play-entitlement";

export function withLocalAuthEvents(localFacade) {
  if (!localFacade?.auth || typeof window === "undefined") return localFacade;

  const listeners = new Set();
  const originalSubscribe = localFacade.auth.onAuthStateChange.bind(localFacade.auth);

  localFacade.auth.onAuthStateChange = (callback) => {
    listeners.add(callback);
    const original = originalSubscribe(callback);

    return {
      data: {
        subscription: {
          unsubscribe() {
            listeners.delete(callback);
            original?.data?.subscription?.unsubscribe?.();
          },
        },
      },
    };
  };

  const notify = async (event = "USER_UPDATED") => {
    const { data } = await localFacade.auth.refreshSession();
    const session = data?.session || null;
    for (const listener of listeners) {
      try {
        listener(event, session);
      } catch (error) {
        console.warn("[CLARA Local Identity] auth event listener failed", error);
      }
    }
  };

  window.addEventListener(GOOGLE_PLAY_ENTITLEMENT_EVENT, () => {
    notify("USER_UPDATED");
  });
  window.addEventListener("clara-local-profile-updated", () => {
    notify("USER_UPDATED");
  });

  return localFacade;
}
