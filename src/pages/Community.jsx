import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CircleHelp,
  Heart,
  HeartHandshake,
  Lightbulb,
  Lock,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";

const COMMUNITY_VIEWS = {
  FEED: "feed",
  NOTIFICATIONS: "notifications",
};

const COMMUNITY_POST_TYPES = [
  {
    key: "win",
    label: "Win",
    icon: Trophy,
    idleClass: "border-emerald-300/12 bg-emerald-300/[0.055] text-emerald-100/72",
    activeClass: "border-emerald-200/32 bg-emerald-300/[0.16] text-emerald-50 shadow-[0_8px_24px_rgba(16,185,129,0.10)]",
  },
  {
    key: "question",
    label: "Question",
    icon: CircleHelp,
    idleClass: "border-cyan-300/12 bg-cyan-300/[0.055] text-cyan-100/72",
    activeClass: "border-cyan-200/32 bg-cyan-300/[0.16] text-cyan-50 shadow-[0_8px_24px_rgba(34,211,238,0.10)]",
  },
  {
    key: "struggle",
    label: "Struggle",
    icon: HeartHandshake,
    idleClass: "border-violet-300/12 bg-violet-300/[0.055] text-violet-100/72",
    activeClass: "border-violet-200/32 bg-violet-300/[0.16] text-violet-50 shadow-[0_8px_24px_rgba(139,92,246,0.10)]",
  },
  {
    key: "money_lesson",
    label: "Money Lesson",
    icon: Lightbulb,
    idleClass: "border-amber-300/12 bg-amber-300/[0.055] text-amber-100/72",
    activeClass: "border-amber-200/32 bg-amber-300/[0.16] text-amber-50 shadow-[0_8px_24px_rgba(245,158,11,0.10)]",
  },
];

const COMMUNITY_POST_TYPE_BY_KEY = Object.fromEntries(
  COMMUNITY_POST_TYPES.map((item) => [item.key, item])
);

const COMMUNITY_POST_TYPE_MARKER = /^\[\[CLARA_POST_TYPE:(win|question|struggle|money_lesson)\]\]\s*/i;

function displayNameFor(user) {
  return (
    user?.nickname ||
    user?.display_name ||
    user?.full_name ||
    user?.email?.split("@")?.[0] ||
    "CLARA Member"
  );
}

function initialsFor(value) {
  const words = String(value || "CLARA")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]?.toUpperCase()).join("") || "CL";
}

function normalizeCommunityPostType(value) {
  const key = String(value || "").trim().toLowerCase();
  return COMMUNITY_POST_TYPE_BY_KEY[key] ? key : null;
}

function encodeCommunityPostBody(body, postType) {
  const normalizedType = normalizeCommunityPostType(postType);
  if (!normalizedType) return body;
  return `[[CLARA_POST_TYPE:${normalizedType}]]\n${body}`;
}

function decodeCommunityPost(post) {
  const rawBody = String(post?.body || "");
  const storedType = normalizeCommunityPostType(post?.post_type);
  const markerMatch = rawBody.match(COMMUNITY_POST_TYPE_MARKER);
  const markerType = normalizeCommunityPostType(markerMatch?.[1]);

  return {
    body: markerMatch ? rawBody.replace(COMMUNITY_POST_TYPE_MARKER, "") : rawBody,
    postType: storedType || markerType,
  };
}

function isMissingPostTypeColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  return (
    code === "PGRST204" ||
    (message.includes("post_type") &&
      (message.includes("column") || message.includes("schema cache")))
  );
}

function formatCommunityTime(value) {
  if (!value) return "Just now";
  try {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

export default function Community() {
  const navigate = useNavigate();
  const { user, access, isAdmin, isFree, isPending } = useUserRole();
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [selectedPostType, setSelectedPostType] = useState("win");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState(COMMUNITY_VIEWS.FEED);

  const isLocked = isFree || isPending || !access.community;
  const canPost = isAdmin || access.communityPosting;
  const canMessageMembers = isAdmin || Boolean(access?.messagingFull);
  const currentUserName = displayNameFor(user);

  const loadCommunity = useCallback(async () => {
    if (isLocked) return;

    const [postRes, commentRes] = await Promise.all([
      supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("community_comments")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    if (!postRes.error) setPosts(postRes.data || []);
    if (!commentRes.error) setComments(commentRes.data || []);
  }, [isLocked]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  useEffect(() => {
    if (isLocked) return undefined;

    const channel = supabase
      .channel("community-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        loadCommunity
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_comments" },
        loadCommunity
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isLocked, loadCommunity]);

  const commentsByPost = useMemo(() => {
    return comments.reduce((acc, comment) => {
      const key = String(comment.post_id || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const createPost = async () => {
    const text = body.trim();
    if (!text || !canPost || !user?.id) return;

    try {
      setSaving(true);

      const basePayload = {
        body: text,
        author_id: user.id,
        author_email: user.email,
        author_name: currentUserName,
        status: "active",
      };

      let insertResult = await supabase.from("community_posts").insert([
        {
          ...basePayload,
          post_type: selectedPostType,
        },
      ]);

      // Older Community tables may not have post_type yet. In that case, keep
      // the category in a small hidden body envelope so the feature works now
      // without breaking existing installs or legacy posts.
      if (insertResult.error && isMissingPostTypeColumnError(insertResult.error)) {
        insertResult = await supabase.from("community_posts").insert([
          {
            ...basePayload,
            body: encodeCommunityPostBody(text, selectedPostType),
          },
        ]);
      }

      if (insertResult.error) throw insertResult.error;

      setBody("");
      setSelectedPostType("win");
      await loadCommunity();
    } catch (error) {
      console.error("Failed to create community post:", error);
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (postId) => {
    const text = String(commentDrafts[postId] || "").trim();
    if (!text || !user?.id || isLocked) return;

    const { error } = await supabase.from("community_comments").insert([
      {
        post_id: postId,
        body: text,
        author_id: user.id,
        author_email: user.email,
        author_name: currentUserName,
      },
    ]);

    if (!error) {
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      await loadCommunity();
    }
  };

  const reactToPost = async (post) => {
    if (!user?.id || isLocked) return;

    const reactions = Number(post.reactions || 0) + 1;
    const { error } = await supabase
      .from("community_posts")
      .update({ reactions, updated_at: new Date().toISOString() })
      .eq("id", post.id);

    if (!error) await loadCommunity();
  };

  const openMemberMessage = (post) => {
    if (!post?.author_id || post.author_id === user?.id) return;
    navigate(`/messages?userId=${encodeURIComponent(post.author_id)}`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(79,70,229,0.16),transparent_34%),#020817] text-white">
      <header className="relative z-30 shrink-0 border-b border-white/10 bg-[#020817]/88 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-2xl sm:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.09]"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100/46">
              CLARA
            </p>
            <h1 className="truncate text-[17px] font-black tracking-[-0.025em] text-white sm:text-xl">
              Community
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/messages"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/82 transition hover:bg-white/[0.09]"
              aria-label="Open private messages"
              title="Messages"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
            </Link>

            <button
              type="button"
              onClick={() =>
                setActiveView((current) =>
                  current === COMMUNITY_VIEWS.NOTIFICATIONS
                    ? COMMUNITY_VIEWS.FEED
                    : COMMUNITY_VIEWS.NOTIFICATIONS
                )
              }
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                activeView === COMMUNITY_VIEWS.NOTIFICATIONS
                  ? "border-cyan-200/30 bg-cyan-300/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.055] text-white/82 hover:bg-white/[0.09]"
              }`}
              aria-label="Community notifications"
              title="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>

            <Link
              to="/profile"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.09] text-[11px] font-black text-emerald-100 transition hover:bg-emerald-300/[0.14]"
              aria-label="Open your Profile and Me information"
              title="Profile"
            >
              {initialsFor(currentUserName)}
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-[calc(env(safe-area-inset-bottom)+30px)] pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
        <div className="mx-auto w-full max-w-5xl">
          {activeView === COMMUNITY_VIEWS.NOTIFICATIONS ? (
            <section className="mx-auto max-w-2xl rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100/15 bg-cyan-300/[0.09] text-cyan-100">
                <Bell className="h-5 w-5" />
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/48">
                Community Notifications
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">
                Your community activity will live here.
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/58">
                Replies, reactions, mentions, and community announcements will be collected in this space. This first draft keeps the notification surface ready without mixing it into your private messages.
              </p>
              <button
                type="button"
                onClick={() => setActiveView(COMMUNITY_VIEWS.FEED)}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white/82 transition hover:bg-white/[0.1]"
              >
                Back to Community Feed
              </button>
            </section>
          ) : isLocked ? (
            <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,24,39,0.98),rgba(10,26,48,0.98)_52%,rgba(37,26,72,0.96))] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.36)] sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.07] text-cyan-100">
                <Lock className="h-6 w-6" />
              </div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/48">
                Private Member Space
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white">
                CLARA Community
              </h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-white/62">
                A private space for people who want to build better money habits together—share progress, ask questions, encourage each other, and continue conversations privately when needed.
              </p>
              <Link to="/enroll" className="mt-6 block">
                <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-black text-white">
                  Unlock Community
                </Button>
              </Link>
            </section>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-4">
                <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,21,38,0.92),rgba(13,30,51,0.88))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5">
                  <div className="flex items-center gap-3">
                    <Link
                      to="/profile"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.09] text-xs font-black text-emerald-100"
                      title="Open Profile"
                    >
                      {initialsFor(currentUserName)}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">
                        {currentUserName}
                      </p>
                      <p className="text-[11px] font-semibold text-white/42">
                        Share a win, question, struggle, or money lesson.
                      </p>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-full border border-emerald-300/12 bg-emerald-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-100/72 sm:flex">
                      <ShieldCheck className="h-3 w-3" />
                      Members only
                    </div>
                  </div>

                  {canPost ? (
                    <>
                      <div className="mt-4">
                        <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
                          What are you sharing?
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {COMMUNITY_POST_TYPES.map((postType) => {
                            const TypeIcon = postType.icon;
                            const isSelected = selectedPostType === postType.key;

                            return (
                              <button
                                key={postType.key}
                                type="button"
                                onClick={() => setSelectedPostType(postType.key)}
                                aria-pressed={isSelected}
                                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-black transition ${
                                  isSelected ? postType.activeClass : postType.idleClass
                                }`}
                              >
                                <TypeIcon className="h-3.5 w-3.5" />
                                {postType.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="What's happening with your money journey?"
                        className="mt-3 w-full resize-none rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/30 focus:border-cyan-200/20"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold text-white/34">
                          Keep it supportive, useful, and respectful.
                        </p>
                        <Button
                          onClick={createPost}
                          disabled={saving || !body.trim()}
                          className="h-10 rounded-2xl bg-cyan-400 px-4 font-black text-slate-950 hover:bg-cyan-300"
                        >
                          {saving ? "Posting..." : "Post"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-white/48">
                      Your current membership can read and participate in allowed conversations, but creating new posts is not enabled yet.
                    </div>
                  )}
                </section>

                {posts.length === 0 ? (
                  <section className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] px-5 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-100/72">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">
                      Start the first conversation.
                    </h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-white/45">
                      Small wins count here. Questions count too. The goal is accountability—not perfection.
                    </p>
                  </section>
                ) : null}

                {posts.map((post) => {
                  const postAuthor =
                    post.author_name || post.author_email || "CLARA Member";
                  const postComments = commentsByPost[String(post.id)] || [];
                  const canOpenPrivateMessage =
                    canMessageMembers &&
                    post.author_id &&
                    String(post.author_id) !== String(user?.id || "");
                  const decodedPost = decodeCommunityPost(post);
                  const postTypeMeta = decodedPost.postType
                    ? COMMUNITY_POST_TYPE_BY_KEY[decodedPost.postType]
                    : null;
                  const PostTypeIcon = postTypeMeta?.icon;

                  return (
                    <article
                      key={post.id}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-[#071120]/92 shadow-[0_16px_44px_rgba(0,0,0,0.2)]"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-300/15 via-cyan-300/10 to-violet-400/15 text-xs font-black text-white">
                            {initialsFor(postAuthor)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">
                              {postAuthor}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-white/36">
                              {formatCommunityTime(post.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/36 transition hover:bg-white/[0.05] hover:text-white/70"
                            aria-label="Post options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        {postTypeMeta && PostTypeIcon ? (
                          <div
                            className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${postTypeMeta.idleClass}`}
                          >
                            <PostTypeIcon className="h-3 w-3" />
                            {postTypeMeta.label}
                          </div>
                        ) : null}

                        <p className="mt-4 whitespace-pre-wrap text-[14px] font-semibold leading-7 text-white/78">
                          {decodedPost.body}
                        </p>

                        <div className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-3">
                          <button
                            type="button"
                            onClick={() => reactToPost(post)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-black text-white/54 transition hover:bg-white/[0.05] hover:text-rose-200"
                          >
                            <Heart className="h-4 w-4" />
                            {Number(post.reactions || 0)}
                          </button>
                          <span className="inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-black text-white/48">
                            <MessageSquare className="h-4 w-4" />
                            {postComments.length}
                          </span>

                          {canOpenPrivateMessage ? (
                            <button
                              type="button"
                              onClick={() => openMemberMessage(post)}
                              className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-100/10 bg-cyan-300/[0.06] px-3 text-xs font-black text-cyan-100/72 transition hover:bg-cyan-300/[0.11] hover:text-cyan-50"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="border-t border-white/[0.07] bg-black/10 px-4 py-3 sm:px-5">
                        {postComments.length ? (
                          <div className="mb-3 space-y-2.5">
                            {postComments.map((comment) => (
                              <div key={comment.id} className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[9px] font-black text-white/62">
                                  {initialsFor(comment.author_name || "Member")}
                                </div>
                                <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.045] px-3 py-2.5">
                                  <p className="text-[11px] font-black text-white/82">
                                    {comment.author_name || "Member"}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold leading-5 text-white/58">
                                    {comment.body}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <input
                            value={commentDrafts[post.id] || ""}
                            onChange={(event) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [post.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                addComment(post.id);
                              }
                            }}
                            placeholder="Write a reply..."
                            className="h-10 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-white outline-none placeholder:text-white/28 focus:border-cyan-200/18"
                          />
                          <button
                            type="button"
                            onClick={() => addComment(post.id)}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.08] text-cyan-100/76 transition hover:bg-cyan-300/[0.14]"
                            aria-label="Send reply"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="hidden space-y-4 lg:block">
                <section className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-cyan-100/82">
                    <Users className="h-4 w-4" />
                    <p className="text-xs font-black uppercase tracking-[0.14em]">
                      Community
                    </p>
                  </div>
                  <h3 className="mt-3 text-lg font-black tracking-[-0.025em] text-white">
                    Better money habits, together.
                  </h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/46">
                    Use the feed for group conversations. Move to Messages when a conversation becomes personal.
                  </p>
                </section>

                <Link
                  to="/messages"
                  className="block rounded-[26px] border border-cyan-100/12 bg-[linear-gradient(145deg,rgba(8,31,48,0.9),rgba(25,25,63,0.9))] p-4 transition hover:border-cyan-100/20"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-100/12 bg-cyan-300/[0.08] text-cyan-100">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-black text-white">Private Messages</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/44">
                    Your inbox is always one tap away from Community.
                  </p>
                </Link>

                <Link
                  to="/profile"
                  className="block rounded-[26px] border border-white/10 bg-white/[0.035] p-4 transition hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/14 bg-emerald-300/[0.07] text-emerald-100">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Your Profile</p>
                      <p className="text-[10px] font-semibold text-white/38">ME lives here now</p>
                    </div>
                  </div>
                </Link>

                <div className="rounded-[26px] border border-emerald-300/10 bg-emerald-300/[0.045] p-4">
                  <div className="flex items-center gap-2 text-emerald-100/78">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-xs font-black">Community principle</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/44">
                    Encourage progress. Ask before assuming. Protect private financial details.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
