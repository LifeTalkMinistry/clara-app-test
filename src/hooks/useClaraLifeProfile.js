import { useEffect, useState } from "react";
import {
  DEFAULT_CLARA_LIFE_PROFILE,
  normalizeClaraLifeProfile,
  readClaraLifeProfile,
} from "@/lib/clara-life-profile";

const CLARA_LIFE_PROFILE_UPDATED_EVENT = "clara:life-profile-updated";

export default function useClaraLifeProfile(user = null) {
  const [lifeProfile, setLifeProfile] = useState(() =>
    normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE)
  );

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const storedProfile = await readClaraLifeProfile(user);
        if (!mounted) return;
        setLifeProfile(normalizeClaraLifeProfile(storedProfile));
      } catch (error) {
        console.warn("CLARA life profile read failed:", error);
        if (!mounted) return;
        setLifeProfile(normalizeClaraLifeProfile(DEFAULT_CLARA_LIFE_PROFILE));
      }
    };

    loadProfile();

    const handleProfileUpdate = (event) => {
      const nextProfile = event?.detail?.profile;
      if (!nextProfile) {
        loadProfile();
        return;
      }
      setLifeProfile(normalizeClaraLifeProfile(nextProfile));
    };

    if (typeof window !== "undefined") {
      window.addEventListener(CLARA_LIFE_PROFILE_UPDATED_EVENT, handleProfileUpdate);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(CLARA_LIFE_PROFILE_UPDATED_EVENT, handleProfileUpdate);
      }
    };
  }, [user?.id, user?.email]);

  return lifeProfile;
}
