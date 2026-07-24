import { withLocalAuthEvents } from "@/lib/local-auth-event-bridge";
import { createLocalSupabaseFacade } from "@/lib/local-supabase-facade";
import { withSettingsSupportCompatibility } from "@/lib/settings-support-compatibility";
import { signOutFromClaraBackend } from "@/lib/clara-backend-client";

// Compatibility exports for legacy data callers. Financial records remain device-local;
// account authentication and Settings support delivery are handled by the CLARA backend.
export const supabaseUrl = "";
export const supabaseAnonKey = "";
export const isSupabaseConfigured = false;

const localFacade = withSettingsSupportCompatibility(createLocalSupabaseFacade());
const localSignOut = localFacade.auth.signOut;
localFacade.auth.signOut = async () => {
  signOutFromClaraBackend();
  return localSignOut();
};

export const supabase = withLocalAuthEvents(localFacade);
