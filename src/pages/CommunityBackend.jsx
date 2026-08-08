import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CircleHelp,
  FileImage,
  Heart,
  HeartHandshake,
  Lightbulb,
  Lock,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  Trophy,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";
import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";
import { uploadCommunityMedia } from "@/lib/community-media-client";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";

const POST_TYPES = [
  { key: "win", label: "Win", icon: Trophy },
  { key: "question", label: "Question", icon: CircleHelp },
  { key: "struggle", label: "Struggle", icon: HeartHandshake },
  { key: "money_lesson", label: "Money Lesson", icon: Lightbulb },
];

const POST_TYPE_BY_KEY = Object.fromEntries(POST_TYPES.map((item) => [item.key, item]));
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

function initialsFor(value) {
  const words = String(value || "CLARA Member").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase()).join("") || "CL";
}

function formatTime(value) {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  const delta = Date.now() - timestamp;
  if (Number.isFinite(delta) && delta >= 0) {
    if (delta < 60_000) return "Just now";
    if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}m`;
    if (delta < 86_400_000) return `${Math.max(1, Math.floor(delta / 3_600_000))}h`;
  }
  try {
    return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function fileSizeLabel(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function acceptFile(file) {
  if (!file) return null;
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error("Attachments must be 20 MB or smaller.");
  }
  return file;
}

function AttachmentPicker({ onPick, disabled = false }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[10px] font-black text-white/65 transition hover:border-[#22c7b8]/30 hover:text-[#ccfbf1]">
        <FileImage className="h-3.5 w-3.5" /> Photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = "";
          }}
        />
      </label>
      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[10px] font-black text-white/65 transition hover:border-[#22c7b8]/30 hover:text-[#ccfbf1]">
        <Video className="h-3.5 w-3.5" /> Video
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = "";
          }}
        />
      </label>
      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[10px] font-black text-white/65 transition hover:border-[#22c7b8]/30 hover:text-[#ccfbf1]">
        <Paperclip className="h-3.5 w-3.5" /> File
        <input
          type="file"
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function SelectedAttachment({ file, onRemove }) {
  if (!file) return null;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[16px] border border-[#22c7b8]/18 bg-[#22c7b8]/[0.06] px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#22c7b8]/10 text-[#99f6e4]">
        {file.type?.startsWith("image/") ? <FileImage className="h-4 w-4" /> : file.type?.startsWith("video/") ? <Video className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-white">{file.name}</p>
        <p className="mt-0.5 text-[9px] font-semibold text-white/35">{fileSizeLabel(file.size)}</p>
      </div>
      <button type="button" onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
    </div>
  );
}

export default function CommunityBackend() {
  const navigate = useNavigate();
  const { access, isAdmin, isFree, isPending } = useUserRole();
  const backendUser = getStoredBackendUser();
  const token = getStoredBackendToken();
  const currentUserId = backendUser?.id || null;
  const currentUserName = backendUser?.name || backendUser?.email || "CLARA Member";
  const isLocked = isFree || isPending || !access.community;
  const canPost = isAdmin || access.communityPosting;

  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [body, setBody] = useState("");
  const [selectedPostType, setSelectedPostType] = useState("win");
  const [mediaFile, setMediaFile] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeView, setActiveView] = useState("feed");
  const [menuPostId, setMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [actionError, setActionError] = useState("");

  const loadFeed = useCallback(async () => {
    if (!token || isLocked) return;
    try {
      const [postData, commentData] = await Promise.all([
        backendRequest("/api/community/posts?limit=50", { token }),
        backendRequest("/api/community/comments?limit=300", { token }),
      ]);
      setPosts(Array.isArray(postData) ? postData : []);
      setComments(Array.isArray(commentData) ? commentData : []);
    } catch (error) {
      console.error("[Community] feed load failed:", error);
    }
  }, [isLocked, token]);

  const loadNotifications = useCallback(async () => {
    if (!token || isLocked) return;
    try {
      const data = await backendRequest("/api/community/notifications?limit=50", { token });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Community] notifications load failed:", error);
    }
  }, [isLocked, token]);

  useEffect(() => {
    if (isLocked || !token) return;
    loadFeed();
    loadNotifications();
  }, [isLocked, loadFeed, loadNotifications, token]);

  useEffect(() => {
    if (!token || isLocked) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (activeView === "notifications") loadNotifications();
      else loadFeed();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [activeView, isLocked, loadFeed, loadNotifications, token]);

  const commentsByPost = useMemo(() => comments.reduce((acc, comment) => {
    const key = String(comment.post_id || "");
    if (!acc[key]) acc[key] = [];
    acc[key].push(comment);
    return acc;
  }, {}), [comments]);

  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  const pickComposerMedia = (file) => {
    try {
      setActionError("");
      setMediaFile(acceptFile(file));
      setComposerOpen(true);
    } catch (error) {
      setActionError(error.message);
    }
  };

  const createPost = async () => {
    const text = body.trim();
    if ((!text && !mediaFile) || !token || !canPost || saving) return;
    try {
      setSaving(true);
      setActionError("");
      const media = mediaFile ? await uploadCommunityMedia(mediaFile) : null;
      await backendRequest("/api/community/posts", {
        method: "POST",
        token,
        body: {
          body: text,
          post_type: selectedPostType,
          ...(media ? {
            media_url: media.media_url,
            media_type: media.media_type,
            media_name: media.media_name,
          } : {}),
        },
      });
      setBody("");
      setSelectedPostType("win");
      setMediaFile(null);
      setComposerOpen(false);
      await loadFeed();
    } catch (error) {
      console.error("[Community] post failed:", error);
      setActionError(error?.message || "Unable to publish that post.");
    } finally {
      setSaving(false);
    }
  };

  const startEditPost = (post) => {
    setMenuPostId(null);
    setActionError("");
    setEditingPost({
      id: post.id,
      body: post.body || "",
      postType: post.post_type || "win",
      existingMediaUrl: post.media_url || "",
      existingMediaType: post.media_type || "",
      existingMediaName: post.media_name || "",
      mediaFile: null,
      removeMedia: false,
    });
  };

  const saveEditedPost = async () => {
    if (!editingPost || !token || saving) return;
    const text = String(editingPost.body || "").trim();
    const hasAttachment = editingPost.mediaFile || (editingPost.existingMediaUrl && !editingPost.removeMedia);
    if (!text && !hasAttachment) {
      setActionError("A post needs text or an attachment.");
      return;
    }

    try {
      setSaving(true);
      setActionError("");
      const media = editingPost.mediaFile ? await uploadCommunityMedia(editingPost.mediaFile) : null;
      await backendRequest(`/api/community/posts/${editingPost.id}`, {
        method: "PATCH",
        token,
        body: {
          body: text,
          post_type: editingPost.postType,
          ...(media ? {
            media_url: media.media_url,
            media_type: media.media_type,
            media_name: media.media_name,
          } : {}),
          remove_media: !media && editingPost.removeMedia,
        },
      });
      setEditingPost(null);
      await loadFeed();
    } catch (error) {
      console.error("[Community] edit failed:", error);
      setActionError(error?.message || "Unable to edit that post.");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (post) => {
    setMenuPostId(null);
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      setActionError("");
      await backendRequest(`/api/community/posts/${post.id}`, {
        method: "DELETE",
        token,
      });
      if (editingPost?.id === post.id) setEditingPost(null);
      await loadFeed();
    } catch (error) {
      console.error("[Community] delete failed:", error);
      setActionError(error?.message || "Unable to delete that post.");
    }
  };

  const addComment = async (postId) => {
    const text = String(commentDrafts[postId] || "").trim();
    if (!text || !token) return;
    try {
      await backendRequest("/api/community/comments", {
        method: "POST",
        token,
        body: { post_id: postId, body: text },
      });
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await loadFeed();
    } catch (error) {
      console.error("[Community] comment failed:", error);
    }
  };

  const reactToPost = async (postId) => {
    if (!token) return;
    try {
      await backendRequest(`/api/community/posts/${postId}/react`, {
        method: "POST",
        token,
        body: {},
      });
      await loadFeed();
    } catch (error) {
      console.error("[Community] reaction failed:", error);
    }
  };

  const openProfile = (authorId) => {
    if (String(authorId) === String(currentUserId)) navigate("/profile");
    else navigate(`/users/${encodeURIComponent(authorId)}`);
  };

  const markNotificationRead = async (notification) => {
    if (!notification?.id || notification.is_read || !token) return;
    try {
      await backendRequest(`/api/community/notifications/${notification.id}/read`, {
        method: "PATCH",
        token,
        body: {},
      });
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      ));
    } catch (error) {
      console.error("[Community] notification read failed:", error);
    }
  };

  if (!token || !currentUserId) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#06111f] px-6 text-white">
        <div className="max-w-sm text-center"><Lock className="mx-auto h-8 w-8 text-[#5eead4]/60" /><h2 className="mt-4 text-xl font-black">Community needs your CLARA account connection.</h2><p className="mt-2 text-sm text-white/50">Sign in again to reconnect your online Community account.</p></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#06111f]/96 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <button type="button" onClick={() => navigate("/dashboard")} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-white/85" aria-label="Back to Dashboard"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#5eead4]/60">CLARA</p><h1 className="truncate text-[17px] font-black tracking-[-0.025em] sm:text-xl">Community</h1></div>
          <div className="flex items-center gap-2">
            <Link to="/messages" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/82" aria-label="Open private messages"><MessageCircle className="h-[18px] w-[18px]" /></Link>
            <button type="button" onClick={() => setActiveView((view) => view === "notifications" ? "feed" : "notifications")} className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${activeView === "notifications" ? "border-[#22c7b8]/35 bg-[#22c7b8]/12 text-[#ccfbf1]" : "border-white/10 bg-white/[0.05] text-white/82"}`} aria-label="Community notifications"><Bell className="h-[18px] w-[18px]" />{unreadNotifications > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c7b8] px-1 text-[9px] font-black text-[#042f2e]">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span> : null}</button>
            <Link to="/profile" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 text-[11px] font-black text-[#ccfbf1]" aria-label="Open Community profile">{initialsFor(currentUserName)}</Link>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-4 sm:px-5">
        <div className="mx-auto w-full max-w-3xl">
          {actionError ? <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-100">{actionError}</div> : null}

          {isLocked ? (
            <section className="rounded-[28px] border border-white/10 bg-[#0a1a29] p-6"><Lock className="h-7 w-7 text-[#5eead4]/60" /><h2 className="mt-4 text-2xl font-black">CLARA Community</h2><p className="mt-2 text-sm leading-6 text-white/55">This private Community is available to eligible CLARA members.</p><Link to="/enroll" className="mt-5 block"><Button className="h-12 w-full rounded-2xl bg-[#22c7b8] font-black text-[#042f2e]">Unlock Community</Button></Link></section>
          ) : activeView === "notifications" ? (
            <section>
              <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/55">Community activity</p><h2 className="mt-1 text-xl font-black">Notifications</h2></div>
              {notifications.length === 0 ? <div className="py-16 text-center"><Bell className="mx-auto h-8 w-8 text-[#5eead4]/40" /><p className="mt-3 font-black">Nothing new yet.</p><p className="mt-1 text-sm text-white/42">Comments, reactions, and messages will appear here.</p></div> : <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0a1a29]">{notifications.map((notification) => <button type="button" key={notification.id} onClick={() => markNotificationRead(notification)} className={`flex w-full items-start gap-3 border-b border-white/[0.07] px-4 py-4 text-left last:border-b-0 ${notification.is_read ? "bg-transparent" : "bg-[#22c7b8]/[0.06]"}`}><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#22c7b8]" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white"><span className="font-black">{notification.actor_name || "CLARA"}</span> {notification.body || notification.type}</p><p className="mt-1 text-[10px] font-semibold text-white/35">{formatTime(notification.created_at)}</p></div></button>)}</div>}
            </section>
          ) : (
            <div className="space-y-4">
              {canPost ? (
                <section className={`rounded-[22px] border border-white/10 bg-[#0a1a29] ${composerOpen ? "p-4" : "p-3"}`}>
                  {!composerOpen ? (
                    <button type="button" onClick={() => setComposerOpen(true)} className="flex h-12 w-full items-center rounded-2xl border border-white/10 bg-[#071725] px-4 text-left text-sm font-semibold text-white/35">What's happening with your money journey?</button>
                  ) : (
                    <>
                      <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/38">What are you sharing?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {POST_TYPES.map((postType) => { const Icon = postType.icon; const selected = selectedPostType === postType.key; return <button key={postType.key} type="button" onClick={() => setSelectedPostType(postType.key)} className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-[10px] font-black transition ${selected ? "border-[#5eead4]/65 bg-[#22c7b8]/18 text-[#ccfbf1] shadow-[0_0_20px_rgba(34,199,184,.12)]" : "border-white/10 bg-white/[0.035] text-white/65"}`}><Icon className={`h-3.5 w-3.5 ${selected ? "drop-shadow-[0_0_7px_rgba(94,234,212,.8)]" : ""}`} />{postType.label}</button>; })}
                      </div>
                      <textarea autoFocus rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What's happening with your money journey?" className="mt-3 w-full resize-none rounded-[18px] border border-white/10 bg-[#071725] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/28 focus:border-[#22c7b8]/45" />
                      <SelectedAttachment file={mediaFile} onRemove={() => setMediaFile(null)} />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <AttachmentPicker onPick={pickComposerMedia} disabled={saving} />
                        <Button onClick={createPost} disabled={saving || (!body.trim() && !mediaFile)} className="h-10 shrink-0 rounded-2xl bg-[#22c7b8] px-5 font-black text-[#042f2e]">{saving ? "Posting..." : "Post"}</Button>
                      </div>
                      <button type="button" onClick={() => { if (!body.trim() && !mediaFile) setComposerOpen(false); }} className="mt-3 text-[10px] font-bold text-white/38">Cancel</button>
                    </>
                  )}
                </section>
              ) : null}

              {posts.length === 0 ? <section className="py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/8 text-[#99f6e4]"><MessageSquare className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-black">Start the first conversation.</h3><p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-white/42">Small wins count here. Questions count too. The goal is accountability—not perfection.</p></section> : null}

              {posts.map((post) => {
                const postType = POST_TYPE_BY_KEY[post.post_type] || POST_TYPE_BY_KEY.win;
                const TypeIcon = postType.icon;
                const postComments = commentsByPost[String(post.id)] || [];
                const ownsPost = String(post.author_id) === String(currentUserId);
                const canManage = ownsPost;
                const isEditing = String(editingPost?.id || "") === String(post.id);

                return (
                  <article key={post.id} className="overflow-visible rounded-[22px] border border-white/10 bg-[#0a1a29]">
                    <div className="relative p-4">
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => openProfile(post.author_id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-xs font-black text-[#ccfbf1]">{initialsFor(post.author_name)}</button>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => openProfile(post.author_id)} className="truncate text-left text-sm font-black text-white">{post.author_name || "CLARA Member"}</button>
                          <div className="mt-1 flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-[#22c7b8]/16 bg-[#22c7b8]/8 px-2 py-1 text-[9px] font-black text-[#99f6e4]"><TypeIcon className="h-3 w-3" />{postType.label}</span><span className="text-[10px] font-semibold text-white/30">{formatTime(post.created_at)}{post.updated_at && post.updated_at !== post.created_at ? " · edited" : ""}</span></div>
                        </div>

                        {canManage ? (
                          <div className="relative shrink-0">
                            <button type="button" onClick={() => setMenuPostId((current) => String(current) === String(post.id) ? null : post.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/[0.055] hover:text-white" aria-label="Post options"><MoreHorizontal className="h-4 w-4" /></button>
                            {String(menuPostId || "") === String(post.id) ? (
                              <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1f2e] p-1.5 shadow-2xl">
                                <button type="button" onClick={() => startEditPost(post)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-white/75 hover:bg-white/[0.06]"><Pencil className="h-3.5 w-3.5" /> Edit post</button>
                                <button type="button" onClick={() => deletePost(post)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Delete post</button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {isEditing ? (
                        <div className="mt-4 rounded-[18px] border border-[#22c7b8]/20 bg-[#071725] p-3">
                          <div className="grid grid-cols-2 gap-2">
                            {POST_TYPES.map((type) => { const Icon = type.icon; const selected = editingPost.postType === type.key; return <button key={type.key} type="button" onClick={() => setEditingPost((current) => ({ ...current, postType: type.key }))} className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border text-[9px] font-black ${selected ? "border-[#5eead4]/60 bg-[#22c7b8]/15 text-[#ccfbf1]" : "border-white/10 text-white/55"}`}><Icon className="h-3 w-3" />{type.label}</button>; })}
                          </div>
                          <textarea value={editingPost.body} onChange={(event) => setEditingPost((current) => ({ ...current, body: event.target.value }))} rows={4} className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-[#06111f] px-3 py-3 text-sm font-semibold leading-6 text-white outline-none focus:border-[#22c7b8]/40" />

                          {!editingPost.removeMedia && !editingPost.mediaFile && editingPost.existingMediaUrl ? <CommunityPostMedia mediaUrl={editingPost.existingMediaUrl} mediaType={editingPost.existingMediaType} mediaName={editingPost.existingMediaName} /> : null}
                          <SelectedAttachment file={editingPost.mediaFile} onRemove={() => setEditingPost((current) => ({ ...current, mediaFile: null }))} />

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <AttachmentPicker onPick={(file) => { try { setActionError(""); setEditingPost((current) => ({ ...current, mediaFile: acceptFile(file), removeMedia: true })); } catch (error) { setActionError(error.message); } }} disabled={saving} />
                            {(editingPost.existingMediaUrl || editingPost.mediaFile) ? <button type="button" onClick={() => setEditingPost((current) => ({ ...current, mediaFile: null, removeMedia: true }))} className="h-9 rounded-xl border border-red-400/15 bg-red-500/[0.06] px-3 text-[10px] font-black text-red-200">Remove attachment</button> : null}
                          </div>

                          <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditingPost(null)} className="h-9 rounded-xl px-3 text-[10px] font-black text-white/45">Cancel</button><Button onClick={saveEditedPost} disabled={saving} className="h-9 rounded-xl bg-[#22c7b8] px-4 text-[10px] font-black text-[#042f2e]">{saving ? "Saving..." : "Save changes"}</Button></div>
                        </div>
                      ) : (
                        <>
                          {post.body ? <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/82">{post.body}</p> : null}
                          <CommunityPostMedia mediaUrl={post.media_url} mediaType={post.media_type} mediaName={post.media_name} />
                          <div className="mt-4 flex items-center gap-2"><button type="button" onClick={() => reactToPost(post.id)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[11px] font-black text-white/65"><Heart className="h-3.5 w-3.5" />Support {Number(post.reactions || 0) > 0 ? `· ${post.reactions}` : ""}</button><span className="text-[11px] font-semibold text-white/35">{postComments.length} comments</span></div>
                        </>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="border-t border-white/[0.07] px-4 py-3">
                        {postComments.slice(-3).map((comment) => <div key={comment.id} className="mb-2 rounded-2xl bg-white/[0.035] px-3 py-2"><div className="flex items-center gap-2"><span className="text-[10px] font-black text-[#99f6e4]">{comment.author_name || "Member"}</span><span className="text-[9px] text-white/28">{formatTime(comment.created_at)}</span></div><p className="mt-1 text-xs font-semibold leading-5 text-white/68">{comment.body}</p></div>)}
                        <div className="flex items-center gap-2"><input value={commentDrafts[post.id] || ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addComment(post.id); } }} placeholder="Write a comment..." className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#071725] px-3 text-xs font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#22c7b8]/40" /><button type="button" onClick={() => addComment(post.id)} disabled={!String(commentDrafts[post.id] || "").trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22c7b8] text-[#042f2e] disabled:opacity-30"><Send className="h-3.5 w-3.5" /></button></div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
