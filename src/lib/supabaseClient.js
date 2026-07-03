import { isLocalBetaMode } from "@/lib/clara-runtime-mode";
import {
  cloudSupabase,
  cloudSupabaseAnonKey,
  cloudSupabaseUrl,
  isCloudSupabaseConfigured,
} from "@/lib/cloud-supabase-client";
import { withLocalAuthEvents } from "@/lib/local-auth-event-bridge";
import { createLocalSupabaseFacade } from "@/lib/local-supabase-facade";

export const supabaseUrl = cloudSupabaseUrl;
export const supabaseAnonKey = cloudSupabaseAnonKey;
export const isSupabaseConfigured = isCloudSupabaseConfigured;

const localSupabase = withLocalAuthEvents(createLocalSupabaseFacade());

export const supabase = isLocalBetaMode()
  ? localSupabase
  : cloudSupabase;
