function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}

export function createSession(intent, fields = {}, missingFields = []) {
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, normalizeValue(value)])
  );

  return {
    intent,
    fields: normalizedFields,
    missingFields: [...missingFields],
    complete: missingFields.length === 0,
    awaitingConfirmation: false,
  };
}

export function updateSession(session, newFields = {}) {
  const mergedFields = {
    ...(session?.fields || {}),
  };

  Object.entries(newFields).forEach(([key, value]) => {
    const normalized = normalizeValue(value);
    if (normalized !== null && normalized !== undefined && normalized !== "") {
      mergedFields[key] = normalized;
    }
  });

  const missingFields = Object.keys(mergedFields).length
    ? (session?.missingFields || []).filter((field) => {
        const value = mergedFields[field];
        return value === null || value === undefined || value === "";
      })
    : [...(session?.missingFields || [])];

  return {
    ...session,
    fields: mergedFields,
    missingFields,
    complete: missingFields.length === 0,
  };
}

export function markAwaitingConfirmation(session) {
  return {
    ...session,
    awaitingConfirmation: true,
  };
}

export function clearSession() {
  return null;
}