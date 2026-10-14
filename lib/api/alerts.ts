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
import { useEffect, useSyncExternalStore } from 'react';

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

/**
 * This browser's subscription, if it has one. getRegistration, not `ready`:
 * `ready` never settles in a browser where the worker is not registered, and
 * the state would say "checking" for ever.
 */
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** The worker to subscribe through: the active one, or the one the console is registering now. */
async function workerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new ManageError('console.alerts.unsupported')), 10_000)),
  ]);
}

async function readState(): Promise<PushState> {
  if (!pushSupported()) return { status: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { status: 'unconfigured' };
  if (Notification.permission === 'denied') return { status: 'blocked' };
  const subscription = await currentSubscription();
  return subscription ? { status: 'on', endpoint: subscription.endpoint } : { status: 'off' };
}

// One state for every screen that shows it (the Alerts page, Home's card),
// read again whenever something turns alerts on or off.
const CHECKING: PushState = { status: 'checking' };
let pushState: PushState = CHECKING;
let reading: Promise<void> | null = null;
const pushListeners = new Set<() => void>();

/** Reads this browser's state again, and tells every screen showing it. */
export function refreshPushState(): Promise<void> {
  reading = readState()
    .then((next) => { pushState = next; }, () => { pushState = { status: 'unsupported' }; })
    .then(() => { for (const listener of pushListeners) listener(); });
  return reading;
}

function listenToPushState(listener: () => void) {
  pushListeners.add(listener);
  if (!reading) void refreshPushState();
  return () => {
    pushListeners.delete(listener);
  };
}

/** Whether this browser gets alerts; `refresh` after turning them on or off. */
export function usePushState(): { state: PushState; refresh(): void } {
  const state = useSyncExternalStore(listenToPushState, () => pushState, () => CHECKING);
  return { state, refresh: () => void refreshPushState() };
}

/**
 * Asks the browser for permission (the browser's own prompt), subscribes it
 * with the platform's VAPID key and tells the database where to push. With
 * permission already given there is no prompt: it only makes sure the
 * database knows this browser, in this language.
 */
export async function subscribeThisBrowser(language: AppLanguage): Promise<void> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) throw new ManageError('console.alerts.unsupported');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new ManageError('console.alerts.blocked');
  const registration = await workerRegistration();
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
  // Turned off by hand: the console does not turn it back on by itself.
  setFlag(OFF_BY_HAND, true);
}

/** The browser's prompt was shown once by the console itself. */
const ASKED = 'manzel-console-alerts-asked';
/** Turned off on the Alerts page: no switching back on behind the operator's back. */
const OFF_BY_HAND = 'manzel-console-alerts-off';

function flag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setFlag(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // Private mode: forgotten with the window, which is harmless.
  }
}

/** Turned on by a click (Home's card, the Alerts page): the operator's choice. */
export async function turnOnAlertsHere(language: AppLanguage): Promise<void> {
  setFlag(OFF_BY_HAND, false);
  await subscribeThisBrowser(language);
}

/**
 * Alerts turn themselves on, as other sites' do (2026-10-14):
 *
 *   allowed already    subscribed without asking — unless turned off by hand
 *                      on the Alerts page; a browser already subscribed tells
 *                      the database again, in the console's language, in
 *                      case the database had forgotten it;
 *   never asked        the browser's own prompt, once (Chrome and Edge show
 *                      it; Firefox and Safari only after a click, which
 *                      Home's card offers);
 *   blocked            nothing: Home's card says how to allow it.
 */
export function useAutoAlerts(language: AppLanguage) {
  useEffect(() => {
    if (!pushSupported() || !VAPID_PUBLIC_KEY) return;
    let cancelled = false;
    void (async () => {
      const permission = Notification.permission;
      if (permission === 'denied') return;
      if (permission === 'granted') {
        const existing = await currentSubscription().catch(() => null);
        if (!existing && flag(OFF_BY_HAND)) return;
      } else {
        if (flag(ASKED)) return;
        setFlag(ASKED, true);
      }
      try {
        await subscribeThisBrowser(language);
      } catch {
        // Not allowed, or no worker yet: Home's card says so and offers the click.
      }
      if (!cancelled) void refreshPushState();
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);
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
