const RETIRED_CONTEXT_STORAGE_PREFIXES = [
  "CLARA_USER_CONTEXT_STORY_V1",
  "CLARA_USER_CONTEXT_STORY_V2:",
  "clara_user_context",
  "clara_behavioral_memory_v1",
  "clara_behavioral_memory_v2:",
  "CLARA_MEMORY_CABINET_V1:",
  "CLARA_MEMORY_CABINET_V2:",
  "CLARA_UNIVERSAL_MEMORY_PROFILE_V1",
  "clara_memory_",
  "CLARA_PREVIOUS_CONVERSATION_MEMORY",
  "clara_previous_conversation_memory",
  "clara_conversation_memory_v1",
  "clara_chat_memory_v1",
  "CLARA_LIVE_USER_MESSAGE_HISTORY",
  "clara_live_user_message",
  "clara_active_memory_user_id",
  "clara_talk_to_clara_pause_v1",
];

const RETIRED_CONTEXT_DATABASES = ["clara_behavioral_memory_db"];

function matchesRetiredContextKey(key = "") {
  const value = String(key || "");
  return RETIRED_CONTEXT_STORAGE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function clearRetiredStorage(storage) {
  if (!storage) return;
  const keys = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && matchesRetiredContextKey(key)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Restricted storage modes should not block CLARA startup.
  }
}

function deleteRetiredDatabases() {
  const indexedDb = globalThis?.indexedDB;
  if (!indexedDb) return;
  RETIRED_CONTEXT_DATABASES.forEach((name) => {
    try {
      indexedDb.deleteDatabase(name);
    } catch {
      // A blocked legacy database can be retried on the next app start.
    }
  });
}

export function purgeRetiredClaraContextData() {
  if (typeof window === "undefined") return;
  clearRetiredStorage(window.localStorage);
  clearRetiredStorage(window.sessionStorage);
  deleteRetiredDatabases();
}

if (typeof window !== "undefined") {
  purgeRetiredClaraContextData();
  window.addEventListener("clara-data-restored", purgeRetiredClaraContextData);
}
