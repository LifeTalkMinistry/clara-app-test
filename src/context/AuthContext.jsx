// (ONLY showing relevant change applied)
import { clearAccessSnapshot } from "@/lib/offline-access-cache";

// inside signOut
const signOut = async () => {
  await supabase.auth.signOut();

  // 🔥 IMPORTANT: clear saved offline access
  try {
    clearAccessSnapshot(user?.id || user?.email);
  } catch (e) {
    console.warn("Failed to clear offline snapshot", e);
  }

  initializedRef.current = true;
  profileRefreshRunIdRef.current += 1;
  setUser(null);
  setSession(null);
  setProfile(null);
  setLoading(false);
  setAuthReady(true);
};