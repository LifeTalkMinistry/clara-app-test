import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "./clara-backend-client";
import { supabase as legacySupabase } from "./supabaseClient";

function errorShape(error) {
  return {
    message: error?.message || "CLARA Community request failed.",
    code: error?.code || null,
    status: error?.status || null,
  };
}

async function request(path, options = {}) {
  return backendRequest(path, {
    ...options,
    token: options.token || getStoredBackendToken(),
  });
}

async function getIdentityBridge() {
  const backendUser = getStoredBackendUser();
  let appUserId = null;
  try {
    const result = await legacySupabase.auth.getUser();
    appUserId = result?.data?.user?.id || null;
  } catch {
    appUserId = null;
  }
  return {
    backendUserId: backendUser?.id ?? null,
    appUserId,
  };
}

function bridgeRecord(record, bridge) {
  if (!record || !bridge?.backendUserId || !bridge?.appUserId) return record;
  const ownBackendId = String(bridge.backendUserId);
  const ownAppId = bridge.appUserId;
  const next = { ...record };
  for (const key of ["author_id", "sender_id", "recipient_id", "user_id"]) {
    if (next[key] !== undefined && String(next[key]) === ownBackendId) {
      next[key] = ownAppId;
    }
  }
  return next;
}

async function bridgeData(data) {
  const bridge = await getIdentityBridge();
  if (Array.isArray(data)) return data.map((item) => bridgeRecord(item, bridge));
  return bridgeRecord(data, bridge);
}

class CommunityQueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = "select";
    this.payload = null;
    this.filters = [];
    this.limitValue = null;
    this.singleValue = false;
  }

  select() {
    return this;
  }

  order() {
    return this;
  }

  limit(value) {
    this.limitValue = Number(value) || null;
    return this;
  }

  or() {
    // The backend already scopes direct messages to the authenticated user.
    return this;
  }

  eq(field, value) {
    this.filters.push({ kind: "eq", field, value });
    return this;
  }

  in(field, values) {
    this.filters.push({ kind: "in", field, values: Array.isArray(values) ? values : [] });
    return this;
  }

  single() {
    this.singleValue = true;
    return this;
  }

  maybeSingle() {
    this.singleValue = true;
    return this;
  }

  insert(payload) {
    this.action = "insert";
    this.payload = Array.isArray(payload) ? payload[0] : payload;
    return this;
  }

  update(payload) {
    this.action = "update";
    this.payload = payload || {};
    return this;
  }

  async execute() {
    try {
      let data;

      if (this.action === "select") {
        if (this.table === "profiles") {
          data = await request("/api/community/profiles");
        } else if (this.table === "community_posts") {
          data = await request(`/api/community/posts?limit=${this.limitValue || 50}`);
        } else if (this.table === "community_comments") {
          data = await request(`/api/community/comments?limit=${this.limitValue || 200}`);
        } else if (this.table === "direct_messages") {
          data = await request("/api/messages");
        } else {
          throw new Error(`Unsupported Community table: ${this.table}`);
        }

        data = await bridgeData(data);

        for (const filter of this.filters) {
          if (filter.kind === "eq") {
            data = (Array.isArray(data) ? data : []).filter(
              (item) => String(item?.[filter.field]) === String(filter.value)
            );
          }
        }

        if (this.singleValue) data = Array.isArray(data) ? data[0] || null : data;
      } else if (this.action === "insert") {
        if (this.table === "community_posts") {
          data = await request("/api/community/posts", {
            method: "POST",
            body: this.payload || {},
          });
        } else if (this.table === "community_comments") {
          data = await request("/api/community/comments", {
            method: "POST",
            body: this.payload || {},
          });
        } else if (this.table === "direct_messages") {
          data = await request("/api/messages", {
            method: "POST",
            body: this.payload || {},
          });
        } else {
          throw new Error(`Unsupported Community insert: ${this.table}`);
        }
        data = await bridgeData(data);
      } else if (this.action === "update") {
        if (this.table === "community_posts") {
          const idFilter = this.filters.find(
            (filter) => filter.kind === "eq" && filter.field === "id"
          );
          if (!idFilter) throw new Error("Community post id is required.");
          if (this.payload && Object.prototype.hasOwnProperty.call(this.payload, "reactions")) {
            data = await request(`/api/community/posts/${idFilter.value}/react`, {
              method: "POST",
              body: {},
            });
            data = await bridgeData(data);
          } else {
            throw new Error("Unsupported Community post update.");
          }
        } else if (this.table === "direct_messages") {
          const idsFilter = this.filters.find(
            (filter) => filter.kind === "in" && filter.field === "id"
          );
          const result = await request("/api/messages/read", {
            method: "PATCH",
            body: { ids: idsFilter?.values || [] },
          });
          data = result?.ids || [];
        } else {
          throw new Error(`Unsupported Community update: ${this.table}`);
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: errorShape(error) };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

function createChannel(name) {
  const callbacks = new Set();
  let intervalId = null;

  const channel = {
    name,
    on(_eventType, _filter, callback) {
      if (typeof callback === "function") callbacks.add(callback);
      return channel;
    },
    subscribe() {
      if (intervalId === null && typeof window !== "undefined") {
        intervalId = window.setInterval(() => {
          if (document.visibilityState === "hidden") return;
          callbacks.forEach((callback) => {
            Promise.resolve()
              .then(() => callback({ eventType: "POLL" }))
              .catch(() => {});
          });
        }, 5000);
      }
      channel.__intervalId = intervalId;
      return channel;
    },
    __intervalId: null,
  };

  return channel;
}

export const supabase = {
  from(table) {
    return new CommunityQueryBuilder(table);
  },
  channel(name) {
    return createChannel(name);
  },
  removeChannel(channel) {
    if (channel?.__intervalId !== null && channel?.__intervalId !== undefined) {
      window.clearInterval(channel.__intervalId);
    }
  },
};

export default supabase;
