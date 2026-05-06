const normalizeRuntimeLower = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase()
    : value == null
      ? ""
      : String(value).trim().toLowerCase();

export const shouldSilenceNormalOfflineNotice = (message = "") => {
  const normalized = normalizeRuntimeLower(message).replace(/[\u2019']/g, "");

  return (
    normalized.includes("youre offline. clara is using your saved access state") ||
    normalized.includes("connect to the internet later to finish account setup") ||
    normalized.includes("youre offline. clara is using saved data") ||
    normalized.includes("clara is using your saved access state") ||
    normalized.includes("clara is using saved data")
  );
};
