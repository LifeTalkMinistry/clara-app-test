import { Trash2 } from "lucide-react";

import { FEED_CATEGORIES } from "@/components/fresh/dashboard-panels/feed/constants/feedCategories";
import {
  dashboardPanelFormatTime,
  dashboardPanelInitials,
} from "@/components/fresh/dashboard-panels/feed/utils/feedHelpers";

export default function FeedPostHeader({ post, currentUser, onDeletePost }) {
  if (!post) return null;

  const canDelete = currentUser?.id && post.author_id === currentUser.id;
  const categoryLabel =
    FEED_CATEGORIES.find((item) => item.key === post.category)?.label || "Update";

  return (
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
            {dashboardPanelFormatTime(post.created_at)} • {categoryLabel}
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
  );
}
