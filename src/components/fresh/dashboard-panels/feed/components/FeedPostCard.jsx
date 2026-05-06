import { Trash2 } from "lucide-react";

import { FEED_CATEGORIES } from "@/components/fresh/dashboard-panels/feed/constants/feedCategories";
import FeedCommentsSection from "@/components/fresh/dashboard-panels/feed/components/FeedCommentsSection";
import FeedMediaRenderer from "@/components/fresh/dashboard-panels/feed/components/FeedMediaRenderer";
import {
  dashboardPanelFormatTime,
  dashboardPanelInitials,
} from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";

export default function FeedPostCard({
  post,
  currentUser,
  commentText = "",
  commentsOpen = false,
  savingComment = false,
  activeYoutubePosts = {},
  onLike,
  onDeletePost,
  onToggleComments,
  onCommentTextChange,
  onSubmitComment,
  onActivateYoutubePost,
  renderFeedMedia,
}) {
  if (!post) return null;

  const liked = currentUser?.id && post.liked_by?.includes(currentUser.id);
  const canDelete = currentUser?.id && post.author_id === currentUser.id;
  const mediaNode = renderFeedMedia ? (
    renderFeedMedia(post)
  ) : (
    <FeedMediaRenderer
      post={post}
      activeYoutubePosts={activeYoutubePosts}
      onActivateYoutubePost={onActivateYoutubePost}
    />
  );

  return (
    <article className="rounded-[30px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-black text-white">
            {dashboardPanelInitials(post.author_name)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {post.author_name}
            </p>
            <p className="mt-0.5 text-[11px] text-white/42">
              {dashboardPanelFormatTime(post.created_at)} •{" "}
              {FEED_CATEGORIES.find((item) => item.key === post.category)
                ?.label || "Update"}
            </p>
          </div>
        </div>

        {canDelete ? (
          <button
            type="button"
            onClick={() => onDeletePost?.(post)}
            className="shrink-0 rounded-full border border-white/15 bg-white/6 p-2 text-white/45 transition hover:bg-rose-500/10 hover:text-rose-200"
            aria-label="Delete post"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        {post.content ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-white/74">
            {post.content}
          </p>
        ) : null}

        {mediaNode}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onLike?.(post)}
            className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${
              liked
                ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-100"
                : "border-white/15 bg-white/6 text-white/60"
            }`}
          >
            {liked ? "Liked" : "Like"} • {post.likes}
          </button>
          <button
            type="button"
            onClick={() => onToggleComments?.(post.id)}
            className="rounded-2xl border border-white/15 bg-white/6 px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/10"
          >
            Comments • {post.comments?.length || 0}
          </button>
        </div>

        {commentsOpen ? (
          <FeedCommentsSection
            postId={post.id}
            comments={post.comments || []}
            commentText={commentText}
            savingComment={savingComment}
            onCommentTextChange={onCommentTextChange}
            onSubmitComment={onSubmitComment}
          />
        ) : null}
      </div>
    </article>
  );
}
