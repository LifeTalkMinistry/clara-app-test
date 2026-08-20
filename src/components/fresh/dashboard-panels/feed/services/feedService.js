import { claraData } from "@/lib/clara-data-client";

export async function fetchFeedPostsFromDB() {
  const { data, error } = await claraData
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function fetchFeedComments(postIds = []) {
  if (!postIds.length) return [];

  const { data, error } = await claraData
    .from("feed_comments")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}
