import { fetchCurrentBackendBilling } from "@/lib/billing-backend-client";
import {
  fetchBackendLegalInformation,
  updateBackendLegalInformation,
} from "@/lib/legal-information-backend-client";
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

function createReplayQuery(localFacade, tableName, { interceptInsert } = {}) {
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

  const execute = async () => {
    const insertOperation = operations.find(({ method }) => method === "insert");
    if (insertOperation && typeof interceptInsert === "function") {
      const intercepted = await interceptInsert(insertOperation.args[0]);
      if (intercepted) {
        if (terminal === "single" || terminal === "maybeSingle") {
          return {
            data: Array.isArray(intercepted.data)
              ? intercepted.data[0] || null
              : intercepted.data,
            error: intercepted.error || null,
          };
        }
        return intercepted;
      }
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

  const execute = async () => {
    if (isAdminLookup()) {
      return terminal === "maybeSingle" || terminal === "single"
        ? { data: SUPPORT_ADMIN, error: null }
        : { data: [SUPPORT_ADMIN], error: null };
    }

    let delegated = base;
    for (const { method, args } of operations) {
      if (typeof delegated?.[method] === "function") {
        delegated = delegated[method](...args);
      }
    }
    if (terminal !== "select" && typeof delegated?.[terminal] === "function") {
      return delegated[terminal]();
    }
    return delegated;
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

function supportInsertInterceptor(value) {
  const payloads = Array.isArray(value) ? value : [value];
  const first = payloads.find((item) => item && typeof item === "object");
  if (!first) return null;

  const rawContent = String(first.content || "");
  if (!/^\[CLARA Support\s*•/i.test(rawContent.trim())) return null;

  const parsed = parseSupportContent(rawContent);
  return sendBackendSupportMessage({
    topic: parsed.topic,
    content: parsed.content,
    senderName: first.sender_name,
    senderEmail: first.sender_email,
  })
    .then((saved) => ({ data: saved ? [saved] : [], error: null }))
    .catch((error) => ({ data: null, error }));
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
          interceptInsert: supportInsertInterceptor,
        });
      }
      return localFacade.from(tableName);
    },
  };
}
