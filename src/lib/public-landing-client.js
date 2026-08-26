import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const API_URL = getClaraBackendUrl().replace(/\/+$/, "");

async function parseJson(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message || `CLARA request failed with status ${response.status}.`
    );
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

export async function fetchPublicLanding() {
  const response = await fetch(`${API_URL}/api/public/landing`, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return normalizeLanding(await parseJson(response));
}

export async function uploadPublicLandingVideo(file) {
  if (!(file instanceof Blob) || !file.size) {
    throw new Error("Choose a video to upload.");
  }

  const token = getStoredBackendToken();
  if (!token) {
    throw new Error("Your CLARA admin session is not available. Log in again.");
  }

  const mimeType = String(file.type || "").toLowerCase();
  if (!new Set(["video/mp4", "video/webm"]).has(mimeType)) {
    throw new Error("Upload an MP4 or WebM video.");
  }

  const fileName = String(file.name || "clara-demo-video");
  const response = await fetch(
    `${API_URL}/api/admin/public-landing/video?name=${encodeURIComponent(fileName)}`,
    {
      method: "PUT",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
      },
      body: file,
    }
  );

  return normalizeLanding(await parseJson(response));
}

export async function removePublicLandingVideo() {
  const token = getStoredBackendToken();
  if (!token) {
    throw new Error("Your CLARA admin session is not available. Log in again.");
  }
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
