import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "./clara-backend-client";

export const COMMUNITY_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const COMMUNITY_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

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
      ? "Videos can be up to 200 MB."
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
    // Binary responses do not always contain JSON errors.
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
}

export async function uploadCommunityMedia(file) {
  validateCommunityMediaFile(file);
  const token = getStoredBackendToken();
  if (!token) throw new Error("Your CLARA account session is not connected.");

  const response = await fetch(buildUrl("/api/community/media"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": resolveMimeType(file),
      "X-File-Name": encodeURIComponent(file.name || "attachment"),
      "ngrok-skip-browser-warning": "true",
    },
    body: file,
  });

  if (!response.ok) await throwResponseError(response, "Unable to upload that attachment.");
  return response.json();
}

export async function fetchCommunityMediaBlob(mediaPath) {
  const token = getStoredBackendToken();
  if (!token) throw new Error("Your CLARA account session is not connected.");
  const response = await fetch(buildUrl(mediaPath), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });
  if (!response.ok) await throwResponseError(response, "Unable to load this attachment.");
  return response.blob();
}
