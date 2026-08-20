import { claraData } from "@/lib/clara-data-client";

export async function getCurrentUserSettings() {
  const {
    data: { session },
    error: sessionError,
  } = await claraData.auth.getSession();

  if (sessionError) throw sessionError;

  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await claraData
    .from("user_settings")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}