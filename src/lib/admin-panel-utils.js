import { claraData } from "@/lib/clara-data-client";

export function normalizeString(value) {
  return String(value ?? "").trim();
}

export function isMissingRelationError(error) {
  const message = normalizeString(error?.message).toLowerCase();
  return error?.code === "PGRST205" || message.includes("could not find the table");
}

export function isMissingColumnError(error) {
  const message = normalizeString(error?.message).toLowerCase();
  return (
    error?.code === "PGRST204" ||
    message.includes("column") && message.includes("does not exist") ||
    message.includes("could not find the") && message.includes("column")
  );
}

export function isSchemaMismatchError(error) {
  return isMissingRelationError(error) || isMissingColumnError(error);
}

export function formatClaraDataError(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  if (isMissingRelationError(error)) {
    return `${fallbackMessage} The required CLARA data table does not exist yet.`;
  }
  if (isMissingColumnError(error)) {
    return `${fallbackMessage} The CLARA data schema is missing one or more expected columns.`;
  }
  return error.message || fallbackMessage;
}

export async function uploadPublicFile({ bucket, file }) {
  if (!file) throw new Error("No file selected.");
  throw new Error(`Upload failed for ${bucket}. CLARA backend media upload is not configured for this legacy admin path.`);
}

export async function loadKeyValueSettings(keys = []) {
  const { data, error } = await claraData
    .from("app_settings")
    .select("key, value")
    .in("key", keys);

  if (error) throw new Error(formatClaraDataError(error, "Failed to load app settings."));

  return (data || []).reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function saveKeyValueSettings(entries = {}) {
  const pairs = Object.entries(entries);

  for (const [key, value] of pairs) {
    const { data: existing, error: existingError } = await claraData
      .from("app_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existingError && !isSchemaMismatchError(existingError)) {
      throw new Error(formatClaraDataError(existingError, "Failed to read app settings."));
    }

    if (existing?.id) {
      const { error: updateError } = await claraData
        .from("app_settings")
        .update({ value: String(value ?? ""), updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updateError) throw new Error(formatClaraDataError(updateError, "Failed to update app settings."));
    } else {
      const { error: insertError } = await claraData
        .from("app_settings")
        .insert([{ key, value: String(value ?? ""), updated_at: new Date().toISOString() }]);
      if (insertError) throw new Error(formatClaraDataError(insertError, "Failed to save app settings."));
    }
  }
}
