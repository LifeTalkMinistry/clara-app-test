import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "./clara-backend-client";

export const COMMUNITY_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const COMMUNITY_VIDEO_MAX_BYTES = 1024 * 1024 * 1024;

const DIRECT_UPLOAD_MAX_BYTES = 80 * 1024 * 1024;
const DEFAULT_CHUNK_BYTES = 8 * 1024 * 1024;
const UPLOAD_RETRY_ATTEMPTS = 3;

const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function buildUrl(path) {
  const base = String(getClaraBackendUrl() || "").replace(/\/+$/, "");
  const suffix = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
  return `${base}${suffix}`;
}

function resolveMimeType(file) {
  if (file?.type) return file.type;
  const extension = String(file?.name || "").split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

function isVideoFile(file) {
  return resolveMimeType(file).startsWith("video/");
}

export function validateCommunityMediaFile(file) {
  if (!(file instanceof File)) throw new Error("Choose a file first.");
  const maxBytes = isVideoFile(file) ? COMMUNITY_VIDEO_MAX_BYTES : COMMUNITY_ATTACHMENT_MAX_BYTES;
  if (file.size > maxBytes) {
    throw new Error(isVideoFile(file)
      ? "Videos can be up to 1 GB."
      : "Photos and files can be up to 25 MB.");
  }
  return file;
}

async function throwResponseError(response, fallback) {
  let message = fallback;
  try {
    const payload = await response.json();
    if (payload?.message) message = payload.message;
  } catch {
    // Proxy and binary error responses do not always contain JSON.
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
}

function shouldRetryStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, attempts = UPLOAD_RETRY_ATTEMPTS) {
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!shouldRetryStatus(response.status) || attempt === attempts - 1) return response;
      lastResponse = response;
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }

    await wait(500 * (2 ** attempt));
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("Upload connection was interrupted.");
}

async function sha256Hex(blob) {
  if (!globalThis.crypto?.subtle || typeof blob?.arrayBuffer !== "function") return "";
  const bytes = await blob.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function authHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true",
    ...extra,
  };
}

async function uploadDirect(file, token) {
  const response = await fetchWithRetry(buildUrl("/api/community/media"), {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(token, {
      "Content-Type": resolveMimeType(file),
      "X-File-Name": encodeURIComponent(file.name || "attachment"),
    }),
    body: file,
  });

  if (!response.ok) await throwResponseError(response, "Unable to upload that attachment.");
  return response.json();
}

async function beginChunkedUpload(file, token) {
  const response = await fetchWithRetry(buildUrl("/api/community/media/uploads"), {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      original_name: file.name || "attachment",
      mime_type: resolveMimeType(file),
      size_bytes: file.size,
    }),
  });

  if (!response.ok) await throwResponseError(response, "Unable to start the video upload.");
  return response.json();
}

async function uploadChunk({ token, uploadId, index, chunk }) {
  const checksum = await sha256Hex(chunk);
  const response = await fetchWithRetry(
    buildUrl(`/api/community/media/uploads/${encodeURIComponent(uploadId)}/chunks/${index}`),
    {
      method: "PUT",
      cache: "no-store",
      headers: authHeaders(token, {
        "Content-Type": "application/octet-stream",
        ...(checksum ? { "X-Chunk-Sha256": checksum } : {}),
      }),
      body: chunk,
    }
  );

  if (!response.ok) {
    await throwResponseError(response, `Video upload stopped at part ${index + 1}. Please try again.`);
  }
}

async function completeChunkedUpload(token, uploadId) {
  const response = await fetchWithRetry(
    buildUrl(`/api/community/media/uploads/${encodeURIComponent(uploadId)}/complete`),
    {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(token),
    }
  );

  if (!response.ok) await throwResponseError(response, "Unable to finish the video upload.");
  return response.json();
}

async function uploadInChunks(file, token) {
  const session = await beginChunkedUpload(file, token);
  const uploadId = String(session?.upload_id || "");
  const chunkSize = Number(session?.chunk_size_bytes) || DEFAULT_CHUNK_BYTES;
  const totalChunks = Number(session?.total_chunks) || Math.ceil(file.size / chunkSize);

  if (!uploadId || chunkSize <= 0 || totalChunks <= 0) {
    throw new Error("The server could not prepare this video upload. Please try again.");
  }

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    await uploadChunk({ token, uploadId, index, chunk });
  }

  return completeChunkedUpload(token, uploadId);
}

export async function uploadCommunityMedia(file) {
  validateCommunityMediaFile(file);
  const token = getStoredBackendToken();
  if (!token) throw new Error("Your CLARA account session is not connected.");

  try {
    if (file.size > DIRECT_UPLOAD_MAX_BYTES) {
      return await uploadInChunks(file, token);
    }
    return await uploadDirect(file, token);
  } catch (error) {
    if (error?.status) throw error;
    if (error instanceof TypeError) {
      throw new Error("Upload connection was interrupted. CLARA retried automatically, but the server could not be reached. Please try again.");
    }
    throw error;
  }
}

export async function fetchCommunityMediaBlob(mediaPath) {
  const token = getStoredBackendToken();
  if (!token) throw new Error("Your CLARA account session is not connected.");
  const response = await fetch(buildUrl(mediaPath), {
    method: "GET",
    cache: "no-store",
    headers: authHeaders(token),
  });
  if (!response.ok) await throwResponseError(response, "Unable to load this attachment.");
  return response.blob();
}
