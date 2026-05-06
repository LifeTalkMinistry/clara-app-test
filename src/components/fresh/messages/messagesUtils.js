export const getMessageInitials = (nameOrEmail = "") => {
  const value = String(nameOrEmail || "").trim();
  if (!value) return "?";
  const parts = value.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return value.slice(0, 2).toUpperCase();
};

export const formatChatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const formatBubbleTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
