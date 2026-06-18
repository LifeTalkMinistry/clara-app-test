import { useState } from "react";

const resolveAssetSrc = (assetPath) => {
  if (typeof assetPath !== "string" || assetPath.trim().length === 0) return "";

  const trimmedPath = assetPath.trim();

  if (
    trimmedPath.startsWith("http://") ||
    trimmedPath.startsWith("https://") ||
    trimmedPath.startsWith("data:") ||
    trimmedPath.startsWith("blob:")
  ) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith("/")) {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    return `${normalizedBaseUrl}${trimmedPath.replace(/^\/+/, "")}`;
  }

  return trimmedPath;
};

const interpolate = (from, to, progress) => from + (to - from) * progress;

const resolveBetweenStops = (value, center, near, far) => {
  const safeValue = Math.min(Math.abs(value), 2);

  if (safeValue <= 1) {
    return interpolate(center, near, safeValue);
  }

  return interpolate(near, far, safeValue - 1);
};

export default function LearningMaterialCard({
  item,
  isActive,
  isDragging = false,
  offset = 0,
  visible = true,
  position,
  total,
  onClick,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const absOffset = Math.abs(offset);
  const clampedOffset = Math.min(absOffset, 2);
  const direction = offset < 0 ? -1 : 1;

  const distanceMap = {
    0: 0,
    1: 142,
    2: 226,
  };

  const cardOffset = resolveBetweenStops(clampedOffset, distanceMap[0], distanceMap[1], distanceMap[2]);
  const translateX = `calc(-50% + ${direction * cardOffset}px)`;

  const scale = resolveBetweenStops(clampedOffset, 1, 0.85, 0.71);
  const rotateMagnitude = resolveBetweenStops(clampedOffset, 0, 6, 7);
  const rotate = clampedOffset === 0 ? 0 : offset < 0 ? rotateMagnitude : -rotateMagnitude;
  const origin = clampedOffset < 0.35 ? "center center" : offset < 0 ? "right center" : "left center";
  const depth = resolveBetweenStops(clampedOffset, 18, -18, -48);
  const opacity = visible ? resolveBetweenStops(clampedOffset, 1, 0.23, 0.07) : 0;
  const zIndex = Math.round(resolveBetweenStops(clampedOffset, 70, 42, 24));

  const width = resolveBetweenStops(clampedOffset, 184, 124, 100);
  const height = resolveBetweenStops(clampedOffset, 224, 188, 160);
  const pageEdgeWidth = resolveBetweenStops(clampedOffset, 4, 5, 5);
  const depthOffset = resolveBetweenStops(clampedOffset, 3, 2, 2);
  const contentLeftPadding = resolveBetweenStops(clampedOffset, 18, 12, 12);
  const rawThumbnailSrc = item?.thumbnail || "";
  const thumbnailSrc = resolveAssetSrc(rawThumbnailSrc);
  const hasThumbnail = Boolean(thumbnailSrc) && !imageFailed;
  const isCategory = item?.kind === "category" || item?.type === "category";
  const isUnderConstructionCategory = isCategory && item?.status !== "available";
  const isCuratedVideoLesson =
    item?.sourceType === "youtube" || item?.category === "money-foundations";
  const isMoneyFoundationsUploadedCover =
    hasThumbnail &&
    typeof rawThumbnailSrc === "string" &&
    (rawThumbnailSrc === "/learning-hub/money-foundations/category.png" ||
      rawThumbnailSrc.startsWith("/learning-hub/money-foundations/lesson-"));
  const shouldShowTextLayer =
    !isMoneyFoundationsUploadedCover && (isCategory || isCuratedVideoLesson || !hasThumbnail);
  const activeBadgeLabel = isCategory
    ? "Category"
    : item?.lessonNumber
      ? `Lesson ${item.lessonNumber}`
      : item?.featured
        ? "Featured"
        : item?.status === "coming-soon"
          ? "Coming Soon"
          : "Lesson";
  const coverLabel = isCategory
    ? item?.badge || item?.coverLabel || "Explore"
    : item?.coverLabel || item?.duration || "Guide";
  const ctaLabel = isCategory
    ? item?.contentTypeLabel || item?.ctaLabel || "Explore"
    : isCuratedVideoLesson && item?.status === "available"
      ? "Watch Lesson"
      : item?.type === "book"
        ? "Read"
        : item?.status === "available"
          ? "Start Lesson"
          : "Preview";
  const progressLabel = isCategory
    ? item?.progressText || item?.progressLabel || `${position} / ${total}`
    : item?.completed || item?.isCompleted || item?.status === "completed"
      ? "Done"
      : item?.progressText || `${position} / ${total}`;

  return (
    <div
      onClick={onClick}
      className="clara-learning-hub-card clara-learning-motion absolute left-1/2 top-1/2 cursor-pointer transition-[transform,opacity] duration-500 ease-out"
      style={{
        width,
        height,
        opacity,
        zIndex,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
        transformOrigin: origin,
        transformStyle: "preserve-3d",
        pointerEvents: visible ? "auto" : "none",
        transitionDuration: isDragging ? "0ms" : undefined,
        willChange: "transform, opacity",
      }}
    >
      <div className="relative h-full w-full overflow-visible" style={{ transformStyle: "preserve-3d" }}>
        <div
          className={`absolute rounded-[18px] transition-opacity duration-500 ${
            isActive ? "inset-4 bg-transparent opacity-100" : "inset-[1px] bg-cyan-50 opacity-[0.08]"
          }`}
          style={{
            transform: isActive
              ? "translate3d(0px, 2px, -18px)"
              : `translate3d(${depthOffset}px, ${depthOffset}px, -18px)`,
            filter: isActive ? "blur(6px)" : "none",
            boxShadow: isActive
              ? "0 16px 28px rgba(0,0,0,0.28)"
              : "0 10px 18px rgba(0,0,0,0.16)",
          }}
        />

        <div
          className={`relative z-10 h-full w-full overflow-hidden rounded-[18px] border transition-[border-color,background-color,box-shadow] duration-500 ${
            isActive
              ? "border-cyan-100/14 bg-slate-950 shadow-[0_16px_28px_rgba(0,0,0,0.28)]"
              : "border-cyan-200/8 bg-slate-950/84 shadow-[0_10px_18px_rgba(0,0,0,0.15)]"
          }`}
        >
          <div
            className={`absolute inset-0 transition duration-500 ${
              isUnderConstructionCategory ? "opacity-55 blur-[1.4px] saturate-[0.42]" : "opacity-100"
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_-20%_-22%,rgba(20,184,166,0.24),transparent_48%),radial-gradient(circle_at_88%_112%,rgba(99,102,241,0.17),transparent_58%),linear-gradient(135deg,rgba(5,38,55,0.98),rgba(7,20,48,0.97)_48%,rgba(37,13,74,0.94))] transition-opacity duration-500" />
            <div
              className={`absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/30 transition-opacity duration-500 ${
                isActive ? "opacity-100" : "opacity-42"
              }`}
            />
            <div className={`absolute inset-0 rounded-[18px] ring-1 ring-inset ${isActive ? "ring-white/5" : "ring-white/8"}`} />
            <div
              className={`absolute -right-10 -top-16 h-28 w-16 rotate-[28deg] bg-white/[0.045] blur-[1px] transition-opacity duration-500 ${
                isActive ? "opacity-80" : "opacity-20"
              }`}
            />
            <div
              className={`absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),transparent_56%)] transition-opacity duration-500 ${
                isActive ? "opacity-72" : "opacity-24"
              }`}
            />

            {hasThumbnail && (
              <div
                className="absolute inset-0 overflow-hidden rounded-[18px]"
                style={{
                  clipPath: "inset(0 round 18px)",
                  transform: "translateZ(0)",
                  backfaceVisibility: "hidden",
                }}
              >
                <img
                  src={thumbnailSrc}
                  alt={item?.title ? `${item.title} cover` : "Learning material cover"}
                  loading={isActive ? "eager" : "lazy"}
                  decoding="async"
                  className="block h-full w-full rounded-[18px] object-cover"
                  style={{
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                  }}
                  onError={() => {
                    setImageFailed(true);
                  }}
                />
              </div>
            )}

            {hasThumbnail && shouldShowTextLayer && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-black/20 to-black/72" />
            )}

            {shouldShowTextLayer && (
              <>
                <div
                  className={`absolute transition-opacity duration-500 ${
                    isActive ? "rounded-r-[10px] opacity-[0.22]" : "bottom-2 top-2 rounded-r-[12px] border-l border-cyan-50/8 opacity-18"
                  }`}
                  style={{
                    right: isActive ? 4 : 0,
                    top: isActive ? 12 : undefined,
                    bottom: isActive ? 12 : undefined,
                    width: pageEdgeWidth,
                    background: isActive
                      ? "linear-gradient(180deg, transparent, rgba(165,243,252,0.035) 16%, rgba(241,245,249,0.055) 50%, rgba(165,243,252,0.03) 84%, transparent)"
                      : "linear-gradient(90deg, rgba(241,245,249,0.12), rgba(165,243,252,0.075) 46%, rgba(15,23,42,0.16))",
                    boxShadow: isActive
                      ? "inset 1px 0 1px rgba(255,255,255,0.035)"
                      : "inset 1px 0 2px rgba(255,255,255,0.06), inset -1px 0 3px rgba(0,0,0,0.18)",
                  }}
                >
                  {!isActive && (
                    <>
                      <span className="absolute left-1 top-[22%] h-px w-[45%] rounded-full bg-cyan-50/16" />
                      <span className="absolute left-1 top-[39%] h-px w-[52%] rounded-full bg-cyan-50/12" />
                      <span className="absolute left-1 top-[57%] h-px w-[42%] rounded-full bg-cyan-50/10" />
                      <span className="absolute left-1 top-[73%] h-px w-[48%] rounded-full bg-cyan-50/9" />
                    </>
                  )}
                </div>

                <div
                  className="relative z-10 flex h-full flex-col text-white"
                  style={{
                    paddingTop: isActive ? 14 : 12,
                    paddingRight: isActive ? 13 : 11,
                    paddingBottom: isActive ? 13 : 12,
                    paddingLeft: contentLeftPadding,
                  }}
                >
                  <div>
                    {isActive && (
                      <div className="mb-2 inline-flex rounded-full border border-cyan-100/16 bg-white/[0.075] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {activeBadgeLabel}
                      </div>
                    )}
                    <div
                      className={`line-clamp-1 font-bold uppercase text-white/50 ${
                        isActive ? "text-[8.5px] tracking-[0.22em]" : "text-[7.5px] tracking-[0.18em]"
                      }`}
                    >
                      {coverLabel}
                    </div>
                  </div>

                  <div className={`${isActive ? "mt-auto mb-auto pt-5" : "mt-auto mb-auto pt-3"}`}>
                    <h3
                      className={`${
                        isActive
                          ? "text-[17px] leading-[1.08] line-clamp-3"
                          : clampedOffset <= 1.5
                            ? "text-[12.5px] leading-tight line-clamp-3"
                            : "text-[10.5px] leading-tight line-clamp-2"
                      } font-black text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.18)]`}
                    >
                      {item.title}
                    </h3>
                    {isActive && (
                      <p className="mt-2.5 line-clamp-2 text-[10px] leading-snug text-white/62">
                        {item.subtitle || "Read and learn."}
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.085] px-3 py-1.5 text-[9px] font-semibold text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        {ctaLabel}
                      </span>
                      <span className="shrink-0 rounded-full border border-cyan-100/14 bg-white/[0.045] px-2.5 py-1 text-[8.5px] font-semibold text-white/62">
                        {progressLabel}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {isUnderConstructionCategory && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4 text-center">
              <div
                className="inline-flex min-w-[136px] max-w-[calc(100%-18px)] flex-col items-center gap-1 rounded-[16px] border border-cyan-100/24 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_36px_rgba(0,0,0,0.52)]"
                style={{ backgroundColor: "#020617" }}
              >
                <span className="whitespace-nowrap text-[8px] font-black uppercase leading-none tracking-[0.18em] text-cyan-50">
                  UNDER CONSTRUCTION
                </span>
                {isActive && (
                  <span className="whitespace-nowrap text-[9px] font-semibold leading-none text-white/72">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
