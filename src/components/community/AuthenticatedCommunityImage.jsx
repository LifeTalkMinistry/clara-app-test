import { useEffect, useState } from "react";
import { fetchCommunityMediaBlob } from "@/lib/community-media-client";

export default function AuthenticatedCommunityImage({
  src,
  alt = "",
  className = "",
  onLoad,
  onError,
}) {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    let active = true;
    let nextObjectUrl = "";

    setObjectUrl("");
    if (!src) return undefined;

    fetchCommunityMediaBlob(src)
      .then((blob) => {
        if (!active) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      })
      .catch((error) => {
        console.error("[Community media] image load failed:", error);
        onError?.(error);
      });

    return () => {
      active = false;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [onError, src]);

  if (!objectUrl) {
    return <div className={`${className} animate-pulse bg-white/[0.035]`} aria-hidden="true" />;
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
      draggable={false}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
