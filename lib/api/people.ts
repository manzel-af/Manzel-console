'use client';

/**
 * People, as the operator's pages show them (the app's features/admin
 * presence.tsx, push-draft.ts and account-recovery): presence and its
 * filters, the people picked for a notification, the message being written,
 * and sign-in codes.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import { CONTENT_LANGUAGES, type ContentButton, type ContentQuestion, type TextDraft } from '@/lib/content';
import { fail } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import { getSupabase } from '@/lib/supabase/client';
import type {
  DuplicateGroup, MergeResult, NotificationScreen, PushImportance, SignInCodeIssued,
} from '@/lib/supabase/database.types';
import { useNow } from '@/lib/use-now';

import type { UserFilters } from './admin';

// ---------------------------------------------------------------------------
// Presence (V023): online = the app in the foreground within ~2.5 minutes
// ---------------------------------------------------------------------------

export const PRESENCE_FILTERS = ['any', 'online', 'today', 'day', 'week', 'never'] as const;
export type PresenceFilter = typeof PRESENCE_FILTERS[number];

const HOUR = 3_600_000;

export function usePresenceQuery(): (filter: PresenceFilter) => UserFilters {
  const now = useNow(60_000);
  return useCallback((filter: PresenceFilter): UserFilters => {
    switch (filter) {
      case 'online': return { presence: 'online' };
      case 'today': return { seenAfter: new Date(now - 24 * HOUR).toISOString(), order: 'seen' };
      case 'day': return { seenBefore: new Date(now - 24 * HOUR).toISOString(), order: 'seen' };
      case 'week': return { seenBefore: new Date(now - 7 * 24 * HOUR).toISOString(), order: 'seen' };
      case 'never': return { presence: 'never' };
      default: return {};
    }
  }, [now]);
}

/** "Online now", "Last seen 3 days ago", "Never opened the app". */
export function useLastSeen() {
  const t = useT();
  const fmt = useFormat();
  return useCallback((user: { online: boolean; last_seen_at: string | null }): string => {
    if (user.online) return t('admin.presence.online');
    if (!user.last_seen_at) return t('admin.presence.never');
    return t('admin.presence.lastSeen', { when: fmt.relative(user.last_seen_at) });
  }, [t, fmt]);
}

// ---------------------------------------------------------------------------
// The people picked for a notification, and the message being written
// ---------------------------------------------------------------------------

export interface PickedPerson {
  id: string;
  name: string;
}

export interface MessageDraft {
  texts: TextDraft;
  buttons: ContentButton[];
  question: ContentQuestion | null;
  imageUrl: string | null;
  screen: NotificationScreen | null;
  importance: PushImportance;
}

/**
 * Kept in this tab's sessionStorage: chosen on People, sent from
 * Notifications, and a reload in between loses nothing. Never in
 * localStorage — the names of the people chosen are not this browser's to keep.
 */
const PICKED_KEY = 'manzel.console.picked';
const DRAFT_KEY = 'manzel.console.messageDraft';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Kept for as long as the page is open.
  }
}

let picked: PickedPerson[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: PickedPerson[] = [];

function pickedNow(): PickedPerson[] {
  if (picked === null) picked = readJson<PickedPerson[]>(PICKED_KEY, []);
  return picked;
}

function setPickedList(next: PickedPerson[]) {
  picked = next;
  writeJson(PICKED_KEY, next.length ? next : null);
  listeners.forEach((listener) => listener());
}

export function usePickedPeople(): PickedPerson[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pickedNow,
    () => EMPTY,
  );
}

export function togglePicked(person: PickedPerson) {
  const current = pickedNow();
  setPickedList(current.some((one) => one.id === person.id)
    ? current.filter((one) => one.id !== person.id)
    : [...current, person]);
}

export function setPicked(people: PickedPerson[]) {
  setPickedList(people);
}

export function clearPicked() {
  if (pickedNow().length) setPickedList([]);
}

export function draftHasContent(draft: MessageDraft): boolean {
  return CONTENT_LANGUAGES.some((lang) => draft.texts[lang].title.trim() !== '' || draft.texts[lang].body.trim() !== '')
    || draft.buttons.length > 0
    || draft.question !== null
    || draft.imageUrl !== null;
}

export function getMessageDraft(): MessageDraft | null {
  return readJson<MessageDraft | null>(DRAFT_KEY, null);
}

export function keepMessageDraft(draft: MessageDraft) {
  writeJson(DRAFT_KEY, draftHasContent(draft) ? draft : null);
}

export function clearMessageDraft() {
  writeJson(DRAFT_KEY, null);
}

// ---------------------------------------------------------------------------
// Sign-in codes and duplicate accounts (V030)
// ---------------------------------------------------------------------------

/** A one-time code for someone who cannot get into their account. */
export async function issueSignInCode(profileId: string, buildingId: string | null): Promise<SignInCodeIssued> {
  const { data, error } = await getSupabase().rpc('issue_sign_in_code', {
    p_profile_id: profileId, p_building_id: buildingId,
  });
  if (error || !data) fail(error);
  return data as SignInCodeIssued;
}

/**
 * Moves everything of `remove` to `keep` and deletes the extra login. A
 * membership the kept account already has is ended rather than doubled.
 * Cannot be undone; never removes an operator.
 */
export async function mergeAccounts(keep: string, remove: string): Promise<MergeResult> {
  const { data, error } = await getSupabase().rpc('admin_merge_accounts', { p_keep: keep, p_remove: remove });
  if (error || !data) fail(error);
  return data as MergeResult;
}

export const duplicatesKey = ['admin', 'duplicates'] as const;

export function useDuplicateAccounts(enabled = true) {
  return useQuery({
    queryKey: duplicatesKey,
    enabled,
    queryFn: async (): Promise<DuplicateGroup[]> => {
      const { data, error } = await getSupabase().rpc('admin_duplicate_accounts');
      if (error) fail(error);
      return (data ?? []) as DuplicateGroup[];
    },
  });
}
