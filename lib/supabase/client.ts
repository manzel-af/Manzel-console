'use client';

/**
 * The console's one Supabase client, in the browser.
 *
 * It holds only the public URL and the anon key — the same two values the app
 * ships in every phone. Everything an operator may do is decided by the
 * database (is_platform_admin(), RLS, the admin_* functions) and by the edge
 * functions behind the operator's own session; the service-role key never
 * comes near the console, its server or its build.
 *
 * The session lives in this browser's localStorage under its own key, so the
 * console and anything else on the same domain never share one by accident.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient<Database> | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.');
  }
  client = createClient<Database>(url, anonKey, {
    auth: {
      storageKey: 'manzel-console-auth',
      persistSession: true,
      autoRefreshToken: true,
      // Sign-in is a code typed on the page; no link brings a session back.
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-application-name': 'manzel-console' } },
  });
  return client;
}

/** Calls a Manzel edge function and unwraps its { error: { code, message } } envelope. */
export async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; errorCode: string | null; errorMessage: string | null }> {
  const { data, error } = await getSupabase().functions.invoke<T & { error?: { code: string; message: string } }>(
    name,
    { body },
  );

  if (error) {
    // A non-2xx arrives as a FunctionsHttpError whose body holds the envelope.
    let code = 'server_error';
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json();
        code = parsed?.error?.code ?? code;
        message = parsed?.error?.message ?? message;
      } catch {
        // Keep the transport-level message.
      }
    }
    return { data: null, errorCode: code, errorMessage: message };
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return { data: null, errorCode: data.error.code, errorMessage: data.error.message };
  }

  return { data: data as T, errorCode: null, errorMessage: null };
}
