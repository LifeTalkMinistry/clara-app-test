import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hasAccess } from "@/lib/accessControl";

export default function useAccess() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    load();
  }, []);

  return {
    profile,
    loading,
    can: (feature) => hasAccess(profile, feature),
  };
}