import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = import.meta.env["VITE_SUPABASE_" + "ANON_KEY"] || "";

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

let supabaseInstance = null;

if (isSupabaseConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.error("Supabase is not configured. Missing URL or anon key.");
}

const normalizeString = (value) => String(value ?? "").trim();

const getExpenseCategoryFallback = (payload) =>
  normalizeString(
    payload?.category ||
      payload?.expense_category ||
      payload?.budget_category ||
      payload?.classification ||
      payload?.type ||
      "other"
  ).toLowerCase() || "other";

const normalizeExpenseWriteRow = (row) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;

  const nextRow = { ...row };

  if (!normalizeString(nextRow.category) && normalizeString(nextRow.expense_category)) {
    nextRow.category = getExpenseCategoryFallback(nextRow);
  }

  delete nextRow.expense_category;

  return nextRow;
};

const normalizeExpenseWritePayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map((row) => normalizeExpenseWriteRow(row));
  }

  return normalizeExpenseWriteRow(payload);
};

const createExpenseTableProxy = (tableBuilder) =>
  new Proxy(tableBuilder, {
    get(target, prop, receiver) {
      if (["insert", "update", "upsert"].includes(prop)) {
        return (payload, options) =>
          Reflect.get(target, prop, target).call(
            target,
            normalizeExpenseWritePayload(payload),
            options
          );
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

const createConfiguredSupabaseProxy = (client) =>
  new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (tableName) => {
          const tableBuilder = target.from(tableName);
          return String(tableName || "").toLowerCase() === "expenses"
            ? createExpenseTableProxy(tableBuilder)
            : tableBuilder;
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

const createMissingConfigProxy = () =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "auth") {
          const notConfigured = async () => ({
            data: null,
            error: new Error("Supabase is not configured."),
          });

          return {
            getSession: async () => ({
              data: { session: null },
              error: new Error("Supabase is not configured."),
            }),
            getUser: async () => ({
              data: { user: null },
              error: new Error("Supabase is not configured."),
            }),
            signInWithPassword: notConfigured,
            signUp: notConfigured,
            signInWithOAuth: notConfigured,
            signOut: async () => ({
              error: new Error("Supabase is not configured."),
            }),
            onAuthStateChange: (callback) => {
              if (typeof callback === "function") {
                callback("INITIAL_SESSION", null);
              }

              return {
                data: {
                  subscription: {
                    unsubscribe: () => {},
                  },
                },
              };
            },
          };
        }

        if (prop === "from") {
          return () => {
            const response = async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            });

            return {
              select: response,
              insert: response,
              update: response,
              delete: response,
              upsert: response,
              eq: () => ({
                select: response,
                update: response,
                delete: response,
                order: response,
              }),
              order: response,
            };
          };
        }

        return undefined;
      },
    }
  );

export const supabase = supabaseInstance
  ? createConfiguredSupabaseProxy(supabaseInstance)
  : createMissingConfigProxy();
