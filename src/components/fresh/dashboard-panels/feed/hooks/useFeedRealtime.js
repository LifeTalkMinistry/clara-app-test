import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function useFeedRealtime(fetchFeedPosts) {
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-full-feed-panel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_posts",
        },
        () => fetchFeedPosts(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_comments",
        },
        () => fetchFeedPosts(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeedPosts]);
}
