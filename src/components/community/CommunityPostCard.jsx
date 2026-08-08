import { useEffect, useState } from "react";
import {
  CircleHelp,
  FileImage,
  Heart,
  HeartHandshake,
  Lightbulb,
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
import { backendRequest } from "@/lib/clara-backend-client";
import { uploadCommunityMedia, validateCommunityMediaFile } from "@/lib/community-media-client";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import SupportTierBadge from "@/components/support/SupportTierBadge";

const POST_TYPES = [
  { key: "win", label: "Win", icon: Trophy },
  { key: "question", label: "Question", icon: CircleHelp },
  { key: "struggle", label: "Struggle", icon: HeartHandshake },
  { key: "money_lesson", label: "Money Lesson", icon: Lightbulb },
];

const POST_TYPE_BY_KEY = Object.fromEntries(POST_TYPES.map((item) => [item.key, item]));

const REACTIONS = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "care", emoji: "🥰", label: "Care" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "angry", emoji: "😡", label: "Angry" },
];
const REACTION_BY_KEY = Object.fromEntries(REACTIONS.map((item) => [item.key, item]));
const PROFILE_REQUESTS = new Map();

function initialsFor(value) {
  return String(value || "CLARA Member")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "CL";
}

function formatTime(value) {
  if (!value) return "Just now";
  const delta = Date.now() - new Date(value).getTime();
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
  return validateCommunityMediaFile(file);
}

function AttachmentPicker({ onPick, disabled }) {
  const control = (accept, icon, label) => {
    const Icon = icon;
    return (
      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[10px] font-black text-white/65">
        <Icon className="h-3.5 w-3.5" /> {label}
        <input type="file" accept={accept} disabled={disabled} className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }} />
      </label>
    );
  };
  return <div className="flex flex-wrap items-center gap-2">{control("image/jpeg,image/png,image/webp,image/gif", FileImage, "Photo")}{control("video/mp4,video/webm,video/quicktime", Video, "Video")}{control(".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx", Paperclip, "File")}</div>;
}

function SelectedAttachment({ file, onRemove }) {
  if (!file) return null;
  const Icon = file.type?.startsWith("image/") ? FileImage : file.type?.startsWith("video/") ? Video : Paperclip;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#22c7b8]/20 bg-[#22c7b8]/[0.06] px-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22c7b8]/10 text-[#99f6e4]"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{file.name}</p><p className="text-[9px] text-white/35">{fileSizeLabel(file.size)}</p></div>
      <button type="button" onClick={onRemove} className="flex h-8 w-8 items-center justify-center text-white/45"><X className="h-4 w-4" /></button>
    </div>
  );
}

function reactionSummary(post) {
  const counts = post?.reaction_summary && typeof post.reaction_summary === "object" ? post.reaction_summary : {};
  const rows = REACTIONS.map((reaction) => ({ ...reaction, count: Math.max(0, Number(counts[reaction.key]) || 0) }))
    .filter((reaction) => reaction.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!rows.length && Number(post?.reactions || 0) > 0) return [{ ...REACTION_BY_KEY.like, count: Number(post.reactions) || 0 }];
  return rows;
}

function loadAuthorProfile(authorId, token) {
  const key = String(authorId || "");
  if (!key || !token) return Promise.resolve(null);
  if (PROFILE_REQUESTS.has(key)) return PROFILE_REQUESTS.get(key);
  const request = backendRequest(`/api/community/profiles/${encodeURIComponent(key)}`, { token })
    .catch(() => null)
    .finally(() => PROFILE_REQUESTS.delete(key));
  PROFILE_REQUESTS.set(key, request);
  return request;
}

export default function CommunityPostCard({ post, comments = [], currentUserId, token, openProfile, refresh, reportError }) {
  const ownsPost = String(post.author_id) === String(currentUserId);
  const postType = POST_TYPE_BY_KEY[post.post_type] || POST_TYPE_BY_KEY.win;
  const TypeIcon = postType.icon;
  const selectedReaction = REACTION_BY_KEY[post.my_reaction] || null;
  const summary = reactionSummary(post);
  const totalReactions = Math.max(0, Number(post.reactions) || summary.reduce((sum, item) => sum + item.count, 0));

  const [authorProfile, setAuthorProfile] = useState(null);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postSaving, setPostSaving] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentMenuId, setCommentMenuId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [commentSaving, setCommentSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setAuthorProfile(null);
    loadAuthorProfile(post.author_id, token).then((profile) => {
      if (active) setAuthorProfile(profile);
    });
    return () => { active = false; };
  }, [post.author_id, token]);

  const authorName = authorProfile?.display_name || authorProfile?.full_name || post.author_name || "CLARA Member";
  const authorAvatar = authorProfile?.avatar_url || post.author_avatar_url || "";
  const authorSupportTier = authorProfile?.support_tier || post.support_tier || null;

  const fail = (error, fallback) => {
    console.error("[Community]", error);
    reportError?.(error?.message || fallback);
  };

  const startPostEdit = () => {
    setPostMenuOpen(false);
    setEditingPost({
      body: post.body || "",
      postType: post.post_type || "win",
      existingMediaUrl: post.media_url || "",
      existingMediaType: post.media_type || "",
      existingMediaName: post.media_name || "",
      mediaFile: null,
      removeMedia: false,
    });
  };

  const savePost = async () => {
    if (!editingPost || postSaving) return;
    const text = String(editingPost.body || "").trim();
    const hasMedia = editingPost.mediaFile || (editingPost.existingMediaUrl && !editingPost.removeMedia);
    if (!text && !hasMedia) return reportError?.("A post needs text or an attachment.");
    try {
      setPostSaving(true);
      const media = editingPost.mediaFile ? await uploadCommunityMedia(editingPost.mediaFile) : null;
      await backendRequest(`/api/community/posts/${post.id}`, {
        method: "PATCH",
        token,
        body: {
          body: text,
          post_type: editingPost.postType,
          ...(media ? { media_url: media.media_url, media_type: media.media_type, media_name: media.media_name } : {}),
          remove_media: !media && editingPost.removeMedia,
        },
      });
      setEditingPost(null);
      await refresh();
    } catch (error) {
      fail(error, "Unable to edit that post.");
    } finally {
      setPostSaving(false);
    }
  };

  const deletePost = async () => {
    setPostMenuOpen(false);
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await backendRequest(`/api/community/posts/${post.id}`, { method: "DELETE", token });
      await refresh();
    } catch (error) {
      fail(error, "Unable to delete that post.");
    }
  };

  const react = async (reactionType) => {
    setReactionOpen(false);
    try {
      await backendRequest(`/api/community/posts/${post.id}/react`, {
        method: "POST",
        token,
        body: { reaction_type: reactionType },
      });
      await refresh();
    } catch (error) {
      fail(error, "Unable to react to that post.");
    }
  };

  const addComment = async () => {
    const text = commentDraft.trim();
    if (!text) return;
    try {
      await backendRequest("/api/community/comments", { method: "POST", token, body: { post_id: post.id, body: text } });
      setCommentDraft("");
      await refresh();
    } catch (error) {
      fail(error, "Unable to add that comment.");
    }
  };

  const saveComment = async () => {
    const text = String(editingComment?.body || "").trim();
    if (!editingComment?.id || !text || commentSaving) return;
    try {
      setCommentSaving(true);
      await backendRequest(`/api/community/comments/${editingComment.id}`, { method: "PATCH", token, body: { body: text } });
      setEditingComment(null);
      await refresh();
    } catch (error) {
      fail(error, "Unable to edit that comment.");
    } finally {
      setCommentSaving(false);
    }
  };

  const deleteComment = async (comment) => {
    setCommentMenuId(null);
    if (!window.confirm("Delete this comment?")) return;
    try {
      await backendRequest(`/api/community/comments/${comment.id}`, { method: "DELETE", token });
      await refresh();
    } catch (error) {
      fail(error, "Unable to delete that comment.");
    }
  };

  return (
    <article className="-mx-3 !mt-0 overflow-visible border-b border-white/10 bg-[#0a1a29] sm:mx-0 sm:!mt-4 sm:rounded-[22px] sm:border">
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => openProfile(post.author_id)} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 text-xs font-black text-[#ccfbf1]">{authorAvatar ? <img src={authorAvatar} alt={`${authorName} profile`} className="h-full w-full object-cover" /> : initialsFor(authorName)}</button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => openProfile(post.author_id)} className="max-w-full truncate text-left text-sm font-black">{authorName}</button>
              <SupportTierBadge tier={authorSupportTier} compact />
            </div>
            <div className="mt-1 flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-[#22c7b8]/16 bg-[#22c7b8]/8 px-2 py-1 text-[9px] font-black text-[#99f6e4]"><TypeIcon className="h-3 w-3" />{postType.label}</span><span className="text-[10px] font-semibold text-white/30">{formatTime(post.created_at)}{post.updated_at && post.updated_at !== post.created_at ? " · edited" : ""}</span></div>
          </div>
          {ownsPost ? <div className="relative"><button type="button" onClick={() => setPostMenuOpen((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45"><MoreHorizontal className="h-4 w-4" /></button>{postMenuOpen ? <div className="absolute right-0 top-10 z-30 w-36 rounded-2xl border border-white/10 bg-[#0d1f2e] p-1.5 shadow-2xl"><button type="button" onClick={startPostEdit} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white/75"><Pencil className="h-3.5 w-3.5" /> Edit post</button><button type="button" onClick={deletePost} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-300"><Trash2 className="h-3.5 w-3.5" /> Delete post</button></div> : null}</div> : null}
        </div>

        {editingPost ? <div className="mt-4 rounded-[18px] border border-[#22c7b8]/20 bg-[#071725] p-3">
          <div className="grid grid-cols-2 gap-2">{POST_TYPES.map((type) => { const Icon = type.icon; const selected = editingPost.postType === type.key; return <button key={type.key} type="button" onClick={() => setEditingPost((value) => ({ ...value, postType: type.key }))} className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border text-[9px] font-black ${selected ? "border-[#5eead4]/60 bg-[#22c7b8]/15 text-[#ccfbf1]" : "border-white/10 text-white/55"}`}><Icon className="h-3 w-3" />{type.label}</button>; })}</div>
          <textarea value={editingPost.body} onChange={(event) => setEditingPost((value) => ({ ...value, body: event.target.value }))} rows={4} className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-[#06111f] px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#22c7b8]/40" />
          {!editingPost.removeMedia && !editingPost.mediaFile && editingPost.existingMediaUrl ? <CommunityPostMedia mediaUrl={editingPost.existingMediaUrl} mediaType={editingPost.existingMediaType} mediaName={editingPost.existingMediaName} /> : null}
          <SelectedAttachment file={editingPost.mediaFile} onRemove={() => setEditingPost((value) => ({ ...value, mediaFile: null }))} />
          <div className="mt-3 flex flex-wrap gap-2"><AttachmentPicker disabled={postSaving} onPick={(file) => { try { setEditingPost((value) => ({ ...value, mediaFile: acceptFile(file), removeMedia: true })); } catch (error) { reportError?.(error.message); } }} />{editingPost.existingMediaUrl || editingPost.mediaFile ? <button type="button" onClick={() => setEditingPost((value) => ({ ...value, mediaFile: null, removeMedia: true }))} className="h-9 rounded-xl border border-red-400/15 px-3 text-[10px] font-black text-red-200">Remove attachment</button> : null}</div>
          <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditingPost(null)} className="h-9 px-3 text-[10px] font-black text-white/45">Cancel</button><Button onClick={savePost} disabled={postSaving} className="h-9 rounded-xl bg-[#22c7b8] px-4 text-[10px] font-black text-[#042f2e]">{postSaving ? "Saving..." : "Save changes"}</Button></div>
        </div> : <>
          {post.body ? <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/82">{post.body}</p> : null}
          <CommunityPostMedia mediaUrl={post.media_url} mediaType={post.media_type} mediaName={post.media_name} edgeToEdge />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="relative">
              {reactionOpen ? <div className="absolute bottom-11 left-0 z-30 flex items-center gap-0.5 rounded-full border border-white/10 bg-[#102436]/98 px-2 py-1.5 shadow-2xl backdrop-blur-xl">{REACTIONS.map((reaction) => <button key={reaction.key} type="button" title={reaction.label} onClick={() => react(reaction.key)} className={`flex h-9 w-9 items-center justify-center rounded-full text-[22px] transition hover:-translate-y-1 hover:scale-110 ${post.my_reaction === reaction.key ? "bg-white/10 ring-1 ring-[#5eead4]/35" : ""}`}>{reaction.emoji}</button>)}</div> : null}
              <button type="button" onClick={() => setReactionOpen((value) => !value)} className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[11px] font-black ${selectedReaction ? "border-[#22c7b8]/30 bg-[#22c7b8]/10 text-[#ccfbf1]" : "border-white/10 bg-white/[0.035] text-white/65"}`}>{selectedReaction ? <span className="text-base">{selectedReaction.emoji}</span> : <Heart className="h-3.5 w-3.5" />}{selectedReaction?.label || "React"}</button>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-white/35">{totalReactions > 0 ? <span className="inline-flex items-center gap-1"><span className="flex -space-x-1">{summary.slice(0, 3).map((reaction) => <span key={reaction.key} className="text-sm">{reaction.emoji}</span>)}</span>{totalReactions}</span> : null}<span>{comments.length} {comments.length === 1 ? "comment" : "comments"}</span></div>
          </div>
        </>}
      </div>

      {!editingPost ? <div className="border-t border-white/[0.07] px-4 py-3">
        {comments.slice(-3).map((comment) => {
          const ownsComment = String(comment.author_id) === String(currentUserId);
          const editing = String(editingComment?.id || "") === String(comment.id);
          const menuOpen = String(commentMenuId || "") === String(comment.id);
          const wasEdited = comment.updated_at && comment.created_at && String(comment.updated_at) !== String(comment.created_at);
          return <div key={comment.id} className="relative mb-2 rounded-2xl bg-white/[0.035] px-3 py-2.5"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => openProfile(comment.author_id)} className="text-[10px] font-black text-[#99f6e4]">{comment.author_name || "Member"}</button><SupportTierBadge tier={comment.support_tier} compact /><span className="text-[9px] text-white/28">{formatTime(comment.created_at)}{wasEdited ? " · edited" : ""}</span></div>{editing ? <div className="mt-2"><textarea autoFocus rows={2} value={editingComment.body} onChange={(event) => setEditingComment((value) => ({ ...value, body: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); saveComment(); } }} className="w-full resize-none rounded-xl border border-[#22c7b8]/25 bg-[#06111f] px-3 py-2 text-xs font-semibold leading-5 outline-none" /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingComment(null)} className="h-8 px-3 text-[10px] font-black text-white/45">Cancel</button><button type="button" onClick={saveComment} disabled={commentSaving || !String(editingComment.body || "").trim()} className="h-8 rounded-lg bg-[#22c7b8] px-3 text-[10px] font-black text-[#042f2e] disabled:opacity-40">{commentSaving ? "Saving..." : "Save"}</button></div></div> : <p className="mt-1 text-xs font-semibold leading-5 text-white/68">{comment.body}</p>}</div>{ownsComment && !editing ? <div className="relative"><button type="button" onClick={() => setCommentMenuId((value) => String(value || "") === String(comment.id) ? null : comment.id)} className="flex h-7 w-7 items-center justify-center text-white/30"><MoreHorizontal className="h-3.5 w-3.5" /></button>{menuOpen ? <div className="absolute right-0 top-8 z-30 w-32 rounded-xl border border-white/10 bg-[#102436] p-1 shadow-2xl"><button type="button" onClick={() => { setCommentMenuId(null); setEditingComment({ id: comment.id, body: comment.body || "" }); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold text-white/75"><Pencil className="h-3 w-3" /> Edit</button><button type="button" onClick={() => deleteComment(comment)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold text-red-300"><Trash2 className="h-3 w-3" /> Delete</button></div> : null}</div> : null}</div></div>;
        })}
        <div className="flex items-center gap-2"><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addComment(); } }} placeholder="Write a comment..." className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#071725] px-3 text-xs font-semibold outline-none placeholder:text-white/25 focus:border-[#22c7b8]/40" /><button type="button" onClick={addComment} disabled={!commentDraft.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22c7b8] text-[#042f2e] disabled:opacity-30"><Send className="h-3.5 w-3.5" /></button></div>
      </div> : null}
    </article>
  );
}
