import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a minimal dummy client for build-time to prevent crashes
const dummySupabase = {
    auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        getSession: () => Promise.resolve({ data: { session: null } }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
        signUp: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
        select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
            match: () => Promise.resolve({ data: [], error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
            delete: () => ({ match: () => Promise.resolve({ data: null, error: null }), eq: () => Promise.resolve({ data: null, error: null }) }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ match: () => Promise.resolve({ data: null, error: null }), eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
    storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
        })
    },
    channel: () => ({
        on: () => ({
            subscribe: () => ({})
        }),
        subscribe: () => ({})
    })
};

// Create client only if variables are available to avoid build-time crashes
if (!supabaseUrl || !supabaseKey) {
    if (typeof window !== 'undefined') {
        console.warn('Supabase environment variables are missing! Authentication will not work. Please check your Vercel/Environment Variables.');
    }
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : dummySupabase as any;
