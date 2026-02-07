import { createClient } from '@supabase/supabase-js';

// Access environment variables securely
// Make sure to create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Please check your .env file.');
}

// Create a single supabase client for interacting with your database
// Create a single supabase client for interacting with your database
const createSafeClient = () => {
    // Attempt to get from env, or fallback to hardcoded values (provided by user)
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
        console.warn('Supabase URL or Anon Key is missing. Supabase features will be disabled.');
        // Return a dummy object that matches the shape but throws on use
        return {
            storage: {
                from: () => ({
                    upload: async () => ({ error: new Error("Supabase is not configured. Please check .env file.") }),
                    createSignedUrl: async () => ({ error: new Error("Supabase is not configured.") }),
                    remove: async () => ({ error: new Error("Supabase is not configured.") }),
                    getPublicUrl: () => ({ data: { publicUrl: "" } })
                })
            }
        } as any;
    }
    return createClient(url, key);
};

export const supabase = createSafeClient();
