import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const normalizeString = (value) => String(value ?? "").trim();

const isTruthyActive = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

export default function useAdvertiserMenuAccess({ email, isAdvertiser }) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  const [state, setState] = useState({
    loading: false,
    totalAds: 0,
    activeAds: 0,
  });

  useEffect(() => {
    let cancelled = false;

    if (!normalizedEmail) {
      setState({
        loading: false,
        totalAds: 0,
        activeAds: 0,
      });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, loading: true }));

    const loadAds = async () => {
      const { data, error } = await supabase
        .from("billboards")
        .select("id, is_active")
        .eq("owner_email", normalizedEmail)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load advertiser menu access:", error);
        setState({
          loading: false,
          totalAds: 0,
          activeAds: 0,
        });
        return;
      }

      const items = data || [];
      setState({
        loading: false,
        totalAds: items.length,
        activeAds: items.filter((item) => isTruthyActive(item?.is_active)).length,
      });
    };

    loadAds();

    return () => {
      cancelled = true;
    };
  }, [normalizedEmail]);

  return useMemo(
    () => ({
      ...state,
      canAccessAds: Boolean(isAdvertiser) || state.totalAds > 0,
    }),
    [isAdvertiser, state]
  );
}
