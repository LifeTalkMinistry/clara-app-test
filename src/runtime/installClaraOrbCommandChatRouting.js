import { CLARA_ORB_COMMAND_SELECT_EVENT } from "../lib/clara-orb-command-ring.js";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "../lib/clara-pause-events.js";

const RUNTIME_KEY = "__claraOrbCommandChatRoutingRuntime__";

function installClaraOrbCommandChatRouting() {
  if (typeof window === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  const handleCommandSelect = (event) => {
    const commandId = String(event?.detail?.commandId || "").trim();
    if (commandId !== "log-expense") return;

    const requestId = `clara-orb-log-expense-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.dispatchEvent(
      new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
        detail: {
          requestId,
          source: "clara-orb-page",
          mode: "log-expense",
          commandId,
        },
      })
    );
  };

  window.addEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleCommandSelect);

  window[RUNTIME_KEY] = {
    destroy() {
      window.removeEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleCommandSelect);
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbCommandChatRouting();
