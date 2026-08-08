import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { fetchCommunityMediaBlob } from "@/lib/community-media-client";

export default function CommunityPostMedia({ mediaUrl, mediaType, mediaName, edgeToEdge = false }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(mediaUrl));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = "";

    async function load() {
      if (!mediaUrl) {
        setObjectUrl("");
        setLoading(false);
        setFailed(false);
        return;
      }

      setLoading(true);
      setFailed(false);
      try {
        const blob = await fetchCommunityMediaBlob(mediaUrl);
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch (error) {
        console.error("[Community] media load failed:", error);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [mediaUrl]);

  if (!mediaUrl) return null;

  const frameClass = (backgroundClass) => edgeToEdge
    ? `mt-4 -mx-4 overflow-hidden border-y border-white/10 ${backgroundClass} sm:mx-0 sm:rounded-[18px] sm:border`
    : `mt-4 overflow-hidden rounded-[18px] border border-white/10 ${backgroundClass}`;

  if (loading) {
    return (
      <div className={`${frameClass("bg-[#071725]")} flex h-32 items-center justify-center text-white/45`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (failed || !objectUrl) {
    return (
      <div className={`${frameClass("bg-[#071725]")} px-4 py-4 text-xs font-semibold text-white/45`}>
        This attachment could not be loaded.
      </div>
    );
  }

  if (mediaType === "image") {
    return (
      <div className={frameClass("bg-black/20")}>
        <img src={objectUrl} alt={mediaName || "Community attachment"} className="max-h-[520px] w-full object-cover" />
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className={frameClass("bg-black/40")}>
        <video src={objectUrl} controls playsInline preload="metadata" className="max-h-[560px] w-full bg-black" />
      </div>
    );
  }

  return (
    <a
      href={objectUrl}
      download={mediaName || "CLARA-attachment"}
      className="mt-4 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#071725] px-4 py-4 transition hover:border-[#22c7b8]/30 hover:bg-[#22c7b8]/[0.06]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/10 text-[#99f6e4]">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{mediaName || "Attachment"}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-white/35">Tap to download</p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-white/45" />
    </a>
  );
}
