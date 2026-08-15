let pendingSupportConversationUserId = "";

export function rememberSupportConversationTarget(userId) {
  const normalized = String(userId || "").trim();
  pendingSupportConversationUserId = normalized;
}

export function consumeSupportConversationTarget() {
  const target = pendingSupportConversationUserId;
  pendingSupportConversationUserId = "";
  return target;
}
