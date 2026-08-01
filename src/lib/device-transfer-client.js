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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function getCurrentDeviceLabel() {
  if (typeof navigator === "undefined") return "CLARA device";
  const platform = String(
    navigator.userAgentData?.platform || navigator.platform || ""
  ).trim();
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
  return backendRequest(`/api/device-transfers/${encode(transferId)}/status`, {
    method: "POST",
    token: requireToken(),
    body: { token, role },
  });
}

export async function approveDeviceTransfer({ transferId, senderToken }) {
  return backendRequest(`/api/device-transfers/${encode(transferId)}/approve`, {
    method: "POST",
    token: requireToken(),
    body: { senderToken },
  });
}

export async function fetchDeviceTransferPackage({ transferId, receiverToken }) {
  return backendRequest(`/api/device-transfers/${encode(transferId)}/package`, {
    method: "POST",
    token: requireToken(),
    timeoutMs: 30_000,
    body: { receiverToken },
  });
}

export async function completeDeviceTransfer({ transferId, receiverToken }) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await backendRequest(
        `/api/device-transfers/${encode(transferId)}/complete`,
        {
          method: "POST",
          token: requireToken(),
          body: { receiverToken },
        }
      );
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(700 * (attempt + 1));
    }
  }

  // The protected local import has already completed and must never be reported
  // as failed only because the final server cleanup acknowledgement was lost.
  return {
    status: "consumed",
    completionPending: true,
    completionWarning:
      lastError?.message || "Server cleanup will finish after the transfer expires.",
  };
}

export async function cancelDeviceTransfer({ transferId, token }) {
  return backendRequest(`/api/device-transfers/${encode(transferId)}/cancel`, {
    method: "POST",
    token: requireToken(),
    body: { token },
  });
}
