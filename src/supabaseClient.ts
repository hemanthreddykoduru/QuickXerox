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
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://tkwazltvxdztaunerksd.supabase.co';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrd2F6bHR2eGR6dGF1bmVya3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTA0NzYsImV4cCI6MjA4NDgyNjQ3Nn0.x0fdlqIIE_iRMfsiIyMDHYysx61eHLRbrxRilC1JGmQ';

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
