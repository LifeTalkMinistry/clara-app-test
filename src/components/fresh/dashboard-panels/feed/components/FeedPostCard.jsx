import FeedCommentsSection from "@/components/fresh/dashboard-panels/feed/components/FeedCommentsSection";
import FeedMediaRenderer from "@/components/fresh/dashboard-panels/feed/components/FeedMediaRenderer";
import FeedPostHeader from "@/components/fresh/dashboard-panels/feed/components/FeedPostHeader";

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
}) {
  if (!post) return null;

  const liked = currentUser?.id && post.liked_by?.includes(currentUser.id);

  return (
    <article className="rounded-[30px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <FeedPostHeader
        post={post}
        currentUser={currentUser}
        onDeletePost={onDeletePost}
      />

      <div className="mt-3">
        {post.content ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-white/74">
            {post.content}
          </p>
        ) : null}

        <FeedMediaRenderer
          post={post}
          activeYoutubePosts={activeYoutubePosts}
          onActivateYoutubePost={onActivateYoutubePost}
        />

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
