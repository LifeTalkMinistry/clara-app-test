import { useState, useEffect, useCallback } from "react";

import { createFeedUuid } from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";
import { getYoutubeId } from "@/components/fresh/dashboard-panels/feed/utils/youtubeHelpers";
import useFeedRealtime from "@/components/fresh/dashboard-panels/feed/hooks/useFeedRealtime";
import {
  fetchFeedPostsFromDB,
  fetchFeedComments,
} from "@/components/fresh/dashboard-panels/feed/services/feedService";
import { uploadFeedMedia } from "@/components/fresh/dashboard-panels/feed/services/feedMediaService";
import FeedComposer from "@/components/fresh/dashboard-panels/feed/components/FeedComposer";
import FeedPostCard from "@/components/fresh/dashboard-panels/feed/components/FeedPostCard";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardFeedPanel({ onBack }) {
  const FEED_STORAGE_BUCKET = "feed-media";


  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("You");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState("");

  const [newPost, setNewPost] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("achievement");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMedia, setComposerMedia] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [activeYoutubePosts, setActiveYoutubePosts] = useState({});

  useEffect(() => {
    setComposerOpen(false);
  }, []);

  const mapFeedPost = useCallback((row, comments = []) => {
    let media = null;

    if (row.media_type === "image" || row.media_type === "video") {
      media = {
        type: row.media_type,
        url: row.media_url,
        path: row.media_path,
        name: row.media_name,
        mimeType: row.media_mime_type,
      };
    }

    if (row.media_type === "youtube") {
      media = {
        type: "youtube",
        url: row.youtube_url,
        embedUrl: row.youtube_embed_url,
        youtubeId: row.youtube_id,
        thumbnailUrl: row.youtube_thumbnail_url,
        name: row.media_name || "YouTube video",
      };
    }

    return {
      id: row.id,
      author_id: row.author_id || null,
      author_name: row.author_name || "CLARA User",
      content: row.content || "",
      category: row.category || "achievement",
      likes: Number(row.likes || 0),
      liked_by: Array.isArray(row.liked_by) ? row.liked_by : [],
      comments: comments.map((comment) => ({
        id: comment.id,
        post_id: comment.post_id,
        author_id: comment.author_id || null,
        author_name: comment.author_name || "CLARA User",
        content: comment.content || "",
        created_at: comment.created_at || new Date().toISOString(),
      })),
      media,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || null,
    };
  }, []);

  const fetchFeedUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      setCurrentUser(user || null);

      if (!user) {
        setCurrentUserName("You");
        return null;
      }

      const fallbackName =
        user.user_metadata?.display_name ||
        user.user_metadata?.nickname ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")?.[0] ||
        "You";

      setCurrentUserName(fallbackName);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && profileData) {
        setCurrentUserName(profileData.full_name || fallbackName);
      }

      return user;
    } catch (userError) {
      console.error("Dashboard feed user fetch failed:", userError);
      setCurrentUser(null);
      setCurrentUserName("You");
      return null;
    }
  }, []);

  const fetchFeedPosts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const postsData = await fetchFeedPostsFromDB();
      const postIds = postsData.map((post) => post.id);
      const commentsData = await fetchFeedComments(postIds);

      const commentsByPostId = commentsData.reduce((acc, comment) => {
        if (!acc[comment.post_id]) acc[comment.post_id] = [];
        acc[comment.post_id].push(comment);
        return acc;
      }, {});

      setPosts(
        postsData.map((postRow) =>
          mapFeedPost(postRow, commentsByPostId[postRow.id] || [])
        )
      );
    } catch (feedError) {
      console.error("Dashboard feed fetch failed:", feedError);
      setError(feedError?.message || "Unable to load the feed right now.");
    } finally {
      setLoading(false);
    }
  }, [mapFeedPost]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await fetchFeedUser();
      if (mounted) await fetchFeedPosts(true);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [fetchFeedPosts, fetchFeedUser]);

  useFeedRealtime(fetchFeedPosts);

  useEffect(() => {
    return () => {
      if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
        URL.revokeObjectURL(composerMedia.previewUrl);
      }
    };
  }, [composerMedia]);

  const resetComposer = useCallback(() => {
    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setNewPost("");
    setSelectedCategory("achievement");
    setComposerMedia(null);
    setYoutubeLink("");
    setError("");
  }, [composerMedia]);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setYoutubeLink("");

    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    const supported =
      file.type?.startsWith("image/") || file.type?.startsWith("video/");

    if (!supported) {
      setError("Use an image or video file for the feed.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setComposerMedia({
      type: file.type.startsWith("video/") ? "video" : "image",
      url: previewUrl,
      previewUrl,
      name: file.name,
      mimeType: file.type,
      file,
    });
  }, [composerMedia]);

  const applyYoutubeLink = useCallback((rawValue = youtubeLink, options = {}) => {
    const trimmed = String(rawValue || "").trim();
    const youtubeId = getYoutubeId(trimmed);

    if (!youtubeId) {
      if (!options.silent) setError("Paste a valid YouTube video link.");
      return false;
    }

    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setError("");
    setComposerMedia({
      type: "youtube",
      url: trimmed,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      youtubeId,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      name: "YouTube video",
      file: null,
    });

    return true;
  }, [composerMedia, getYoutubeId, youtubeLink]);

  const handlePost = useCallback(async () => {
    const content = newPost.trim();

    if (!content && !composerMedia) return;

    if (content.length > 280) {
      setError("Post must be 280 characters or less.");
      return;
    }

    setPosting(true);
    setError("");

    try {
      const freshUser = currentUser || (await fetchFeedUser());

      if (!freshUser?.id) {
        throw new Error("Please log in again before posting.");
      }

      let mediaPayload = {
        media_type: null,
        media_url: null,
        media_path: null,
        media_name: null,
        media_mime_type: null,
        youtube_url: null,
        youtube_embed_url: null,
        youtube_id: null,
        youtube_thumbnail_url: null,
      };

      if (composerMedia?.type === "image" || composerMedia?.type === "video") {
        const uploaded = await uploadFeedMedia(composerMedia.file, freshUser.id, FEED_STORAGE_BUCKET);

        mediaPayload = {
          media_type: uploaded.type,
          media_url: uploaded.url,
          media_path: uploaded.path,
          media_name: uploaded.name,
          media_mime_type: uploaded.mimeType,
          youtube_url: null,
          youtube_embed_url: null,
          youtube_id: null,
          youtube_thumbnail_url: null,
        };
      }

      if (composerMedia?.type === "youtube") {
        mediaPayload = {
          media_type: "youtube",
          media_url: null,
          media_path: null,
          media_name: composerMedia.name || "YouTube video",
          media_mime_type: null,
          youtube_url: composerMedia.url || null,
          youtube_embed_url: composerMedia.embedUrl || null,
          youtube_id: composerMedia.youtubeId || null,
          youtube_thumbnail_url: composerMedia.thumbnailUrl || null,
        };
      }

      const insertPayload = {
        id: createFeedUuid(),
        author_id: freshUser.id,
        author_name: currentUserName || freshUser.email?.split("@")?.[0] || "You",
        content,
        category: selectedCategory,
        likes: 0,
        liked_by: [],
        ...mediaPayload,
      };

      const { data: insertedPost, error: insertError } = await supabase
        .from("feed_posts")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (insertedPost) {
        setPosts((prev) => [mapFeedPost(insertedPost, []), ...prev]);
      } else {
        await fetchFeedPosts(false);
      }

      resetComposer();
      setComposerOpen(false);
    } catch (postError) {
      console.error("Dashboard feed post failed:", postError);
      setError(postError?.message || "Unable to post right now.");
    } finally {
      setPosting(false);
    }
  }, [
    composerMedia,
    createFeedUuid,
    currentUser,
    currentUserName,
    fetchFeedPosts,
    fetchFeedUser,
    mapFeedPost,
    newPost,
    resetComposer,
    selectedCategory,
  ]);

  const handleLike = useCallback(async (post) => {
    const likerId = currentUser?.id;
    if (!likerId) {
      setError("Please log in again to like posts.");
      return;
    }

    const alreadyLiked = Array.isArray(post.liked_by)
      ? post.liked_by.includes(likerId)
      : false;

    const nextLikedBy = alreadyLiked
      ? post.liked_by.filter((id) => id !== likerId)
      : [...(post.liked_by || []), likerId];

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, liked_by: nextLikedBy, likes: nextLikedBy.length }
          : item
      )
    );

    const { error: likeError } = await supabase
      .from("feed_posts")
      .update({
        liked_by: nextLikedBy,
        likes: nextLikedBy.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (likeError) {
      console.error("Dashboard feed like failed:", likeError);
      await fetchFeedPosts(false);
    }
  }, [currentUser?.id, fetchFeedPosts]);

  const handleComment = useCallback(async (postId) => {
    const content = commentTexts[postId]?.trim();

    if (!content) return;

    setSavingComment(true);
    setError("");

    try {
      const freshUser = currentUser || (await fetchFeedUser());

      if (!freshUser?.id) {
        throw new Error("Please log in again before commenting.");
      }

      const commentPayload = {
        id: createFeedUuid(),
        post_id: postId,
        author_id: freshUser.id,
        author_name: currentUserName || freshUser.email?.split("@")?.[0] || "You",
        content,
      };

      const { data: insertedComment, error: commentError } = await supabase
        .from("feed_comments")
        .insert(commentPayload)
        .select("*")
        .single();

      if (commentError) throw commentError;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...(post.comments || []), insertedComment] }
            : post
        )
      );

      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      setOpenComments((prev) => ({ ...prev, [postId]: true }));
    } catch (commentError) {
      console.error("Dashboard feed comment failed:", commentError);
      setError(commentError?.message || "Unable to comment right now.");
    } finally {
      setSavingComment(false);
    }
  }, [commentTexts, currentUser, currentUserName, fetchFeedUser]);

  const handleDeletePost = useCallback(async (post) => {
    if (!currentUser?.id || post.author_id !== currentUser.id) return;

    try {
      if (post.media?.path) {
        await supabase.storage.from(FEED_STORAGE_BUCKET).remove([post.media.path]);
      }

      await supabase.from("feed_comments").delete().eq("post_id", post.id);

      const { error: deleteError } = await supabase
        .from("feed_posts")
        .delete()
        .eq("id", post.id);

      if (deleteError) throw deleteError;

      setPosts((prev) => prev.filter((item) => item.id !== post.id));
    } catch (deleteError) {
      console.error("Dashboard feed delete failed:", deleteError);
      setError(deleteError?.message || "Unable to delete post.");
    }
  }, [currentUser?.id]);

  return (
    <div className="space-y-4 touch-pan-y overscroll-y-contain">

      <FeedComposer
        composerOpen={composerOpen}
        onToggleComposer={() => setComposerOpen((prev) => !prev)}
        currentUserName={currentUserName}
        newPost={newPost}
        onNewPostChange={setNewPost}
        selectedCategory={selectedCategory}
        onSelectedCategoryChange={setSelectedCategory}
        composerMedia={composerMedia}
        onClearMedia={() => {
          setComposerMedia(null);
          setYoutubeLink("");
        }}
        youtubeLink={youtubeLink}
        onYoutubeLinkChange={setYoutubeLink}
        onApplyYoutubeLink={applyYoutubeLink}
        onFileSelect={handleFileSelect}
        onPost={handlePost}
        posting={posting}
        canPost={Boolean(newPost.trim() || composerMedia)}
        onResetComposer={resetComposer}
        error={error}
      />

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-[30px] border border-white/15 bg-white/6" />
          <div className="h-28 animate-pulse rounded-[30px] border border-white/15 bg-white/6" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[30px] border border-white/15 bg-white/[0.055] p-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          <p className="text-sm font-bold text-white">No posts yet</p>
          <p className="mt-1 text-xs text-white/55">Be the first to share a win or question.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              commentText={commentTexts[post.id] || ""}
              commentsOpen={Boolean(openComments[post.id])}
              savingComment={savingComment}
              activeYoutubePosts={activeYoutubePosts}
              onLike={handleLike}
              onDeletePost={handleDeletePost}
              onToggleComments={(postId) =>
                setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }))
              }
              onCommentTextChange={(postId, value) =>
                setCommentTexts((prev) => ({ ...prev, [postId]: value }))
              }
              onSubmitComment={handleComment}
              onActivateYoutubePost={(postId) =>
                setActiveYoutubePosts((prev) => ({ ...prev, [postId]: true }))
              }
            />
          ))}
        </div>
      )}

    </div>
  );
}
