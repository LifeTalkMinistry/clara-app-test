import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const API_URL = getClaraBackendUrl().replace(/\/+$/, "");
const MAX_PUBLIC_DEMO_VIDEO_BYTES = 1024 * 1024 * 1024;
const FALLBACK_CHUNK_BYTES = 20 * 1024 * 1024;

async function parseJson(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const defaultMessage =
      response.status === 413
        ? "This video is larger than CLARA's upload limit."
        : `CLARA request failed with status ${response.status}.`;
    const error = new Error(payload?.message || defaultMessage);
    error.status = response.status;
    error.code = payload?.code || `HTTP_${response.status}`;
    throw error;
  }
  return payload || {};
}

function normalizeLanding(payload = {}) {
  const relativeUrl = String(payload.demo_video_url || "").trim();
  return {
    ...payload,
    has_video: Boolean(payload.has_video && relativeUrl),
    demo_video_url: relativeUrl
      ? relativeUrl.startsWith("http")
        ? relativeUrl
        : `${API_URL}${relativeUrl}`
      : null,
  };
}

function requireAdminToken() {
  const token = getStoredBackendToken();
  if (!token) {
    throw new Error("Your CLARA admin session is not available. Log in again.");
  }
  return token;
}

function validateVideoFile(file) {
  if (!(file instanceof Blob) || !file.size) {
    throw new Error("Choose a video to upload.");
  }

  const mimeType = String(file.type || "").toLowerCase();
  if (!new Set(["video/mp4", "video/webm"]).has(mimeType)) {
    throw new Error("Upload an MP4 or WebM video.");
  }

  if (file.size > MAX_PUBLIC_DEMO_VIDEO_BYTES) {
    throw new Error("Video is too large. Maximum size is 1 GB.");
  }

  return mimeType;
}

async function abortUpload(uploadId, token) {
  if (!uploadId) return;
  try {
    await fetch(
      `${API_URL}/api/admin/public-landing/video/uploads/${encodeURIComponent(uploadId)}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    // Upload sessions are cleaned up by the backend if an abort cannot reach it.
  }
}

export async function fetchPublicLanding() {
  const response = await fetch(`${API_URL}/api/public/landing`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return normalizeLanding(await parseJson(response));
}

export async function uploadPublicLandingVideo(file, options = {}) {
  const mimeType = validateVideoFile(file);
  const token = requireAdminToken();
  const fileName = String(file.name || "clara-demo-video");
  const onProgress =
    typeof options.onProgress === "function" ? options.onProgress : () => {};
  let uploadId = null;

  try {
    const startResponse = await fetch(
      `${API_URL}/api/admin/public-landing/video/uploads?name=${encodeURIComponent(fileName)}&type=${encodeURIComponent(mimeType)}&size=${encodeURIComponent(file.size)}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const started = await parseJson(startResponse);
    uploadId = String(started.upload_id || "");
    if (!uploadId) {
      throw new Error("CLARA could not start the video upload.");
    }

    const serverChunkSize = Number(started.chunk_size || 0);
    const chunkSize =
      Number.isSafeInteger(serverChunkSize) && serverChunkSize > 0
        ? Math.min(serverChunkSize, 50 * 1024 * 1024)
        : FALLBACK_CHUNK_BYTES;

    let uploadedBytes = 0;
    let partIndex = 0;
    onProgress(0);

    while (uploadedBytes < file.size) {
      const end = Math.min(uploadedBytes + chunkSize, file.size);
      const chunk = file.slice(uploadedBytes, end);
      const chunkResponse = await fetch(
        `${API_URL}/api/admin/public-landing/video/uploads/${encodeURIComponent(uploadId)}/${partIndex}`,
        {
          method: "PUT",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
          },
          body: chunk,
        }
      );
      await parseJson(chunkResponse);

      uploadedBytes = end;
      partIndex += 1;
      onProgress(Math.min(99, Math.round((uploadedBytes / file.size) * 100)));
    }

    const completeResponse = await fetch(
      `${API_URL}/api/admin/public-landing/video/uploads/${encodeURIComponent(uploadId)}/complete`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const completed = normalizeLanding(await parseJson(completeResponse));
    onProgress(100);
    return completed;
  } catch (error) {
    await abortUpload(uploadId, token);
    throw error;
  }
}

export async function removePublicLandingVideo() {
  const token = requireAdminToken();
  const response = await fetch(`${API_URL}/api/admin/public-landing/video`, {
    method: "DELETE",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return normalizeLanding(await parseJson(response));
}
