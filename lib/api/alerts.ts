'use client';

/**
 * Alerts to the operators (V037): what the platform told them, by email and
 * by web push, and this browser's subscription to the push.
 *
 * The database writes an alert (a support message waiting, a building
 * request, an idea or a report, a reported chat message) and its
 * operator-alerts function sends it: email to support@ or admin@, and a push
 * to every operator's console that turned alerts on here. The console also
 * hears each new alert live (Realtime) while it is open.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ManageError, fail } from '@/lib/errors';
import type { AppLanguage } from '@/lib/i18n/languages';
import { getSupabase } from '@/lib/supabase/client';
import type { OperatorAlertRow, OperatorPushSubscriptionRow } from '@/lib/supabase/database.types';

export const alertKeys = {
  list: ['admin', 'alerts', 'list'] as const,
  subscriptions: ['admin', 'alerts', 'subscriptions'] as const,
};

export function useOperatorAlerts(limit = 100) {
  return useQuery({
    queryKey: alertKeys.list,
    refetchInterval: 60_000,
    queryFn: async (): Promise<OperatorAlertRow[]> => {
      const { data, error } = await getSupabase()
        .from('operator_alerts').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) fail(error);
      return (data ?? []) as OperatorAlertRow[];
    },
  });
}

/** This operator's consoles that receive alerts (theirs only: RLS). */
export function useMySubscriptions() {
  return useQuery({
    queryKey: alertKeys.subscriptions,
    queryFn: async (): Promise<OperatorPushSubscriptionRow[]> => {
      const { data, error } = await getSupabase()
        .from('operator_push_subscriptions').select('*').order('created_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []) as OperatorPushSubscriptionRow[];
    },
  });
}

export async function sendTestAlert(): Promise<void> {
  const { error } = await getSupabase().rpc('admin_test_alert');
  if (error) {
    if (/alert_rate_limited/.test(error.message)) throw new ManageError('console.alerts.rateLimited', error.message);
    fail(error);
  }
}

// ---- this browser ---------------------------------------------------------------

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushState =
  | { status: 'checking' }
  | { status: 'unsupported' }
  | { status: 'unconfigured' }
  | { status: 'blocked' }
  | { status: 'off' }
  | { status: 'on'; endpoint: string };

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function readState(): Promise<PushState> {
  if (!pushSupported()) return { status: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { status: 'unconfigured' };
  if (Notification.permission === 'denied') return { status: 'blocked' };
  const subscription = await currentSubscription();
  return subscription ? { status: 'on', endpoint: subscription.endpoint } : { status: 'off' };
}

/** Whether this browser gets alerts; `refresh` after turning them on or off. */
export function usePushState(): { state: PushState; refresh(): void } {
  const [state, setState] = useState<PushState>({ status: 'checking' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    readState().then((next) => {
      if (live) setState(next);
    }, () => {
      if (live) setState({ status: 'unsupported' });
    });
    return () => {
      live = false;
    };
  }, [tick]);
  return { state, refresh: () => setTick((value) => value + 1) };
}

/**
 * Asks the browser for permission (the browser's own prompt), subscribes it
 * with the platform's VAPID key and tells the database where to push.
 */
export async function subscribeThisBrowser(language: AppLanguage): Promise<void> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) throw new ManageError('console.alerts.unsupported');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new ManageError('console.alerts.blocked');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const json = subscription.toJSON();
  const { error } = await getSupabase().rpc('operator_push_subscribe', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_language: language,
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) fail(error);
}

export async function unsubscribeThisBrowser(): Promise<void> {
  if (!pushSupported()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  const { error } = await getSupabase().rpc('operator_push_unsubscribe', { p_endpoint: subscription.endpoint });
  if (error) fail(error);
  await subscription.unsubscribe();
}

/**
 * Signing out stops the alerts here, so whoever uses this computer next is not
 * shown them; "everywhere" stops them on every console of this operator, as
 * that is what a lost or shared machine needs. The database forgets the
 * endpoints while the session can still ask, and the browser drops its own
 * subscription regardless: a push to it is then refused and forgotten.
 *
 * Never throws and never takes more than a few seconds — signing out must not
 * wait on it. Not `serviceWorker.ready`, which never settles without a worker.
 */
export async function stopAlertsOnSignOut(everywhere: boolean): Promise<void> {
  const work = async () => {
    const registration = pushSupported() ? await navigator.serviceWorker.getRegistration() : undefined;
    const subscription = (await registration?.pushManager.getSubscription()) ?? null;
    try {
      const endpoints = new Set(subscription ? [subscription.endpoint] : []);
      const supabase = getSupabase();
      if (everywhere) {
        const { data } = await supabase.from('operator_push_subscriptions').select('endpoint');
        for (const row of data ?? []) endpoints.add(row.endpoint as string);
      }
      await Promise.all([...endpoints].map((endpoint) => supabase.rpc('operator_push_unsubscribe', { p_endpoint: endpoint })));
    } finally {
      await subscription?.unsubscribe();
    }
  };
  await Promise.race([
    work().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}
