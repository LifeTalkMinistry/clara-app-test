import { fetchCurrentBackendBilling } from "@/lib/billing-backend-client";
import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";
import {
  fetchBackendLegalInformation,
  updateBackendLegalInformation,
} from "@/lib/legal-information-backend-client";
import {
  fetchBackendSupportMessages,
  sendBackendSupportMessage,
} from "@/lib/support-backend-client";
import { rememberSupportConversationTarget } from "@/lib/support-conversation-navigation";

const SUPPORT_ADMIN = Object.freeze({
  id: "clara-support",
  email: "claraprogram2026@gmail.com",
  full_name: "CLARA Support",
  role: "admin",
});

function requireBackendToken() {
  const token = getStoredBackendToken();
  if (!token) {
    const error = new Error("Your CLARA account session is not available. Log in again.");
    error.code = "ACCOUNT_SESSION_REQUIRED";
    throw error;
  }
  return token;
}

async function fetchBackendAdminProfiles() {
  const profiles = await backendRequest("/api/community/profiles", {
    token: requireBackendToken(),
  });
  return (Array.isArray(profiles) ? profiles : []).filter(
    (profile) => String(profile?.role || "").trim().toLowerCase() === "admin"
  );
}

function parseSupportContent(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^\[CLARA Support\s*•\s*([^\]]+)\]\s*\n*([\s\S]*)$/i);
  if (!match) {
    return { topic: "Other concern", content: raw };
  }
  return {
    topic: String(match[1] || "Other concern").trim() || "Other concern",
    content: String(match[2] || "").trim(),
  };
}

function createReplayQuery(
  localFacade,
  tableName,
  { interceptSelect, interceptInsert } = {}
) {
  const operations = [];
  let terminal = "select";

  const query = {};
  const chain = (method, args = []) => {
    operations.push({ method, args });
    return query;
  };

  const executeUnderlying = async () => {
    let underlying = localFacade.from(tableName);
    for (const { method, args } of operations) {
      if (typeof underlying?.[method] === "function") {
        underlying = underlying[method](...args);
      }
    }
    if (terminal !== "select" && typeof underlying?.[terminal] === "function") {
      return underlying[terminal]();
    }
    return underlying;
  };

  const normalizeIntercepted = (intercepted) => {
    if (!intercepted) return null;
    if (terminal === "single" || terminal === "maybeSingle") {
      return {
        data: Array.isArray(intercepted.data)
          ? intercepted.data[0] || null
          : intercepted.data,
        error: intercepted.error || null,
      };
    }
    return intercepted;
  };

  const execute = async () => {
    const insertOperation = operations.find(({ method }) => method === "insert");
    if (insertOperation && typeof interceptInsert === "function") {
      const intercepted = await interceptInsert(insertOperation.args[0]);
      const normalized = normalizeIntercepted(intercepted);
      if (normalized) return normalized;
    }

    const hasMutation = operations.some(({ method }) =>
      ["insert", "update", "upsert", "delete"].includes(method)
    );
    if (!hasMutation && typeof interceptSelect === "function") {
      const intercepted = await interceptSelect({ operations, terminal });
      const normalized = normalizeIntercepted(intercepted);
      if (normalized) return normalized;
    }

    return executeUnderlying();
  };

  Object.assign(query, {
    select: (...args) => chain("select", args),
    insert: (...args) => chain("insert", args),
    update: (...args) => chain("update", args),
    upsert: (...args) => chain("upsert", args),
    delete: (...args) => chain("delete", args),
    eq: (...args) => chain("eq", args),
    in: (...args) => chain("in", args),
    is: (...args) => chain("is", args),
    or: (...args) => chain("or", args),
    order: (...args) => chain("order", args),
    limit: (...args) => chain("limit", args),
    maybeSingle: () => {
      terminal = "maybeSingle";
      return execute();
    },
    single: () => {
      terminal = "single";
      return execute();
    },
    then: (resolve, reject) => execute().then(resolve, reject),
    catch: (reject) => execute().catch(reject),
    finally: (handler) => execute().finally(handler),
  });

  return query;
}

function createProfilesQuery(localFacade) {
  const base = createReplayQuery(localFacade, "profiles");
  const operations = [];
  let terminal = "select";
  const query = {};

  const chain = (method, args = []) => {
    operations.push({ method, args });
    return query;
  };

  const isAdminLookup = () =>
    operations.some(
      ({ method, args }) =>
        method === "eq" &&
        args[0] === "role" &&
        String(args[1] || "").toLowerCase() === "admin"
    );

  const isPlainProfileList = () =>
    terminal === "select" &&
    !operations.some(({ method }) =>
      ["insert", "update", "upsert", "delete"].includes(method)
    );

  const execute = async () => {
    if (isAdminLookup()) {
      try {
        const admins = await fetchBackendAdminProfiles();
        return terminal === "maybeSingle" || terminal === "single"
          ? { data: admins[0] || null, error: null }
          : { data: admins, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }

    let delegated = base;
    for (const { method, args } of operations) {
      if (typeof delegated?.[method] === "function") {
        delegated = delegated[method](...args);
      }
    }

    const result =
      terminal !== "select" && typeof delegated?.[terminal] === "function"
        ? await delegated[terminal]()
        : await delegated;

    if (!isPlainProfileList() || result?.error || !Array.isArray(result?.data)) {
      return result;
    }

    const hasSupport = result.data.some(
      (profile) => String(profile?.id || "") === SUPPORT_ADMIN.id
    );
    return {
      ...result,
      data: hasSupport ? result.data : [...result.data, SUPPORT_ADMIN],
    };
  };

  Object.assign(query, {
    select: (...args) => chain("select", args),
    insert: (...args) => chain("insert", args),
    update: (...args) => chain("update", args),
    upsert: (...args) => chain("upsert", args),
    delete: (...args) => chain("delete", args),
    eq: (...args) => chain("eq", args),
    in: (...args) => chain("in", args),
    is: (...args) => chain("is", args),
    or: (...args) => chain("or", args),
    order: (...args) => chain("order", args),
    limit: (...args) => chain("limit", args),
    maybeSingle: () => {
      terminal = "maybeSingle";
      return execute();
    },
    single: () => {
      terminal = "single";
      return execute();
    },
    then: (resolve, reject) => execute().then(resolve, reject),
    catch: (reject) => execute().catch(reject),
    finally: (handler) => execute().finally(handler),
  });

  return query;
}

function createBillingQuery() {
  let terminal = "select";
  const query = {};
  const chain = () => query;

  const execute = async () => {
    try {
      const billing = await fetchCurrentBackendBilling();
      const normalized = billing
        ? {
            ...billing,
            current_period_start:
              billing.current_period_start || billing.created_at || null,
            next_billing_date:
              billing.next_billing_date || billing.renewal_date || null,
          }
        : null;
      if (terminal === "single") {
        return normalized
          ? { data: normalized, error: null }
          : { data: null, error: new Error("Billing record not found.") };
      }
      if (terminal === "maybeSingle") return { data: normalized, error: null };
      return { data: normalized ? [normalized] : [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  Object.assign(query, {
    select: chain,
    eq: chain,
    in: chain,
    is: chain,
    or: chain,
    order: chain,
    limit: chain,
    maybeSingle: () => {
      terminal = "maybeSingle";
      return execute();
    },
    single: () => {
      terminal = "single";
      return execute();
    },
    then: (resolve, reject) => execute().then(resolve, reject),
    catch: (reject) => execute().catch(reject),
    finally: (handler) => execute().finally(handler),
  });

  return query;
}

function normalizeLegalRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    section_key: String(row?.section_key || row?.sectionKey || "").trim(),
    title: String(row?.title || "").trim(),
    subtitle: String(row?.subtitle || "").trim(),
    body: String(row?.body || "").trim(),
    sort_order: Number(row?.sort_order ?? row?.sortOrder ?? index + 1),
    is_active: row?.is_active !== false && row?.isActive !== false,
    updated_at: row?.updated_at || row?.updatedAt || null,
  }));
}

function createLegalInformationQuery() {
  let operation = "select";
  let payload = null;
  let terminal = "select";
  const query = {};
  const chain = () => query;

  const execute = async () => {
    try {
      const rows = normalizeLegalRows(
        operation === "upsert"
          ? await updateBackendLegalInformation(payload)
          : await fetchBackendLegalInformation()
      ).sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

      if (terminal === "single") {
        return rows.length === 1
          ? { data: rows[0], error: null }
          : {
              data: rows[0] || null,
              error: rows.length ? new Error("Multiple information rows returned.") : new Error("Information row not found."),
            };
      }
      if (terminal === "maybeSingle") return { data: rows[0] || null, error: null };
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  Object.assign(query, {
    select: chain,
    eq: chain,
    in: chain,
    is: chain,
    or: chain,
    order: chain,
    limit: chain,
    upsert(value) {
      operation = "upsert";
      payload = value;
      return query;
    },
    maybeSingle: () => {
      terminal = "maybeSingle";
      return execute();
    },
    single: () => {
      terminal = "single";
      return execute();
    },
    then: (resolve, reject) => execute().then(resolve, reject),
    catch: (reject) => execute().catch(reject),
    finally: (handler) => execute().finally(handler),
  });

  return query;
}

function toSupportDirectMessage(message = {}, identity = {}) {
  const senderId = String(identity.id || message.sender_id || "guest");
  const topic = String(message.topic || "Other concern").trim() || "Other concern";
  const content = String(message.content || "").trim();
  return {
    id: `support-${message.id}`,
    conversation_id: [senderId, SUPPORT_ADMIN.id].sort().join("_"),
    sender_id: senderId,
    sender_email: message.sender_email || identity.email || "",
    sender_name:
      message.sender_name || identity.full_name || identity.display_name || "CLARA User",
    recipient_id: SUPPORT_ADMIN.id,
    recipient_email: SUPPORT_ADMIN.email,
    recipient_name: SUPPORT_ADMIN.full_name,
    content: topic === "Other concern" ? content : `[${topic}] ${content}`,
    is_read: true,
    created_at: message.created_at || new Date().toISOString(),
    updated_at: message.updated_at || message.created_at || null,
    support_status: message.status || "open",
    support_topic: topic,
  };
}

async function getLocalIdentity(localFacade) {
  try {
    const { data } = await localFacade.auth.getUser();
    return data?.user || {};
  } catch {
    return {};
  }
}

function createSupportMessagesSelectInterceptor(localFacade) {
  return async () => {
    try {
      const [messages, identity] = await Promise.all([
        fetchBackendSupportMessages(),
        getLocalIdentity(localFacade),
      ]);
      return {
        data: messages.map((message) => toSupportDirectMessage(message, identity)),
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  };
}

function createSupportInsertInterceptor(localFacade) {
  return async (value) => {
    const payloads = Array.isArray(value) ? value : [value];
    const first = payloads.find((item) => item && typeof item === "object");
    if (!first) return null;

    const rawContent = String(first.content || "").trim();
    const isSettingsSupportMessage = /^\[CLARA Support\s*•/i.test(rawContent);
    const isSupportRecipient = String(first.recipient_id || "") === SUPPORT_ADMIN.id;

    if (isSettingsSupportMessage && !isSupportRecipient) {
      try {
        const token = requireBackendToken();
        const savedMessages = await Promise.all(
          payloads.map((item) => {
            const recipientId = Number(item?.recipient_id);
            const content = String(item?.content || "").trim();
            if (!Number.isInteger(recipientId) || recipientId <= 0) {
              throw new Error("A valid CLARA admin account is required for support messages.");
            }
            if (!content) {
              throw new Error("Support message content is required.");
            }
            return backendRequest("/api/messages", {
              method: "POST",
              token,
              body: { recipient_id: recipientId, content },
            });
          })
        );
        const delivered = savedMessages.filter(Boolean);
        const firstRecipientId = delivered[0]?.recipient_id || first.recipient_id;
        rememberSupportConversationTarget(firstRecipientId);
        return { data: delivered, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }

    if (!isSettingsSupportMessage && !isSupportRecipient) {
      return {
        data: null,
        error: new Error(
          "Direct user-to-user messaging is not connected to the CLARA backend yet."
        ),
      };
    }

    const parsed = isSettingsSupportMessage
      ? parseSupportContent(rawContent)
      : { topic: "Support follow-up", content: rawContent };

    try {
      const saved = await sendBackendSupportMessage({
        topic: parsed.topic,
        content: parsed.content,
        senderName: first.sender_name,
        senderEmail: first.sender_email,
      });
      const identity = await getLocalIdentity(localFacade);
      return {
        data: saved
          ? [
              toSupportDirectMessage(saved, {
                ...identity,
                id: first.sender_id || identity.id,
                email: first.sender_email || identity.email,
                full_name: first.sender_name || identity.full_name,
              }),
            ]
          : [],
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  };
}

export function withSettingsSupportCompatibility(localFacade) {
  if (!localFacade || typeof localFacade.from !== "function") return localFacade;

  return {
    ...localFacade,
    from(tableName) {
      const table = String(tableName || "").trim().toLowerCase();
      if (table === "profiles") return createProfilesQuery(localFacade);
      if (table === "enrollments") return createBillingQuery();
      if (table === "legal_information_content") {
        return createLegalInformationQuery();
      }
      if (table === "direct_messages") {
        return createReplayQuery(localFacade, "direct_messages", {
          interceptSelect: createSupportMessagesSelectInterceptor(localFacade),
          interceptInsert: createSupportInsertInterceptor(localFacade),
        });
      }
      return localFacade.from(tableName);
    },
  };
}
