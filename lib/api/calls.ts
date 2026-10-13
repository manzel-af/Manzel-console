'use client';

/**
 * The platform's STUN and TURN servers for calls (V029, the app's
 * features/calls/api.ts, operator half).
 *
 * The TURN secret is WRITE-ONLY: admin_call_settings says only whether one
 * is saved, phones get short-lived credentials derived from it, and nothing
 * here ever reads it back. Sending null keeps the saved one.
 */

import { useQuery } from '@tanstack/react-query';

import { fail } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import type { AdminCallSettings } from '@/lib/supabase/database.types';

export const callSettingsKey = ['admin', 'calls'] as const;

export function useAdminCallSettings() {
  return useQuery({
    queryKey: callSettingsKey,
    queryFn: async (): Promise<AdminCallSettings> => {
      const { data, error } = await getSupabase().rpc('admin_call_settings');
      if (error || !data) fail(error);
      return data as AdminCallSettings;
    },
  });
}

export async function saveAdminCallSettings(input: {
  stunUrls: string[];
  turnUrls: string[];
  /** Null keeps the stored secret: the form never shows it. */
  turnSecret: string | null;
  clearSecret: boolean;
}): Promise<AdminCallSettings> {
  const { data, error } = await getSupabase().rpc('admin_set_call_settings', {
    p_stun_urls: input.stunUrls,
    p_turn_urls: input.turnUrls,
    p_turn_secret: input.turnSecret,
    p_clear_secret: input.clearSecret,
  });
  if (error || !data) fail(error);
  return data as AdminCallSettings;
}
