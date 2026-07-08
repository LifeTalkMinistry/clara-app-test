import { withLocalAuthEvents } from "@/lib/local-auth-event-bridge";
import { createLocalSupabaseFacade } from "@/lib/local-supabase-facade";

// Compatibility exports for legacy callers. CLARA is intentionally local-only;
// no cloud client is initialized and no network request can originate here.
export const supabaseUrl = "";
export const supabaseAnonKey = "";
export const isSupabaseConfigured = false;

export const supabase = withLocalAuthEvents(createLocalSupabaseFacade());
