import { ChevronRight, Image as ImageIcon, Plus, X } from "lucide-react";
import { FEED_CATEGORIES } from "@/components/fresh/dashboard-panels/feed/constants/feedCategories";

export default function FeedComposer({
  composerOpen,
  onToggleComposer,
  currentUserName = "You",
  newPost,
  onNewPostChange,
  selectedCategory,
  onSelectedCategoryChange,
  composerMedia,
  onClearMedia,
  youtubeLink,
  onYoutubeLinkChange,
  onApplyYoutubeLink,
  onFileSelect,
  onPost,
  posting = false,
  canPost = false,
  onResetComposer,
  error = "",
}) {
  return (
    <div className="rounded-[30px] border border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),rgba(255,255,255,0.055)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <button
        type="button"
        onClick={onToggleComposer}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/6 px-3 py-3 text-left transition hover:bg-white/8 ${composerOpen ? "mb-3" : ""}`}
        aria-expanded={composerOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
            <Plus className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Share something</p>
            <p className="text-xs text-white/55">Win, question, advice, or update</p>
          </div>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-white/45 transition ${composerOpen ? "rotate-90" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          composerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!composerOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3">
            <textarea
              value={newPost}
              onChange={(event) => onNewPostChange?.(event.target.value)}
              placeholder={`What's happening, ${currentUserName}?`}
              maxLength={280}
              className="min-h-[96px] w-full resize-none rounded-[22px] border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/35"
            />

            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FEED_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => onSelectedCategoryChange?.(category.key)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold transition ${
                    selectedCategory === category.key
                      ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
                      : "border-white/15 bg-white/6 text-white/55"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {composerMedia ? (
              <div className="rounded-[22px] border border-white/15 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold text-white/70">
                    {composerMedia.name || "Attached media"}
                  </p>
                  <button
                    type="button"
                    onClick={onClearMedia}
                    className="rounded-full bg-white/10 p-1 text-white/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {composerMedia.type === "image" ? (
                  <img
                    src={composerMedia.url || composerMedia.thumbnailUrl}
                    alt="Composer media"
                    className="max-h-[220px] w-full rounded-2xl object-cover"
                  />
                ) : composerMedia.type === "video" ? (
                  <video
                    src={composerMedia.url}
                    controls
                    playsInline
                    className="max-h-[220px] w-full rounded-2xl bg-black"
                  />
                ) : (
                  <img
                    src={composerMedia.thumbnailUrl}
                    alt="YouTube preview"
                    className="max-h-[220px] w-full rounded-2xl object-cover"
                  />
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/70 transition hover:bg-white/12">
                <ImageIcon className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={onFileSelect}
                  className="hidden"
                />
              </label>

              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-white/6 px-3 py-2">
                <input
                  value={youtubeLink}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onYoutubeLinkChange?.(nextValue);
                    onApplyYoutubeLink?.(nextValue, { silent: true });
                  }}
                  onPaste={(event) => {
                    const pastedValue = event.clipboardData?.getData("text") || "";
                    if (pastedValue) {
                      onApplyYoutubeLink?.(pastedValue, { silent: true });
                    }
                  }}
                  placeholder="Paste YouTube link"
                  className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
                />
              </div>

              <button
                type="button"
                onClick={onPost}
                disabled={posting || !canPost}
                className="h-11 rounded-2xl bg-emerald-400 px-4 text-xs font-black text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] disabled:opacity-45"
              >
                {posting ? "Posting" : "Post"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] text-white/40">
              <span>{newPost.length}/280</span>
              <button
                type="button"
                onClick={onResetComposer}
                className="font-semibold text-white/50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
