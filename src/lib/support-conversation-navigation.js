export const CLARA_SUPPORT_CONVERSATION_TARGET = "clara-support";

let pendingSupportConversationUserId = "";

export function rememberSupportConversationTarget() {
  pendingSupportConversationUserId = CLARA_SUPPORT_CONVERSATION_TARGET;
}

export function consumeSupportConversationTarget() {
  const target = pendingSupportConversationUserId;
  pendingSupportConversationUserId = "";
  return target;
}
