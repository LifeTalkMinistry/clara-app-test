import { dashboardPanelFormatTime } from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";

export default function FeedCommentsSection({
  postId,
  comments = [],
  commentText = "",
  savingComment = false,
  onCommentTextChange,
  onSubmitComment,
}) {
  const trimmedComment = commentText.trim();

  return (
    <div className="mt-4 space-y-3">
      {comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-white/15 bg-black/16 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-bold text-white/75">
                  {comment.author_name}
                </p>
                <span className="shrink-0 text-[10px] text-white/35">
                  {dashboardPanelFormatTime(comment.created_at)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/62">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-white/15 bg-black/14 px-3 py-3 text-center text-xs text-white/45">
          No comments yet.
        </p>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/6 px-3 py-2">
        <input
          value={commentText}
          onChange={(event) => onCommentTextChange?.(postId, event.target.value)}
          placeholder="Write a comment..."
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmitComment?.(postId);
            }
          }}
        />
        <button
          type="button"
          onClick={() => onSubmitComment?.(postId)}
          disabled={savingComment || !trimmedComment}
          className="rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-black text-slate-950 disabled:opacity-45"
        >
          Send
        </button>
      </div>
    </div>
  );
}
