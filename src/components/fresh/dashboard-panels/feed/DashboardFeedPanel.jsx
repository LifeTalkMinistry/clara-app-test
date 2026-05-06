import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Play,
  Image as ImageIcon,
  Plus,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

const FEED_STORAGE_BUCKET = "feed-media";

const FEED_CATEGORIES = [
  { key: "achievement", label: "Achievement" },
  { key: "testimony", label: "Testimony" },
  { key: "advice", label: "Advice" },
  { key: "question", label: "Question" },
  { key: "motivation", label: "Motivation" },
  { key: "thought", label: "Thought" },
];

const createFeedUuid = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x"
        ? random
        : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
};

const formatFeedTime = (dateString) => {
  if (!dateString) return "Just now";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diff = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
};

export default function DashboardFeedPanel() {
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("You");

  const [newPost, setNewPost] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("achievement");

  const [error, setError] = useState("");

  const fetchFeedUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUser(user || null);

      if (!user) {
        setCurrentUserName("You");
        return null;
      }

      const fallbackName =
        user.user_metadata?.display_name ||
        user.user_metadata?.nickname ||
        user.email?.split("@")?.[0] ||
        "You";

      setCurrentUserName(fallbackName);

      return user;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const mapFeedPost = useCallback((row) => {
    return {
      id: row.id,
      author_id: row.author_id || null,
      author_name: row.author_name || "CLARA User",
      content: row.content || "",
      category: row.category || "thought",
      likes: Number(row.likes || 0),
      liked_by: Array.isArray(row.liked_by)
        ? row.liked_by
        : [],
      comments: [],
      media:
        row.media_type && row.media_url
          ? {
              type: row.media_type,
              url: row.media_url,
              path: row.media_path,
              name: row.media_name,
            }
          : null,
      created_at:
        row.created_at || new Date().toISOString(),
    };
  }, []);

  const fetchFeedPosts = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setPosts((data || []).map(mapFeedPost));
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to load feed right now."
      );
    } finally {
      setLoading(false);
    }
  }, [mapFeedPost]);

  useEffect(() => {
    fetchFeedUser();
    fetchFeedPosts();

    const channel = supabase
      .channel("dashboard-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_posts",
        },
        () => {
          fetchFeedPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFeedPosts, fetchFeedUser]);

  const handlePost = async () => {
    const content = newPost.trim();

    if (!content) return;

    setPosting(true);
    setError("");

    try {
      const user =
        currentUser || (await fetchFeedUser());

      if (!user?.id) {
        throw new Error(
          "Please login again before posting."
        );
      }

      const payload = {
        id: createFeedUuid(),
        author_id: user.id,
        author_name:
          currentUserName ||
          user.email?.split("@")?.[0] ||
          "You",
        content,
        category: selectedCategory,
        likes: 0,
        liked_by: [],
      };

      const { data, error } = await supabase
        .from("feed_posts")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setPosts((prev) => [
          mapFeedPost(data),
          ...prev,
        ]);
      }

      setNewPost("");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to post right now."
      );
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post) => {
    const likerId = currentUser?.id;

    if (!likerId) return;

    const alreadyLiked =
      Array.isArray(post.liked_by) &&
      post.liked_by.includes(likerId);

    const nextLikedBy = alreadyLiked
      ? post.liked_by.filter(
          (id) => id !== likerId
        )
      : [...(post.liked_by || []), likerId];

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? {
              ...item,
              liked_by: nextLikedBy,
              likes: nextLikedBy.length,
            }
          : item
      )
    );

    await supabase
      .from("feed_posts")
      .update({
        liked_by: nextLikedBy,
        likes: nextLikedBy.length,
      })
      .eq("id", post.id);
  };

  const handleDelete = async (post) => {
    if (post.author_id !== currentUser?.id) {
      return;
    }

    try {
      await supabase
        .from("feed_posts")
        .delete()
        .eq("id", post.id);

      setPosts((prev) =>
        prev.filter((item) => item.id !== post.id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/15 bg-white/[0.05] p-4 backdrop-blur-xl">
        <textarea
          value={newPost}
          onChange={(e) =>
            setNewPost(e.target.value)
          }
          placeholder="Share something..."
          maxLength={280}
          className="min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value)
            }
            className="rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm text-white"
          >
            {FEED_CATEGORIES.map((item) => (
              <option
                key={item.key}
                value={item.key}
              >
                {item.label}
              </option>
            ))}
          </select>

          <button
            onClick={handlePost}
            disabled={posting}
            className="rounded-2xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white"
          >
            {posting ? "Posting..." : "Post"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-white/15 bg-white/[0.05] p-6 text-center text-white/60">
          Loading feed...
        </div>
      ) : null}

      {posts.map((post) => {
        const liked =
          currentUser?.id &&
          post.liked_by.includes(currentUser.id);

        return (
          <div
            key={post.id}
            className="rounded-[28px] border border-white/15 bg-white/[0.05] p-4 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {post.author_name}
                </p>

                <p className="mt-1 text-xs text-white/45">
                  {formatFeedTime(post.created_at)}
                </p>
              </div>

              {post.author_id === currentUser?.id ? (
                <button
                  onClick={() =>
                    handleDelete(post)
                  }
                  className="text-white/45 transition hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/85">
              {post.content}
            </p>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() =>
                  handleLike(post)
                }
                className={`flex items-center gap-2 text-sm transition ${
                  liked
                    ? "text-rose-300"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Heart className="h-4 w-4" />
                {post.likes}
              </button>

              <button className="flex items-center gap-2 text-sm text-white/60">
                <MessageCircle className="h-4 w-4" />
                {post.comments.length}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
