// Legacy compatibility shim for retired Supabase call sites.
// CLARA's current finance/runtime mode is local-first; this module exists only
// so older, non-authoritative surfaces can still compile while their remaining
// Supabase references are retired incrementally.

const emptyResult = () => Promise.resolve({ data: null, error: null });

function createQueryBuilder() {
  const builder = {
    select() { return builder; },
    insert() { return builder; },
    update() { return builder; },
    upsert() { return builder; },
    delete() { return builder; },
    eq() { return builder; },
    neq() { return builder; },
    gt() { return builder; },
    gte() { return builder; },
    lt() { return builder; },
    lte() { return builder; },
    in() { return builder; },
    is() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    range() { return builder; },
    single() { return emptyResult(); },
    maybeSingle() { return emptyResult(); },
    then(resolve, reject) { return emptyResult().then(resolve, reject); },
  };
  return builder;
}

export const supabase = {
  auth: {
    async getUser() {
      return { data: { user: null }, error: null };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange() {
      return {
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      };
    },
    async signOut() {
      return { error: null };
    },
  },
  from() {
    return createQueryBuilder();
  },
  storage: {
    from() {
      return {
        async upload() { return { data: null, error: null }; },
        async remove() { return { data: null, error: null }; },
        getPublicUrl() { return { data: { publicUrl: "" } }; },
      };
    },
  },
};

export default supabase;
