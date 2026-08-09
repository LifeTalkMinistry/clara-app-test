import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, UsersRound } from "lucide-react";
import { backendRequest } from "@/lib/clara-backend-client";
import AuthenticatedCommunityImage from "@/components/community/AuthenticatedCommunityImage";

const ROTATE_MS = 4500;
const SWIPE_THRESHOLD = 45;

function CommunityFallbackHero() {
  return (
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
  );
}

export default function CommunityBoard({ token, navigate }) {
  const touchStartXRef = useRef(null);
  const movedRef = useRef(false);
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const loadBoard = useCallback(async () => {
    if (!token) return;
    try {
      const data = await backendRequest("/api/community/board", { token });
      const nextItems = Array.isArray(data) ? data.filter((item) => item?.image_url) : [];
      setItems(nextItems);
      setIndex((current) => (nextItems.length ? Math.min(current, nextItems.length - 1) : 0));
    } catch (error) {
      console.error("[Community Board] load failed:", error);
      setItems([]);
      setIndex(0);
    }
  }, [token]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const advance = useCallback((direction = 1) => {
    setIndex((current) => {
      if (items.length < 2) return 0;
      return (current + direction + items.length) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") advance(1);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [advance, items.length, paused]);

  const openItem = (item) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const destination = String(item?.destination_url || "").trim();
    if (!destination) return;
    if (destination.startsWith("/")) {
      navigate(destination);
      return;
    }
    window.open(destination, "_blank", "noopener,noreferrer");
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    movedRef.current = false;
    setPaused(true);
  };

  const handleTouchMove = (event) => {
    const startX = touchStartXRef.current;
    const currentX = event.touches?.[0]?.clientX;
    if (startX === null || currentX === undefined) return;
    if (Math.abs(currentX - startX) > 12) movedRef.current = true;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    touchStartXRef.current = null;
    if (startX !== null && endX !== undefined) {
      const delta = endX - startX;
      if (Math.abs(delta) >= SWIPE_THRESHOLD) advance(delta < 0 ? 1 : -1);
    }
    window.setTimeout(() => setPaused(false), 900);
  };

  if (!items.length) return <CommunityFallbackHero />;

  return (
    <section
      className="clara-community-board relative mb-6 aspect-[5/2] overflow-hidden rounded-[28px] border border-[#73eee7]/15 bg-[linear-gradient(126deg,rgba(8,55,67,0.96),rgba(10,29,58,0.98)_52%,rgba(38,25,82,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_44px_rgba(0,0,0,0.20)] sm:aspect-auto sm:h-[150px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="h-full overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item) => {
            const clickable = Boolean(String(item.destination_url || "").trim());
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={`relative h-full min-w-full overflow-hidden text-left ${clickable ? "cursor-pointer" : "cursor-default"}`}
                aria-disabled={!clickable}
                aria-label={clickable ? item.alt_text || "Open CLARA Board item" : item.alt_text || "CLARA Board"}
              >
                <AuthenticatedCommunityImage
                  src={item.image_url}
                  alt={item.alt_text || "CLARA Board"}
                  className="h-full w-full select-none object-cover object-center"
                />

                {item.item_type === "sponsored" ? (
                  <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-[#04111f]/80 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-white/85 shadow-lg backdrop-blur-md">
                    Sponsored
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {items.length > 1 ? (
        <div className="absolute inset-x-0 bottom-2.5 z-30 flex items-center justify-center gap-1.5">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`h-1.5 rounded-full border border-black/10 shadow-sm transition-all ${
                index === itemIndex ? "w-5 bg-[#69fff5]" : "w-1.5 bg-white/55"
              }`}
              aria-label={`Show CLARA Board slide ${itemIndex + 1}`}
              aria-current={index === itemIndex ? "true" : undefined}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
