import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Detect whether the app is running inside a cross-origin iframe. In that
 * environment, `localStorage` / `sessionStorage` access can throw (or be
 * silently blocked) and cookies may be partitioned or refused, which breaks
 * Supabase's default session persistence and causes "unrecognized auth" errors.
 */
function isIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // SecurityError on cross-origin access means we ARE framed.
    return true;
  }
}

/**
 * Pick a storage adapter that works in the current context.
 * - Top-level tab: use localStorage (default, persists across reloads).
 * - Inside an iframe: use an in-memory shim so session reads/writes never throw,
 *   and fall back to re-fetching the session from the server on each load.
 */
function pickStorage() {
  if (!isIframe()) {
    // Respect the host browser's storage if available.
    try {
      localStorage.getItem('__probe__');
      return undefined; // let supabase-js use its default localStorage adapter
    } catch {
      // localStorage blocked (private mode, etc.) — fall through to memory shim
    }
  }
  const memoryStore = new Map<string, string>();
  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => void memoryStore.set(key, value),
    removeItem: (key: string) => void memoryStore.delete(key),
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // We handle the OAuth/session redirect ourselves; disable URL sniffing so
    // a stale `access_token` in the URL doesn't override a valid stored session
    // (common cause of "unrecognized auth" inside iframes).
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: pickStorage(),
  },
});
