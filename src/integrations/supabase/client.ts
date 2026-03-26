/**
 * Supabase client STUB
 * 
 * The app has been migrated to a custom Express + PostgreSQL backend.
 * This stub prevents crashes for any remaining components that still
 * import { supabase } before they are fully migrated.
 * 
 * All stub methods return empty/no-op results.
 */

const noop = () => Promise.resolve({ data: null, error: null });
const noopSelect = () => ({
  eq: () => noopSelect(),
  neq: () => noopSelect(),
  in: () => noopSelect(),
  order: () => noopSelect(),
  limit: () => noopSelect(),
  single: () => Promise.resolve({ data: null, error: null }),
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
  select: () => noopSelect(),
  filter: () => noopSelect(),
  gte: () => noopSelect(),
  lte: () => noopSelect(),
  ilike: () => noopSelect(),
  then: (resolve: (v: any) => any) => Promise.resolve({ data: [], error: null }).then(resolve),
});

const noopMutation = () => ({
  ...noopSelect(),
  upsert: () => noopMutation(),
  insert: () => noopMutation(),
  update: () => noopMutation(),
  delete: () => noopMutation(),
});

export const supabase = {
  from: (_table: string) => ({
    select: (_cols?: string) => noopSelect(),
    insert: (_data: any) => noopMutation(),
    update: (_data: any) => noopMutation(),
    upsert: (_data: any, _opts?: any) => noopMutation(),
    delete: () => noopMutation(),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: () => Promise.resolve({ data: null, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Use new auth system' } }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ error: null }),
    verifyOtp: () => Promise.resolve({ data: null, error: null }),
  },
  storage: {
    from: (_bucket: string) => ({
      upload: () => Promise.resolve({ error: null }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
    }),
  },
  rpc: (_fn: string, _args?: any) => Promise.resolve({ data: null, error: null }),
  channel: (_name: string) => ({
    on: (_event: string, _opts: any, _cb: any) => ({
      subscribe: () => {},
    }),
  }),
  removeChannel: (_ch: any) => {},
  functions: {
    invoke: (_name: string, _opts?: any) => Promise.resolve({ data: null, error: null }),
  },
} as any;