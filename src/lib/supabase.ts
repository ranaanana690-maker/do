import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-project')) {
  console.warn('⚠️ Supabase environment variables are set to placeholder values. Please update your .env file with your actual VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Automatically cleans up expired or invalid JWT sessions from localStorage
 * to prevent blocking public requests (students) or freezing admin pages with "JWT expired".
 */
export async function clearStaleSessionIfExpired(): Promise<void> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (
        error.message?.toLowerCase().includes('jwt') ||
        error.message?.toLowerCase().includes('expired') ||
        error.message?.toLowerCase().includes('invalid')
      ) {
        console.warn('⚠️ Expired or invalid JWT detected in storage. Purging session...');
        await supabase.auth.signOut().catch(() => {});
        // Clean all supabase auth tokens from localStorage
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
      }
      return;
    }

    if (session) {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      // If token expired in the past, attempt refresh or purge
      if (expiresAt && Date.now() >= expiresAt) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed.session) {
          console.warn('⚠️ Session refresh failed for expired token. Signing out...');
          await supabase.auth.signOut().catch(() => {});
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Session check notice:', err);
  }
}

// Run cleanup immediately on script execution
if (typeof window !== 'undefined') {
  clearStaleSessionIfExpired();
}

/**
 * Handles API errors: if error is JWT expired, clears session and prompts redirect to login
 */
export async function handleSupabaseError(error: any, onAuthExpired?: () => void): Promise<string> {
  const message = error?.message || String(error || '');
  if (
    message.toLowerCase().includes('jwt') ||
    message.toLowerCase().includes('expired') ||
    error?.code === 'PGRST301'
  ) {
    console.warn('🚨 JWT Expired Error encountered. Clearing session...');
    await supabase.auth.signOut().catch(() => {});
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
    if (onAuthExpired) {
      onAuthExpired();
    }
    return 'انتهت صلاحية جلسة الدخول (JWT Expired). يرجى إعادة تسجيل الدخول.';
  }
  return message;
}
