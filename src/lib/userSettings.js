import { supabase } from "@/lib/supabaseClient";

export async function getCurrentUserSettings() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}