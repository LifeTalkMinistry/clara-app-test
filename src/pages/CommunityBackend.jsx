import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CircleHelp,
  FileImage,
  Heart,
  HeartHandshake,
  Lightbulb,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  Sparkles,
  Trophy,
  UsersRound,
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
import { uploadCommunityMedia, validateCommunityMediaFile } from "@/lib/community-media-client";
import CommunityPostCard from "@/components/community/CommunityPostCard";

const POST_TYPES = [
  { key: "win", label: "Win", icon: Trophy },
  { key: "question", label: "Question", icon: CircleHelp },
  { key: "struggle", label: "Struggle", icon: HeartHandshake },
  { key: "money_lesson", label: "Tip", icon: Lightbulb },
];

const FEED_FILTERS = [
  { key: "all", label: "All", icon: null },
  { key: "win", label: "Wins", icon: Trophy },
  { key: "question", label: "Questions", icon: CircleHelp },
  { key: "money_lesson", label: "Tips", icon: Lightbulb },
];

function initialsFor(value) {
  return String(value || "CLARA Member")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "CL";
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

function AttachmentPicker({ onPick, disabled = false }) {
  const picker = (accept, Icon, label) => (
    <label
      key={label}
      className="clara-community-attachment-button inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[10px] font-black text-white/55 transition hover:border-[#2dd4cf]/35 hover:bg-[#2dd4cf]/[0.06] hover:text-[#cffffb]"
      title={label}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </label>
  );

  return (
    <div className="flex items-center gap-2">
      {picker("image/jpeg,image/png,image/webp,image/gif", FileImage, "Photo")}
      {picker("video/mp4,video/webm,video/quicktime", Video, "Video")}
      {picker(".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx", Paperclip, "File")}
    </div>
  );
}

function SelectedAttachment({ file, onRemove }) {
  if (!file) return null;
  const Icon = file.type?.startsWith("image/")
    ? FileImage
    : file.type?.startsWith("video/")
      ? Video
      : Paperclip;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#2dd4cf]/20 bg-[#2dd4cf]/[0.07] px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2dd4cf]/12 text-[#8ffbf4]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-white">{file.name}</p>
        <p className="mt-0.5 text-[9px] font-semibold text-white/35">{fileSizeLabel(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.07] hover:text-white"
        aria-label="Remove attachment"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CommunityBackend() {
  const navigate = useNavigate();
  const composerRef = useRef(null);
  const { access, isAdmin, isFree, isPending } = useUserRole();
  const backendUser = getStoredBackendUser();
  const token = getStoredBackendToken();
  const currentUserId = backendUser?.id || null;
  const currentUserName = backendUser?.name || backendUser?.email || "CLARA Member";
  const isLocked = isFree || isPending || !access.community;
  const canPost = isAdmin || access.communityPosting;

  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [selectedPostType, setSelectedPostType] = useState("win");
  const [feedFilter, setFeedFilter] = useState("all");
  const [mediaFile, setMediaFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
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

  useEffect(() => {
    if (isLocked || !token) return;
    loadFeed();
  }, [isLocked, loadFeed, token]);

  useEffect(() => {
    if (!token || isLocked) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "hidden") loadFeed();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isLocked, loadFeed, token]);

  const commentsByPost = useMemo(
    () => comments.reduce((acc, comment) => {
      const key = String(comment.post_id || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(comment);
      return acc;
    }, {}),
    [comments]
  );

  const filteredPosts = useMemo(
    () => (feedFilter === "all" ? posts : posts.filter((post) => post.post_type === feedFilter)),
    [feedFilter, posts]
  );

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
          ...(media
            ? {
                media_url: media.media_url,
                media_type: media.media_type,
                media_name: media.media_name,
              }
            : {}),
        },
      });
      setBody("");
      setSelectedPostType("win");
      setMediaFile(null);
      setComposerOpen(false);
      setFeedFilter("all");
      await loadFeed();
    } catch (error) {
      console.error("[Community] post failed:", error);
      setActionError(error?.message || "Unable to publish that post.");
    } finally {
      setSaving(false);
    }
  };

  const openProfile = (authorId) => {
    if (String(authorId) === String(currentUserId)) navigate("/profile");
    else navigate(`/users/${encodeURIComponent(authorId)}`);
  };

  const openComposer = () => {
    setComposerOpen(true);
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  if (!token || !currentUserId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#06111f] px-6 text-white">
        <div className="max-w-sm text-center">
          <Lock className="mx-auto h-8 w-8 text-[#5eead4]/60" />
          <h2 className="mt-4 text-xl font-black">Community needs your CLARA account connection.</h2>
          <p className="mt-2 text-sm text-white/50">Sign in again to reconnect your online Community account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_8%,rgba(79,70,229,0.16),transparent_30%),radial-gradient(circle_at_12%_22%,rgba(20,184,166,0.09),transparent_30%),#06111f] text-white">
      <main className="clara-community-feed-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-5 sm:px-6 sm:pt-7">
        <div className="mx-auto w-full max-w-3xl">
          {actionError ? (
            <div className="mb-5 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-100">
              {actionError}
            </div>
          ) : null}

          {isLocked ? (
            <section className="rounded-[28px] border border-white/10 bg-[#0a1a29] p-6 shadow-2xl shadow-black/20">
              <Lock className="h-7 w-7 text-[#5eead4]/60" />
              <h2 className="mt-4 text-2xl font-black">CLARA Community</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">This private Community is available to eligible CLARA members.</p>
              <Link to="/enroll" className="mt-5 block">
                <Button className="h-12 w-full rounded-2xl bg-[#22c7b8] font-black text-[#042f2e]">Unlock Community</Button>
              </Link>
            </section>
          ) : (
            <>
              <section className="relative mb-6 min-h-[124px] overflow-hidden rounded-[28px] border border-white/[0.04] bg-white/[0.015] px-5 py-5 sm:min-h-[138px] sm:px-7 sm:py-6">
                <div className="relative z-10 max-w-[72%] sm:max-w-[62%]">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#5eead4]/70">
                    <Sparkles className="h-3.5 w-3.5" /> CLARA Together
                  </p>
                  <h1 className="text-[32px] font-black leading-none tracking-[-0.045em] sm:text-[38px]">Community</h1>
                  <p className="mt-3 text-[13px] font-semibold leading-5 text-white/50 sm:text-sm">
                    Grow with people building better money habits.
                  </p>
                </div>

                <div className="pointer-events-none absolute right-1 top-1/2 h-28 w-32 -translate-y-1/2 sm:right-6 sm:h-32 sm:w-40">
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2dd4cf]/12 blur-2xl" />
                  <div className="absolute left-[38%] top-[36%] h-14 w-14 rounded-full bg-[#22d3ee]/20 blur-xl" />
                  <div className="absolute right-[10%] top-[28%] h-14 w-14 rounded-full bg-[#7c5cff]/22 blur-xl" />
                  <div className="absolute left-[22%] top-[18%] h-[72%] w-[72%] rotate-[-14deg] rounded-[50%] border border-[#28e6df]/45 shadow-[0_0_18px_rgba(45,212,207,0.22)]" />
                  <div className="absolute left-[32%] top-[24%] h-[62%] w-[70%] rotate-[22deg] rounded-[50%] border border-[#756cff]/40" />
                  <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(27,212,203,0.28),rgba(112,91,255,0.28))] shadow-[0_0_30px_rgba(45,212,207,0.16)] backdrop-blur-sm">
                    <UsersRound className="h-8 w-8 text-[#a9fffa]" />
                  </div>
                  <span className="absolute right-[8%] top-[14%] h-2.5 w-2.5 rounded-full bg-[#54fff5] shadow-[0_0_13px_rgba(84,255,245,0.85)]" />
                  <span className="absolute bottom-[12%] left-[12%] h-2 w-2 rounded-full bg-[#7d6dff] shadow-[0_0_12px_rgba(125,109,255,0.9)]" />
                </div>
              </section>

              {canPost ? (
                <section
                  ref={composerRef}
                  className="clara-community-composer mb-6 rounded-[28px] border border-[#50e3dc]/20 bg-[linear-gradient(135deg,rgba(11,31,50,0.98),rgba(9,21,49,0.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22),0_0_32px_rgba(45,212,207,0.04)] sm:p-5"
                  data-composer-open={composerOpen ? "true" : "false"}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#42e7df]/25 bg-[#1dd4cc]/[0.08] shadow-[inset_0_0_20px_rgba(45,212,207,0.07)]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[#43eee5]/65 text-[#50f2e9] shadow-[0_0_18px_rgba(45,212,207,0.18)]">
                        <Heart className="h-4 w-4 fill-[#50f2e9]/20" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <textarea
                        rows={composerOpen ? 3 : 1}
                        value={body}
                        onFocus={() => setComposerOpen(true)}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="Share your win, question, or money thought..."
                        className="w-full resize-none bg-transparent px-1 py-2 text-[15px] font-semibold leading-6 text-white outline-none placeholder:text-white/38 sm:text-base"
                      />

                      {composerOpen ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {POST_TYPES.map((postType) => {
                            const Icon = postType.icon;
                            const selected = selectedPostType === postType.key;
                            return (
                              <button
                                key={postType.key}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setSelectedPostType(postType.key)}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black transition ${
                                  selected
                                    ? "border-[#9afff8] bg-[#31d8d1] text-[#032f34] shadow-[0_0_18px_rgba(49,216,209,0.22)]"
                                    : "border-white/10 bg-white/[0.035] text-white/48 hover:border-white/20 hover:text-white/70"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" /> {postType.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <SelectedAttachment file={mediaFile} onRemove={() => setMediaFile(null)} />

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                    <AttachmentPicker onPick={pickComposerMedia} disabled={saving} />
                    <Button
                      onClick={createPost}
                      disabled={saving || (!body.trim() && !mediaFile)}
                      className="h-11 shrink-0 rounded-full border border-white/10 bg-[linear-gradient(90deg,#23d7ce,#2aa9f4)] px-6 text-sm font-black text-white shadow-[0_8px_24px_rgba(34,211,238,0.16)] disabled:opacity-35"
                    >
                      {saving ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </section>
              ) : null}

              <div className="mb-7 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FEED_FILTERS.map((filter) => {
                  const Icon = filter.icon;
                  const selected = feedFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setFeedFilter(filter.key)}
                      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[12px] font-black transition ${
                        selected
                          ? "border-[#83fff8] bg-[#20d4cd] text-[#033438] shadow-[0_0_0_1px_rgba(131,255,248,0.22),0_0_24px_rgba(32,212,205,0.18)]"
                          : "border-white/[0.08] bg-[#0a1930]/75 text-white/50 hover:border-white/15 hover:text-white/75"
                      }`}
                    >
                      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                      {filter.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => navigate("/community?view=circles")}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0a1930]/75 px-4 text-[12px] font-black text-white/50 transition hover:border-[#7c6cff]/30 hover:text-[#b9b2ff]"
                >
                  <UsersRound className="h-3.5 w-3.5" /> Circles
                </button>
              </div>

              {posts.length === 0 ? (
                <section className="rounded-[26px] border border-white/[0.06] bg-white/[0.02] py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/8 text-[#99f6e4]">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-black">Start the first conversation.</h3>
                  <p className="mx-auto mt-2 max-w-sm px-6 text-sm font-semibold leading-6 text-white/42">
                    Small wins count here. Questions count too. The goal is accountability—not perfection.
                  </p>
                </section>
              ) : filteredPosts.length === 0 ? (
                <section className="rounded-[26px] border border-white/[0.06] bg-white/[0.02] py-12 text-center">
                  <BarChart3 className="mx-auto h-7 w-7 text-[#5eead4]/45" />
                  <h3 className="mt-4 text-base font-black">No posts in this filter yet.</h3>
                  <p className="mt-1 text-xs font-semibold text-white/38">Try All or start a new conversation.</p>
                </section>
              ) : (
                <div className="space-y-5">
                  {filteredPosts.map((post) => (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      comments={commentsByPost[String(post.id)] || []}
                      currentUserId={currentUserId}
                      token={token}
                      openProfile={openProfile}
                      refresh={loadFeed}
                      reportError={setActionError}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {!isLocked && canPost ? (
        <button
          type="button"
          onClick={openComposer}
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(135deg,#23d7ce,#5b5df6)] text-white shadow-[0_14px_40px_rgba(35,215,206,0.28)] transition active:scale-95 sm:right-7"
          aria-label="Create a Community post"
        >
          <Plus className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
