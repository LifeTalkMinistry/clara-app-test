import { supabase } from "@/lib/supabaseClient";

export async function fetchFeedPostsFromDB() {
  const { data, error } = await supabase
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function fetchFeedComments(postIds = []) {
  if (!postIds.length) return [];

  const { data, error } = await supabase
    .from("feed_comments")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}
