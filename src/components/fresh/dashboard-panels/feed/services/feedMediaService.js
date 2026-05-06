import { supabase } from "@/lib/supabaseClient";

export async function uploadFeedMedia(file, userId, bucket = "feed-media") {
  if (!file) return null;
  if (!userId) {
    throw new Error("Missing user ID for feed media upload.");
  }

  const safeName = String(file.name || "feed-media").replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "";
  const filePath = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}${fileExt ? `.${fileExt}` : ""}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: publicUrlData?.publicUrl || "",
    name: file.name,
    mimeType: file.type || "",
    type: file.type?.startsWith("video/") ? "video" : "image",
  };
}
