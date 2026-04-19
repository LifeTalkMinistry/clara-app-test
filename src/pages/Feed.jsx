import { useState, useEffect, useMemo } from "react";
import {
  MessageCircle,
  Heart,
  Send,
  Users,
  Pencil,
  Trash2,
  X,
  Check,
  Sparkles,
  Flame,
  Clock3,
  ChevronRight,
  Trophy,
  HandHelping,
  MessageSquareQuote,
  HelpCircle,
  Lightbulb,
  Image as ImageIcon,
  Link as LinkIcon,
  Play,
  FileVideo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const STORAGE_BUCKET = "feed-media";

const POST_CATEGORIES = [
  {
    key: "achievement",
    label: "Achievement",
    icon: Trophy,
    pickerClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
    badgeClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  {
    key: "testimony",
    label: "Testimony",
    icon: MessageSquareQuote,
    pickerClass:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15",
    badgeClass: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  },
  {
    key: "advice",
    label: "Advice",
    icon: HandHelping,
    pickerClass:
      "border-violet-500/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15",
    badgeClass:
      "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
  {
    key: "question",
    label: "Question",
    icon: HelpCircle,
    pickerClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  {
    key: "motivation",
    label: "Motivation",
    icon: Flame,
    pickerClass:
      "border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15",
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
  {
    key: "thought",
    label: "Thought",
    icon: Lightbulb,
    pickerClass:
      "border-slate-500/20 bg-slate-500/10 text-slate-300 hover:bg-slate-500/15",
    badgeClass: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  },
];

const peopleCards = [
  {
    id: "cp-2",
    name: "CLARA People",
    subtext: "Connect with disciplined and growth-minded members",
    action: "Explore",
    icon: Users,
  },
];

const YOUTUBE_SUGGESTIONS = [
  "Emergency fund tips",
  "How to budget salary",
  "Saving money habits",
  "Debt payoff strategy",
  "Financial discipline mindset",
  "Personal finance basics",
  "Needs vs wants",
  "Beginner investing lessons",
];

const IMAGE_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
].join(",");

const formatRelativeTime = (dateString) => {
  if (!dateString) return "Just now";

  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;

  if (Number.isNaN(date)) return "Just now";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}d ago`;

  return new Date(dateString).toLocaleDateString();
};

const getInitials = (name = "U") => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const getCategoryConfig = (key) =>
  POST_CATEGORIES.find((item) => item.key === key) || POST_CATEGORIES[0];

const isImageType = (type = "") => type.startsWith("image/");
const isVideoType = (type = "") => type.startsWith("video/");

const getYouTubeId = (value = "") => {
  const text = value.trim();
  if (!text) return null;

  try {
    if (text.includes("youtu.be/")) {
      return text.split("youtu.be/")[1]?.split(/[?&/]/)[0] || null;
    }

    if (text.includes("/shorts/")) {
      return text.split("/shorts/")[1]?.split(/[?&/]/)[0] || null;
    }

    if (text.includes("/embed/")) {
      return text.split("/embed/")[1]?.split(/[?&/]/)[0] || null;
    }

    const url = new URL(text);
    return url.searchParams.get("v");
  } catch {
    return null;
  }
};

const getYouTubeEmbedUrl = (value = "") => {
  const id = getYouTubeId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
};

const getYouTubeThumbnail = (youtubeId = "") =>
  youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "";

function MediaPreview({
  media,
  isYouTubeActive = false,
  onActivateYouTube,
  previewMode = false,
}) {
  if (!media) return null;

  if (media.type === "image" && media.url) {
    return (
      <div className="mb-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
        <img
          src={media.url}
          alt={media.name || "Post media"}
          className="w-full max-h-[420px] object-cover"
        />
      </div>
    );
  }

  if (media.type === "video" && media.url) {
    return (
      <div className="relative z-20 mb-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
        <video
          src={media.url}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          className="w-full max-h-[420px] bg-black pointer-events-auto"
          style={{ pointerEvents: "auto" }}
        />
      </div>
    );
  }

  if (media.type === "youtube" && media.embedUrl) {
    if (!isYouTubeActive || previewMode) {
      return (
        <button
          type="button"
          onClick={onActivateYouTube}
          className="relative z-20 mb-4 block w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/30 text-left pointer-events-auto"
        >
          <div className="relative">
            {media.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name || "YouTube preview"}
                className="w-full max-h-[420px] object-cover"
              />
            ) : (
              <div className="flex h-[240px] w-full items-center justify-center bg-black/40 text-muted-foreground">
                YouTube preview
              </div>
            )}

            <div className="absolute inset-0 bg-black/25" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
              <div className="min-w-0 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-md">
                <span className="block truncate">
                  {previewMode
                    ? "YouTube preview — will play after posting"
                    : "Tap once to load player"}
                </span>
              </div>

              {!previewMode && (
                <div className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                  Play here
                </div>
              )}
            </div>
          </div>
        </button>
      );
    }

    return (
      <div className="relative z-20 mb-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/30 pointer-events-auto">
        <div className="relative w-full pt-[56.25%]">
          <iframe
            src={`${media.embedUrl}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=1`}
            title="YouTube video"
            className="absolute inset-0 h-full w-full rounded-[22px] pointer-events-auto"
            style={{ pointerEvents: "auto" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground">
          <FileVideo className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {media.name || "Attached media"}
          </p>
          <p className="text-xs text-muted-foreground">
            Preview unavailable on this browser
          </p>
        </div>
      </div>
    </div>
  );
}

const mapRowToPost = (postRow, comments = []) => {
  let media = null;

  if (postRow.media_type === "image" || postRow.media_type === "video") {
    media = {
      type: postRow.media_type,
      url: postRow.media_url,
      path: postRow.media_path,
      name: postRow.media_name,
      mimeType: postRow.media_mime_type,
    };
  }

  if (postRow.media_type === "youtube") {
    media = {
      type: "youtube",
      url: postRow.youtube_url,
      embedUrl: postRow.youtube_embed_url,
      youtubeId: postRow.youtube_id,
      thumbnailUrl: postRow.youtube_thumbnail_url,
      name: postRow.media_name || "YouTube video",
    };
  }

  return {
    id: postRow.id,
    author_id: postRow.author_id || null,
    author_name: postRow.author_name || "User",
    content: postRow.content || "",
    category: postRow.category || "achievement",
    likes: Number(postRow.likes || 0),
    liked_by: Array.isArray(postRow.liked_by) ? postRow.liked_by : [],
    comments: comments.map((comment) => ({
      id: comment.id,
      post_id: comment.post_id,
      author_id: comment.author_id || null,
      author_name: comment.author_name || "User",
      content: comment.content || "",
      created_at: comment.created_at || new Date().toISOString(),
      updated_at: comment.updated_at || null,
    })),
    media,
    created_at: postRow.created_at || new Date().toISOString(),
    updated_at: postRow.updated_at || null,
  };
};

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("You");

  const [newPost, setNewPost] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("achievement");
  const [expandedComposer, setExpandedComposer] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [composerMedia, setComposerMedia] = useState(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [composerError, setComposerError] = useState("");

  const [commentTexts, setCommentTexts] = useState({});
  const [openCommentBox, setOpenCommentBox] = useState({});
  const [activeYoutubePosts, setActiveYoutubePosts] = useState({});

  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("achievement");
  const [savingEditPostId, setSavingEditPostId] = useState(null);

  const [editingComment, setEditingComment] = useState({
    postId: null,
    commentId: null,
    content: "",
  });
  const [savingComment, setSavingComment] = useState(false);

  const fetchUser = async () => {
    if (!isSupabaseConfigured) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Failed to get current user:", error);
      setCurrentUser(null);
      setCurrentUserName("You");
      return null;
    }

    setCurrentUser(user || null);

    if (!user) {
      setCurrentUserName("You");
      return null;
    }

    const metaName =
      user.user_metadata?.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")?.[0] ||
      "You";

    setCurrentUserName(metaName);
    return user;
  };

  const fetchPosts = async (showRefresh = false) => {
    if (!isSupabaseConfigured) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (showRefresh) setIsRefreshing(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const postIds = (postsData || []).map((post) => post.id);

      let commentsData = [];
      if (postIds.length > 0) {
        const { data, error: commentsError } = await supabase
          .from("feed_comments")
          .select("*")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        if (commentsError) throw commentsError;
        commentsData = data || [];
      }

      const commentsByPostId = commentsData.reduce((acc, comment) => {
        if (!acc[comment.post_id]) acc[comment.post_id] = [];
        acc[comment.post_id].push(comment);
        return acc;
      }, {});

      const mappedPosts = (postsData || []).map((postRow) =>
        mapRowToPost(postRow, commentsByPostId[postRow.id] || [])
      );

      setPosts(mappedPosts);
    } catch (error) {
      console.error("Failed to fetch feed:", error);
      setComposerError(
        error?.message || "Unable to load the feed right now."
      );
    } finally {
      setLoading(false);
      if (showRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    const init = async () => {
      await fetchUser();
      if (mounted) {
        await fetchPosts();
      }
    };

    init();

    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async () => {
        await fetchUser();
        await fetchPosts(true);
      });

      authSubscription = data?.subscription || null;
    }

    return () => {
      mounted = false;
      authSubscription?.unsubscribe?.();
      if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
        URL.revokeObjectURL(composerMedia.previewUrl);
      }
    };
  }, []);

  const resetComposer = () => {
    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setNewPost("");
    setSelectedCategory("achievement");
    setExpandedComposer(false);
    setComposerMedia(null);
    setYoutubeLink("");
    setComposerError("");
  };

  const uploadMediaToSupabase = async (file, userId) => {
    if (!file) return null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "";
    const filePath = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}${fileExt ? `.${fileExt}` : ""}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrlData?.publicUrl || "",
      name: file.name,
      mimeType: file.type || "",
      type: "image",
    };
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setComposerError("");
    setYoutubeLink("");

    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    if (!isImageType(file.type)) {
      setComposerError("Only image upload is allowed for now.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setComposerMedia({
      type: "image",
      url: previewUrl,
      previewUrl,
      name: file.name,
      mimeType: file.type,
      file,
    });
  };

  const applyYouTubeLink = () => {
    const trimmed = youtubeLink.trim();
    const youtubeId = getYouTubeId(trimmed);
    const embedUrl = getYouTubeEmbedUrl(trimmed);

    if (!embedUrl || !youtubeId) {
      setComposerError("Enter a valid YouTube video link.");
      return;
    }

    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setComposerError("");
    setComposerMedia({
      type: "youtube",
      url: trimmed,
      embedUrl,
      youtubeId,
      thumbnailUrl: getYouTubeThumbnail(youtubeId),
      name: "YouTube video",
      file: null,
    });
  };

  const fillSuggestion = (keyword) => {
    setYoutubeLink(keyword);
    setComposerError("Paste a real YouTube video link related to that topic.");
  };

  const removeComposerMedia = () => {
    if (composerMedia?.previewUrl?.startsWith?.("blob:")) {
      URL.revokeObjectURL(composerMedia.previewUrl);
    }

    setComposerMedia(null);
    setYoutubeLink("");
    setComposerError("");
  };

  const handlePost = async () => {
    const content = newPost.trim();

    if (!content && !composerMedia) return;

    if (!isSupabaseConfigured) {
      setComposerError("Supabase is not configured.");
      return;
    }

    if (content.length > 280) {
      setComposerError("Post must be 280 characters or less.");
      return;
    }

    setIsPosting(true);
    setComposerError("");

    try {
      const freshUser = await fetchUser();

      if (!freshUser?.id) {
        throw new Error("Please log in again before posting.");
      }

      const authorName =
        freshUser.user_metadata?.nickname ||
        freshUser.user_metadata?.full_name ||
        freshUser.user_metadata?.name ||
        freshUser.email?.split("@")?.[0] ||
        currentUserName ||
        "You";

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

      if (composerMedia?.type === "image") {
        if (!composerMedia.file) {
          throw new Error("Missing image file.");
        }

        const uploaded = await uploadMediaToSupabase(
          composerMedia.file,
          freshUser.id
        );

        mediaPayload = {
          media_type: "image",
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
        author_id: freshUser.id,
        author_name: authorName,
        content,
        category: selectedCategory,
        likes: 0,
        liked_by: [],
        ...mediaPayload,
      };

      const { data: insertedPost, error } = await supabase
        .from("feed_posts")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) throw error;

      if (insertedPost) {
        const mappedInserted = mapRowToPost(insertedPost, []);
        setPosts((prev) => [mappedInserted, ...prev]);
      } else {
        await fetchPosts(true);
      }

      resetComposer();
    } catch (error) {
      console.error("Failed to create post:", error);
      setComposerError(error?.message || "Unable to post right now.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (post) => {
    if (!isSupabaseConfigured) return;

    const likerId = currentUser?.id || "me";
    const alreadyLiked = Array.isArray(post.liked_by)
      ? post.liked_by.includes(likerId)
      : false;

    const newLikedBy = alreadyLiked
      ? post.liked_by.filter((id) => id !== likerId)
      : [...(post.liked_by || []), likerId];

    const optimisticPosts = posts.map((p) =>
      p.id === post.id
        ? { ...p, liked_by: newLikedBy, likes: newLikedBy.length }
        : p
    );

    setPosts(optimisticPosts);

    const { error } = await supabase
      .from("feed_posts")
      .update({
        liked_by: newLikedBy,
        likes: newLikedBy.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      console.error("Failed to like post:", error);
      await fetchPosts(true);
    }
  };

  const handleDelete = async (postId) => {
    if (!isSupabaseConfigured) return;

    const targetPost = posts.find((p) => p.id === postId);

    try {
      if (targetPost?.media?.path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([targetPost.media.path]);
      }

      await supabase.from("feed_comments").delete().eq("post_id", postId);
      const { error } = await supabase.from("feed_posts").delete().eq("id", postId);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Failed to delete post:", error);
      await fetchPosts(true);
    }
  };

  const handleEditSave = async (postId) => {
    if (!editContent.trim()) return;
    if (!isSupabaseConfigured) return;

    setSavingEditPostId(postId);

    try {
      const { error } = await supabase
        .from("feed_posts")
        .update({
          content: editContent.trim(),
          category: editCategory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                content: editContent.trim(),
                category: editCategory,
                updated_at: new Date().toISOString(),
              }
            : p
        )
      );

      setEditingPostId(null);
      setEditContent("");
      setEditCategory("achievement");
    } catch (error) {
      console.error("Failed to edit post:", error);
    } finally {
      setSavingEditPostId(null);
    }
  };

  const handleComment = async (postId) => {
    const text = commentTexts[postId];
    if (!text?.trim()) return;
    if (!isSupabaseConfigured) return;

    setSavingComment(true);

    try {
      const freshUser = await fetchUser();

      if (!freshUser?.id) {
        throw new Error("Please log in again before commenting.");
      }

      const authorName =
        freshUser.user_metadata?.nickname ||
        freshUser.user_metadata?.full_name ||
        freshUser.user_metadata?.name ||
        freshUser.email?.split("@")?.[0] ||
        currentUserName ||
        "You";

      const commentPayload = {
        post_id: postId,
        author_id: freshUser.id,
        author_name: authorName,
        content: text.trim(),
      };

      const { data: insertedComment, error } = await supabase
        .from("feed_comments")
        .insert(commentPayload)
        .select("*")
        .single();

      if (error) throw error;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [...(post.comments || []), insertedComment],
              }
            : post
        )
      );

      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      setOpenCommentBox((prev) => ({ ...prev, [postId]: true }));
    } catch (error) {
      console.error("Failed to add comment:", error);
      setComposerError(error?.message || "Unable to comment right now.");
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from("feed_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((post) =>
          post.id !== postId
            ? post
            : {
                ...post,
                comments: (post.comments || []).filter((c) => c.id !== commentId),
              }
        )
      );

      if (
        editingComment.postId === postId &&
        editingComment.commentId === commentId
      ) {
        setEditingComment({ postId: null, commentId: null, content: "" });
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleStartEditComment = (postId, comment) => {
    setEditingComment({
      postId,
      commentId: comment.id,
      content: comment.content,
    });
  };

  const handleSaveEditedComment = async () => {
    if (!editingComment.content.trim()) return;
    if (!isSupabaseConfigured) return;

    setSavingComment(true);

    try {
      const { error } = await supabase
        .from("feed_comments")
        .update({
          content: editingComment.content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingComment.commentId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== editingComment.postId) return post;

          return {
            ...post,
            comments: (post.comments || []).map((comment) =>
              comment.id === editingComment.commentId
                ? {
                    ...comment,
                    content: editingComment.content.trim(),
                    updated_at: new Date().toISOString(),
                  }
                : comment
            ),
          };
        })
      );

      setEditingComment({ postId: null, commentId: null, content: "" });
    } catch (error) {
      console.error("Failed to edit comment:", error);
    } finally {
      setSavingComment(false);
    }
  };

  const composerHint = useMemo(() => {
    const length = newPost.trim().length;

    if (composerMedia?.type === "image" && length === 0) {
      return "Image ready. Add context if you want.";
    }
    if (composerMedia?.type === "youtube" && length === 0) {
      return "YouTube link ready. Add why it is valuable.";
    }
    if (length === 0) {
      return "Share a win, lesson, testimony, or meaningful finance insight.";
    }
    if (length < 25) return "Good start — add a bit more context.";
    if (length < 80) return "Nice. This already feels valuable.";
    return "Strong post. This can inspire someone today.";
  }, [newPost, composerMedia]);

  const selectedComposerCategory = getCategoryConfig(selectedCategory);
  const SelectedComposerIcon = selectedComposerCategory.icon;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4 pb-32 pt-4 md:px-6 md:pb-8 md:pt-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-8 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-28 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <PageHeader title="Feed" subtitle="See real progress. Stay motivated." />

        <div className="mb-4 rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                CLARA People
              </h3>
              <p className="text-xs text-muted-foreground">
                Build accountability and meaningful connection.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
              <Users className="h-3 w-3" />
              Social
            </div>
          </div>

          <div className="space-y-2">
            {peopleCards.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-emerald-400/20 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 text-emerald-300">
                    <ItemIcon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.subtext}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-300">
                    {item.action}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5 rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background/80 to-cyan-500/10 p-[1px] shadow-[0_10px_40px_rgba(16,185,129,0.10)]">
          <div className="rounded-[23px] border border-white/5 bg-background/80 p-3 backdrop-blur-2xl">
            {!expandedComposer ? (
              <button
                type="button"
                onClick={() => setExpandedComposer(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition hover:border-emerald-400/25 hover:bg-white/[0.06]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-300">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Create a post
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Share progress, a meaningful photo, or an educational YouTube link...
                  </p>
                </div>

                <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                  Motivation wall
                </div>
              </button>
            ) : (
              <div className="relative z-30">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-300">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">
                        Create a post
                      </h3>
                      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Motivation wall
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Focus on meaningful, educational, and inspiring content.
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={() => {
                      if (!newPost.trim() && !composerMedia) resetComposer();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mb-3">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {POST_CATEGORIES.map((category) => {
                      const CategoryIcon = category.icon;
                      const isSelected = selectedCategory === category.key;

                      return (
                        <button
                          key={category.key}
                          type="button"
                          onClick={() => setSelectedCategory(category.key)}
                          className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${category.pickerClass} ${
                            isSelected
                              ? "ring-1 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                              : "opacity-75 hover:opacity-100"
                          }`}
                        >
                          <CategoryIcon className="h-3.5 w-3.5" />
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-3 rounded-2xl border border-white/10 bg-background/50 p-2 transition-all focus-within:border-emerald-400/30 focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_30px_rgba(16,185,129,0.08)]">
                  <Textarea
                    placeholder={`Write your ${selectedComposerCategory.label.toLowerCase()} post...`}
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    rows={4}
                    autoFocus
                    className="resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="relative z-30 mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-foreground transition hover:bg-white/[0.07] pointer-events-auto">
                    <ImageIcon className="h-4 w-4 text-emerald-300" />
                    <span>Add photo</span>
                    <input
                      type="file"
                      accept={IMAGE_ACCEPT}
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <div className="flex gap-2 sm:col-span-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={youtubeLink}
                        onChange={(e) => setYoutubeLink(e.target.value)}
                        placeholder="Paste educational YouTube link"
                        className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pl-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pointer-events-auto"
                      onClick={applyYouTubeLink}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="mb-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-300">
                    <Lightbulb className="h-4 w-4" />
                    Suggested meaningful YouTube topics
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {YOUTUBE_SUGGESTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => fillSuggestion(item)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-muted-foreground transition hover:border-emerald-400/20 hover:bg-white/10 hover:text-foreground"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {composerError ? (
                  <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {composerError}
                  </div>
                ) : null}

                {composerMedia ? (
                  <div className="mb-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {composerMedia.type === "image" ? (
                          <ImageIcon className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <Play className="h-4 w-4 text-rose-300" />
                        )}
                        <span className="truncate">
                          {composerMedia.name || "Attached media"}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0"
                        onClick={removeComposerMedia}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <MediaPreview
                      media={composerMedia}
                      previewMode={composerMedia.type === "youtube"}
                    />
                  </div>
                ) : null}

                <div className="relative z-40 mt-3 flex items-center justify-between gap-3 flex-wrap pointer-events-auto">
                  <div className="min-w-0">
                    <div
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${selectedComposerCategory.badgeClass}`}
                    >
                      <SelectedComposerIcon className="h-3.5 w-3.5" />
                      {selectedComposerCategory.label}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {composerHint}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {newPost.trim().length}/280
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full px-4 pointer-events-auto"
                      onClick={() => {
                        if (!newPost.trim() && !composerMedia) resetComposer();
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      size="sm"
                      onClick={handlePost}
                      disabled={(!newPost.trim() && !composerMedia) || isPosting}
                      className="h-10 rounded-full bg-emerald-500 px-5 font-semibold text-black shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-400 disabled:opacity-50 pointer-events-auto"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isPosting ? "Posting..." : "Post now"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isRefreshing ? (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-emerald-400" />
            Syncing feed...
          </div>
        ) : null}

        {posts.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-5 backdrop-blur-xl">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-emerald-300">
                  <Flame className="h-4 w-4" />
                  Be the first spark
                </div>
                <p className="text-xs text-muted-foreground">
                  Start the first momentum post and set the tone for everyone.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                  Inspire silently
                </div>
                <p className="text-xs text-muted-foreground">
                  One honest post can push someone to track better today.
                </p>
              </div>
            </div>

            <EmptyState
              icon={Users}
              title="No posts yet"
              description="Start sharing your progress. Someone out there needs your story today."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const likerId = currentUser?.id || "me";
              const isLiked = post.liked_by?.includes(likerId);
              const category = getCategoryConfig(post.category);
              const CategoryIcon = category.icon;
              const isCommentOpen = !!openCommentBox[post.id];
              const likeCount = post.likes || 0;
              const replyCount = post.comments?.length || 0;
              const isYouTubeActive = !!activeYoutubePosts[post.id];
              const isOwnPost =
                (currentUser?.id && post.author_id === currentUser.id) ||
                post.author_name === currentUserName;

              return (
                <div
                  key={post.id}
                  className="group overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] shadow-[0_8px_30px_rgba(0,0,0,0.20)] backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/20 hover:shadow-[0_12px_36px_rgba(16,185,129,0.10)]"
                >
                  <div className="h-[1px] w-full bg-gradient-to-r from-emerald-400/60 via-cyan-400/40 to-transparent" />

                  <div className="p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-sm font-bold text-emerald-200 ring-1 ring-white/10">
                        {getInitials(post.author_name || "You")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {post.author_name}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${category.badgeClass}`}
                          >
                            <CategoryIcon className="h-3 w-3" />
                            {category.label}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          <span>{formatRelativeTime(post.created_at)}</span>
                        </div>
                      </div>

                      {isOwnPost && (
                        <div className="flex gap-1 opacity-80">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditContent(post.content || "");
                              setEditCategory(post.category || "achievement");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-full p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingPostId === post.id ? (
                      <div className="mb-3 rounded-2xl border border-white/10 bg-background/40 p-2">
                        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {POST_CATEGORIES.map((item) => {
                            const ItemIcon = item.icon;
                            const active = editCategory === item.key;

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => setEditCategory(item.key)}
                                className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${item.pickerClass} ${
                                  active ? "ring-1 ring-white/20" : "opacity-75"
                                }`}
                              >
                                <ItemIcon className="h-3.5 w-3.5" />
                                {item.label}
                              </button>
                            );
                          })}
                        </div>

                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          className="mb-2 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(post.id)}
                            className="rounded-full"
                            disabled={savingEditPostId === post.id}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            {savingEditPostId === post.id ? "Saving..." : "Save"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                              setEditingPostId(null);
                              setEditContent("");
                              setEditCategory("achievement");
                            }}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {post.content ? (
                      <div className="mb-4 rounded-2xl border border-white/5 bg-black/10 px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/95">
                          {post.content}
                        </p>
                      </div>
                    ) : null}

                    <MediaPreview
                      media={post.media}
                      isYouTubeActive={isYouTubeActive}
                      onActivateYouTube={() =>
                        setActiveYoutubePosts((prev) => ({
                          ...prev,
                          [post.id]: true,
                        }))
                      }
                    />

                    {(likeCount > 0 || replyCount > 0) && (
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        {likeCount > 0 && (
                          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">
                            <Heart className="h-3.5 w-3.5" />
                            {likeCount} reaction{likeCount === 1 ? "" : "s"}
                          </div>
                        )}

                        {replyCount > 0 && (
                          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {replyCount} repl{replyCount === 1 ? "y" : "ies"}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleLike(post)}
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all ${
                          isLiked
                            ? "border-red-500/20 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
                        />
                        {isLiked ? "Liked" : "Like"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenCommentBox((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all ${
                          isCommentOpen
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Comment
                      </button>
                    </div>

                    {post.comments?.length > 0 && (
                      <div className="mb-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        {post.comments.map((c, i) => {
                          const isEditingThisComment =
                            editingComment.postId === post.id &&
                            editingComment.commentId === c.id;

                          const isOwnComment =
                            (currentUser?.id && c.author_id === currentUser.id) ||
                            c.author_name === currentUserName;

                          return (
                            <div
                              key={c.id || i}
                              className="rounded-xl border border-white/5 bg-black/10 px-3 py-2"
                            >
                              {isEditingThisComment ? (
                                <div>
                                  <Input
                                    value={editingComment.content}
                                    onChange={(e) =>
                                      setEditingComment((prev) => ({
                                        ...prev,
                                        content: e.target.value,
                                      }))
                                    }
                                    className="mb-2 h-9 rounded-full border-white/10 bg-white/5 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="h-8 rounded-full"
                                      onClick={handleSaveEditedComment}
                                      disabled={savingComment}
                                    >
                                      <Check className="mr-1 h-3.5 w-3.5" />
                                      {savingComment ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 rounded-full"
                                      onClick={() =>
                                        setEditingComment({
                                          postId: null,
                                          commentId: null,
                                          content: "",
                                        })
                                      }
                                    >
                                      <X className="mr-1 h-3.5 w-3.5" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-2 text-[11px] flex-wrap">
                                      <span className="font-semibold text-foreground">
                                        {c.author_name}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {formatRelativeTime(c.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                      {c.content}
                                    </p>
                                  </div>

                                  {isOwnComment && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 rounded-full p-0 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                                        onClick={() =>
                                          handleStartEditComment(post.id, c)
                                        }
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 rounded-full p-0 text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          handleDeleteComment(post.id, c.id)
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isCommentOpen && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Write a supportive comment..."
                          className="h-10 rounded-full border-white/10 bg-white/5 text-sm"
                          value={commentTexts[post.id] || ""}
                          onChange={(e) =>
                            setCommentTexts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleComment(post.id)
                          }
                        />

                        <Button
                          size="sm"
                          className="h-10 rounded-full border border-white/10 bg-white/10 px-4 text-foreground hover:bg-white/15"
                          onClick={() => handleComment(post.id)}
                          disabled={savingComment}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}