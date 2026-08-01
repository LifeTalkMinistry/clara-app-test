import {
  backendRequest,
  getStoredBackendToken,
} from "./clara-backend-client";

function requireToken() {
  const token = getStoredBackendToken();
  if (!token) {
    const error = new Error("Sign in to the same CLARA account on both devices first.");
    error.code = "DEVICE_TRANSFER_SIGN_IN_REQUIRED";
    throw error;
  }
  return token;
}

function encode(value) {
  return encodeURIComponent(String(value || ""));
}

export function getCurrentDeviceLabel() {
  if (typeof navigator === "undefined") return "CLARA device";
  const platform = String(navigator.userAgentData?.platform || navigator.platform || "").trim();
  const agent = String(navigator.userAgent || "");
  let browser = "Browser";
  if (/edg/i.test(agent)) browser = "Edge";
  else if (/chrome|crios/i.test(agent)) browser = "Chrome";
  else if (/safari/i.test(agent)) browser = "Safari";
  else if (/firefox|fxios/i.test(agent)) browser = "Firefox";
  return `${browser}${platform ? ` on ${platform}` : ""}`.slice(0, 120);
}

export async function createDeviceTransfer({ snapshot, summary }) {
  return backendRequest("/api/device-transfers", {
    method: "POST",
    token: requireToken(),
    timeoutMs: 30_000,
    body: {
      snapshot,
      summary,
      senderDeviceLabel: getCurrentDeviceLabel(),
    },
  });
}

export async function claimDeviceTransfer(code) {
  return backendRequest("/api/device-transfers/claim", {
    method: "POST",
    token: requireToken(),
    body: {
      code: String(code || "").replace(/\D/g, ""),
      receiverDeviceLabel: getCurrentDeviceLabel(),
    },
  });
}

export async function getDeviceTransferStatus({ transferId, token, role }) {
  return backendRequest(
    `/api/device-transfers/${encode(transferId)}/status?role=${encode(role)}&token=${encode(token)}`,
    { token: requireToken() }
  );
}

export async function approveDeviceTransfer({ transferId, senderToken }) {
  return backendRequest(`/api/device-transfers/${encode(transferId)}/approve`, {
    method: "POST",
    token: requireToken(),
    body: { senderToken },
  });
}

export async function fetchDeviceTransferPackage({ transferId, receiverToken }) {
  return backendRequest(
    `/api/device-transfers/${encode(transferId)}/package?receiverToken=${encode(receiverToken)}`,
    { token: requireToken(), timeoutMs: 30_000 }
  );
}

export async function completeDeviceTransfer({ transferId, receiverToken }) {
  return backendRequest(`/api/device-transfers/${encode(transferId)}/complete`, {
    method: "POST",
    token: requireToken(),
    body: { receiverToken },
  });
}

export async function cancelDeviceTransfer({ transferId, token }) {
  return backendRequest(`/api/device-transfers/${encode(transferId)}/cancel`, {
    method: "POST",
    token: requireToken(),
    body: { token },
  });
}
