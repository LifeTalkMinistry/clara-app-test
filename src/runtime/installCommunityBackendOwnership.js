import { supabase as legacySupabase } from "@/lib/supabaseClient";
import { supabase as communityBackend } from "@/lib/community-backend-supabase-compat";

const COMMUNITY_TABLES = new Set([
  "community_posts",
  "community_comments",
  "direct_messages",
]);

const INSTALL_KEY = "__CLARA_COMMUNITY_BACKEND_OWNERSHIP_V1__";

function currentHashPath() {
  if (typeof window === "undefined") return "";
  return String(window.location?.hash || "").replace(/^#/, "");
}

function shouldUseCommunityTable(table) {
  const name = String(table || "");
  if (COMMUNITY_TABLES.has(name)) return true;
  // The shared `profiles` table is still used by membership/auth code elsewhere
  // in CLARA. Only the Messages member directory is redirected to Community
  // profiles; the rest of the app keeps its existing profile authority.
  return name === "profiles" && currentHashPath().startsWith("/messages");
}

function shouldUseCommunityChannel(name) {
  const value = String(name || "");
  return value === "community-live" || value.startsWith("direct-messages-");
}

if (typeof window !== "undefined" && !window[INSTALL_KEY]) {
  window[INSTALL_KEY] = true;

  const originalFrom = legacySupabase.from.bind(legacySupabase);
  const originalChannel = legacySupabase.channel.bind(legacySupabase);
  const originalRemoveChannel = legacySupabase.removeChannel.bind(legacySupabase);

  legacySupabase.from = (table, ...args) =>
    shouldUseCommunityTable(table)
      ? communityBackend.from(table)
      : originalFrom(table, ...args);

  legacySupabase.channel = (name, ...args) => {
    if (!shouldUseCommunityChannel(name)) return originalChannel(name, ...args);
    const channel = communityBackend.channel(name);
    channel.__claraCommunityBackendChannel = true;
    return channel;
  };

  legacySupabase.removeChannel = (channel) => {
    if (channel?.__claraCommunityBackendChannel) {
      return communityBackend.removeChannel(channel);
    }
    return originalRemoveChannel(channel);
  };

  console.info("[CLARA Community] self-hosted backend ownership enabled");
}
