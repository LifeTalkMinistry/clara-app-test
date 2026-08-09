import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

function requireAdminToken(token = getStoredBackendToken()) {
  if (!token) {
    const error = new Error("Your CLARA admin session is not available. Log in again.");
    error.code = "ADMIN_SESSION_REQUIRED";
    throw error;
  }
  return token;
}

function adminRequest(path, options = {}) {
  return backendRequest(`/api/admin${path}`, {
    ...options,
    token: requireAdminToken(options.token),
  });
}

export const fetchAdminOverview = () => adminRequest("/overview");
export const fetchAdminUsers = () => adminRequest("/users");
export const fetchAdminAccessCodes = () => adminRequest("/access-codes");
export const fetchAdminSubscriptions = () => adminRequest("/subscriptions");
export const fetchAdminSettings = () => adminRequest("/settings");
export const fetchAdminCommunityBoardItems = () => adminRequest("/community-board");
export async function fetchAdminSupportMessages() {
  const payload = await adminRequest("/support/messages");
  return Array.isArray(payload?.messages) ? payload.messages : [];
}

export const updateAdminUser = (userId, patch) =>
  adminRequest(`/users/${Number(userId)}`, {
    method: "PATCH",
    body: patch,
  });

export const createAdminAccessCode = (payload = {}) =>
  adminRequest("/access-codes", {
    method: "POST",
    body: payload,
  });

export const updateAdminAccessCode = (codeId, patch) =>
  adminRequest(`/access-codes/${Number(codeId)}`, {
    method: "PATCH",
    body: patch,
  });

export const updateAdminSupportMessage = (messageId, status) =>
  adminRequest(`/support/messages/${Number(messageId)}`, {
    method: "PATCH",
    body: { status },
  });

export const updateAdminSettings = (patch) =>
  adminRequest("/settings", {
    method: "PATCH",
    body: patch,
  });

export const createAdminCommunityBoardItem = (payload) =>
  adminRequest("/community-board", {
    method: "POST",
    body: payload,
  });

export const updateAdminCommunityBoardItem = (itemId, patch) =>
  adminRequest(`/community-board/${Number(itemId)}`, {
    method: "PATCH",
    body: patch,
  });

export const deleteAdminCommunityBoardItem = (itemId) =>
  adminRequest(`/community-board/${Number(itemId)}`, {
    method: "DELETE",
  });
