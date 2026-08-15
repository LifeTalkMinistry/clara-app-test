import { useEffect, useMemo, useRef, useState } from "react";
import useClaraSupport from "@/hooks/useClaraSupport";
import {
  DEFAULT_CLARA_LIFE_PROFILE,
  normalizeClaraLifeProfile,
  readClaraLifeProfile,
  saveClaraLifeProfile,
} from "@/lib/clara-life-profile";
import {
  countClaraLifeProfileFields,
  getClaraLifeContextAccess,
  updateClaraLifeProfileField,
} from "@/lib/clara-life-context";
import { normalizeSupportTier } from "@/lib/clara-support";

export default function useClaraBuyCheckLifeContext(user) {
  const supportState = useClaraSupport(user);
  const [profile, setProfile] = useState(() => normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Loading private profile...");
  const saveTimerRef = useRef(null);

  const supportTier = useMemo(() => {
    if (!supportState.isActive) return null;
    return normalizeSupportTier(supportState.record?.tier);
  }, [supportState.isActive, supportState.record?.tier]);

  const access = useMemo(() => getClaraLifeContextAccess(supportTier), [supportTier]);
  const filledCount = useMemo(
    () => countClaraLifeProfileFields(profile, supportTier),
    [profile, supportTier]
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoaded(false);
      setSaveState("Loading private profile...");
      try {
        const stored = await readClaraLifeProfile(user);
        if (!mounted) return;
        setProfile(stored);
        setSaveState("Saved privately on this device");
      } catch (error) {
        console.warn("[CLARA Life Context] Profile load failed safely.", error);
        if (!mounted) return;
        setProfile(normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
        setSaveState("Private profile ready on this device");
      } finally {
        if (mounted) setLoaded(true);
      }
    }

    load();
    return () => {
      mounted = false;
      if (saveTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return undefined;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaveState("Saving private context...");

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const saved = await saveClaraLifeProfile(user, profile);
        setSaveState("Saved privately on this device");
        window.dispatchEvent(new CustomEvent("clara:life-profile-updated", {
          detail: { profile: saved?.profile || profile, source: "buy-check-life-profile" },
        }));
      } catch (error) {
        console.warn("[CLARA Life Context] Profile save failed safely.", error);
        setSaveState("Could not save yet. Try again in a moment.");
      }
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [loaded, profile, user]);

  const updateField = (key, value) => {
    setProfile((current) => updateClaraLifeProfileField(current, key, value));
  };

  return {
    profile,
    updateField,
    loaded,
    saveState,
    supportTier,
    supportLoading: supportState.loading,
    access,
    filledCount,
  };
}
