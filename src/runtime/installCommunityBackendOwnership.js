import { claraData as localData } from "@/lib/clara-data-client";
import { claraData as communityBackend } from "@/lib/community-backend-data-client";
import "./installCommunityRealProfileAvatars";

const COMMUNITY_TABLES = new Set([
  "community_posts",
  "community_comments",
]);

const INSTALL_KEY = "__CLARA_COMMUNITY_BACKEND_OWNERSHIP_V1__";

function shouldUseCommunityChannel(name) {
  return String(name || "") === "community-live";
}

if (typeof window !== "undefined" && !window[INSTALL_KEY]) {
  window[INSTALL_KEY] = true;

  const originalFrom = localData.from.bind(localData);
  const originalChannel = localData.channel.bind(localData);
  const originalRemoveChannel = localData.removeChannel.bind(localData);

  localData.from = (table, ...args) =>
    COMMUNITY_TABLES.has(String(table || ""))
      ? communityBackend.from(table)
      : originalFrom(table, ...args);

  localData.channel = (name, ...args) => {
    if (!shouldUseCommunityChannel(name)) return originalChannel(name, ...args);
    const channel = communityBackend.channel(name);
    channel.__claraCommunityBackendChannel = true;
    return channel;
  };

  localData.removeChannel = (channel) => {
    if (channel?.__claraCommunityBackendChannel) {
      return communityBackend.removeChannel(channel);
    }
    return originalRemoveChannel(channel);
  };

  console.info("[CLARA Community] self-hosted backend ownership enabled");
}
