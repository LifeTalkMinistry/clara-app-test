export async function uploadFeedMedia(file, userId, bucket = "feed-media") {
  if (!file) return null;
  if (!userId) {
    throw new Error("Missing user ID for feed media upload.");
  }

  throw new Error(
    `Feed media upload for ${bucket} is unavailable until CLARA backend media storage is connected.`
  );
}
