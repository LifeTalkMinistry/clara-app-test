import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

let supabaseInstance = null;

if (isSupabaseConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
} else {
  console.error(
    "Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY."
  );
}

const createMissingConfigProxy = () =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "auth") {
          return {
            getSession: async () => ({
              data: { session: null },
              error: new Error("Supabase is not configured."),
            }),
            getUser: async () => ({
              data: { user: null },
              error: new Error("Supabase is not configured."),
            }),
            signInWithPassword: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
            signUp: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
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
          return () => ({
            select: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
            insert: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
            update: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
            delete: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
            upsert: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
            eq: () => ({
              select: async () => ({
                data: null,
                error: new Error("Supabase is not configured."),
              }),
              update: async () => ({
                data: null,
                error: new Error("Supabase is not configured."),
              }),
              delete: async () => ({
                data: null,
                error: new Error("Supabase is not configured."),
              }),
              order: async () => ({
                data: null,
                error: new Error("Supabase is not configured."),
              }),
            }),
            order: async () => ({
              data: null,
              error: new Error("Supabase is not configured."),
            }),
          });
        }

        return undefined;
      },
    }
  );

export const supabase = supabaseInstance || createMissingConfigProxy();