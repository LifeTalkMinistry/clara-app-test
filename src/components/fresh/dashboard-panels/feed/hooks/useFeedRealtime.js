import { useEffect } from "react";
import { claraData } from "@/lib/clara-data-client";

export default function useFeedRealtime(fetchFeedPosts) {
  useEffect(() => {
    const channel = claraData
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
      claraData.removeChannel(channel);
    };
  }, [fetchFeedPosts]);
}
