import { sendBackendSupportMessage } from "@/lib/support-backend-client";

const SUPPORT_ADMIN = Object.freeze({
  id: "clara-support",
  email: "claraprogram2026@gmail.com",
  full_name: "CLARA Support",
  role: "admin",
});

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

function createProfilesQuery(localFacade) {
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
        method === "eq" && args[0] === "role" && String(args[1] || "").toLowerCase() === "admin"
    );

  const execute = async () => {
    if (isAdminLookup()) {
      const data = [SUPPORT_ADMIN];
      return terminal === "maybeSingle" || terminal === "single"
        ? { data: SUPPORT_ADMIN, error: null }
        : { data, error: null };
    }

    let underlying = localFacade.from("profiles");
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

  Object.assign(query, {
    select: (...args) => chain("select", args),
    eq: (...args) => chain("eq", args),
    in: (...args) => chain("in", args),
    is: (...args) => chain("is", args),
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

function createDirectMessagesQuery() {
  const query = {};

  query.insert = (value) => {
    const payloads = Array.isArray(value) ? value : [value];
    const execute = async () => {
      const first = payloads.find((item) => item && typeof item === "object");
      if (!first) return { data: null, error: new Error("Support message is empty.") };

      const parsed = parseSupportContent(first.content);
      try {
        const saved = await sendBackendSupportMessage({
          topic: parsed.topic,
          content: parsed.content,
          senderName: first.sender_name,
          senderEmail: first.sender_email,
        });
        return { data: saved ? [saved] : [], error: null };
      } catch (error) {
        return { data: null, error };
      }
    };

    return {
      select: () => ({
        single: async () => {
          const result = await execute();
          return {
            data: Array.isArray(result.data) ? result.data[0] || null : result.data,
            error: result.error,
          };
        },
      }),
      then: (resolve, reject) => execute().then(resolve, reject),
      catch: (reject) => execute().catch(reject),
      finally: (handler) => execute().finally(handler),
    };
  };

  return query;
}

export function withSettingsSupportCompatibility(localFacade) {
  if (!localFacade || typeof localFacade.from !== "function") return localFacade;

  return {
    ...localFacade,
    from(tableName) {
      const table = String(tableName || "").trim().toLowerCase();
      if (table === "profiles") return createProfilesQuery(localFacade);
      if (table === "direct_messages") return createDirectMessagesQuery();
      return localFacade.from(tableName);
    },
  };
}
