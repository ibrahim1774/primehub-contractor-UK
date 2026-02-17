import { createClient } from '@supabase/supabase-js';
import { GeneratorInputs } from '../types.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

// Debug: check if session exists in localStorage on page load
try {
    const storageKey = `sb-${new URL(supabaseUrl || 'http://x').hostname.split('.')[0]}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    console.log('[Supabase] Storage key:', storageKey, 'hasStoredSession:', !!stored);
} catch (e) {
    console.log('[Supabase] Could not check localStorage:', e);
}

/**
 * Persists lead data to Supabase silently.
 */
export const saveLeadToSupabase = async (inputs: GeneratorInputs) => {
    console.log("Supabase saveLead triggered. URL present:", !!supabaseUrl, "Key present:", !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase lead capture skipped: Credentials not set.");
        return;
    }

    try {
        const { error } = await supabase
            .from('leads')
            .insert([
                {
                    company_name: inputs.companyName,
                    phone: inputs.phone,
                    industry: inputs.industry,
                    location: inputs.location,
                    raw_data: inputs
                }
            ]);

        if (error) {
            console.error("Supabase insert error details:", error);
            throw error;
        }
        console.log("Lead saved to Supabase successfully.");
    } catch (error) {
        console.error("Failed to save lead to Supabase:", error);
    }
};
