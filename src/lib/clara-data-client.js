import { withLocalAuthEvents } from "@/lib/local-auth-event-bridge";
import { createLocalDataFacade } from "@/lib/local-data-facade";
import { withSettingsSupportCompatibility } from "@/lib/settings-support-compatibility";
import { signOutFromClaraBackend } from "@/lib/clara-backend-client";

// Provider-neutral compatibility client for local data callers. Financial records remain device-local;
// account authentication and Settings support delivery are handled by the CLARA backend.
export const isClaraDataConfigured = false;

const localFacade = withSettingsSupportCompatibility(createLocalDataFacade());
const localSignOut = localFacade.auth.signOut;
localFacade.auth.signOut = async () => {
  signOutFromClaraBackend();
  return localSignOut();
};

export const claraData = withLocalAuthEvents(localFacade);
