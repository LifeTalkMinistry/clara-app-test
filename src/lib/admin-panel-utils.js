import { supabase } from "@/lib/supabaseClient";

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

export function formatSupabaseError(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  if (isMissingRelationError(error)) {
    return `${fallbackMessage} The required Supabase table does not exist yet.`;
  }
  if (isMissingColumnError(error)) {
    return `${fallbackMessage} The Supabase table schema is missing one or more expected columns.`;
  }
  return error.message || fallbackMessage;
}

export async function uploadPublicFile({
  bucket,
  file,
  folder = "admin",
  cacheControl = "3600",
}) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const safeBaseName = normalizeString(file.name)
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "file";

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${Date.now()}-${safeBaseName}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl,
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(formatSupabaseError(uploadError, `Upload failed for ${bucket}.`));
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Upload succeeded but the public URL could not be generated.");
  }

  return data.publicUrl;
}

export async function loadKeyValueSettings(keys = []) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", keys);

  if (error) {
    throw new Error(formatSupabaseError(error, "Failed to load app settings."));
  }

  return (data || []).reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function saveKeyValueSettings(entries = {}) {
  const pairs = Object.entries(entries);

  for (const [key, value] of pairs) {
    const { data: existing, error: existingError } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existingError && !isSchemaMismatchError(existingError)) {
      throw new Error(formatSupabaseError(existingError, "Failed to read app settings."));
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({
          value: String(value ?? ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError, "Failed to update app settings."));
      }
    } else {
      const { error: insertError } = await supabase
        .from("app_settings")
        .insert([
          {
            key,
            value: String(value ?? ""),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        throw new Error(formatSupabaseError(insertError, "Failed to save app settings."));
      }
    }
  }
}
