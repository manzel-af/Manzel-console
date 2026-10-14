'use client';

/**
 * The operator's side of talking to the platform (V026), and the reported
 * messages of every building's room (V033) — the app's features/support and
 * features/safety, operator half, in the same words.
 *
 * Writing goes through the support-desk edge function: it calls the same
 * database function with this operator's token, then tells the person in
 * their own language — SQL cannot do that part.
 */

import { useQuery } from '@tanstack/react-query';

import type { BadgeTone } from '@/components/ui/feedback';
import { ManageError, errorKey } from '@/lib/errors';
import { callFunction, getSupabase } from '@/lib/supabase/client';
import type {
  AdminPlatformRequest, AdminSupportThread, ChatReport, OperatorSummary, PlatformRequestKind,
  PlatformRequestStatus, RequestCounts, SupportCounts, SupportThreadDetail,
} from '@/lib/supabase/database.types';

const db = () => getSupabase();

export const SUPPORT_BUCKET = 'support-attachments';
export const CHAT_BUCKET = 'chat-attachments';

export type DeskScope = 'queue' | 'mine' | 'all' | 'closed';
export type IdeaKind = PlatformRequestKind | 'all';

export const supportKeys = {
  thread: (id: string) => ['support', 'thread', id] as const,
  desk: (scope: DeskScope) => ['admin', 'support', scope] as const,
  counts: ['admin', 'support', 'counts'] as const,
  operators: ['admin', 'operators'] as const,
  ideasDesk: (kind: IdeaKind, status: string) => ['admin', 'ideas', kind, status] as const,
  ideasCounts: ['admin', 'ideas', 'counts'] as const,
  reports: ['safety', 'reports'] as const,
};

function fail(errorCode: string | null | undefined, errorMessage: string | null | undefined): never {
  throw new ManageError(errorKey(errorMessage ?? undefined, errorCode ?? undefined), errorMessage ?? undefined);
}

// ---------------------------------------------------------------------------
// The support desk
// ---------------------------------------------------------------------------

export function useSupportDesk(scope: DeskScope) {
  return useQuery({
    queryKey: supportKeys.desk(scope),
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<AdminSupportThread[]> => {
      const { data, error } = await db().rpc('admin_support_threads', { p_scope: scope });
      if (error) fail(error.code, error.message);
      return (data ?? []) as AdminSupportThread[];
    },
  });
}

export function useSupportCounts(enabled = true) {
  return useQuery({
    queryKey: supportKeys.counts,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<SupportCounts> => {
      const { data, error } = await db().rpc('admin_support_counts');
      if (error) fail(error.code, error.message);
      return data as SupportCounts;
    },
  });
}

export function useOperators(enabled = true) {
  return useQuery({
    queryKey: supportKeys.operators,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<OperatorSummary[]> => {
      const { data, error } = await db().rpc('admin_operators');
      if (error) fail(error.code, error.message);
      return (data ?? []) as OperatorSummary[];
    },
  });
}

/** One conversation, with who the operator is talking to. */
export function useSupportThread(threadId: string) {
  return useQuery({
    queryKey: supportKeys.thread(threadId),
    enabled: Boolean(threadId),
    staleTime: 10_000,
    queryFn: async (): Promise<SupportThreadDetail> => {
      const { data, error } = await db().rpc('support_thread', { p_thread_id: threadId });
      if (error) fail(error.code, error.message);
      return data as SupportThreadDetail;
    },
  });
}

/** Read, and still reading: the server's heartbeat for "watching". */
export async function markThreadRead(threadId: string) {
  await db().rpc('support_mark_read', { p_thread_id: threadId });
}

/**
 * The thread is off this screen (V038): the person's next message alerts the
 * operators again at once. Never fails loudly — before V038 it is just an error.
 */
export function stopWatchingThread(threadId: string) {
  void db().rpc('support_unwatch' as never, { p_thread_id: threadId } as never).then(() => undefined, () => undefined);
}

export interface OutgoingAttachment {
  path: string;
  type: string;
  size: number;
}

export async function sendMessage(threadId: string, body: string, attachment: OutgoingAttachment | null) {
  const { data, errorCode, errorMessage } = await callFunction<{ threadId: string; claimed: boolean }>(
    'support-desk',
    {
      action: 'send',
      threadId,
      body: body.trim() || null,
      attachmentPath: attachment?.path ?? null,
      attachmentType: attachment?.type ?? null,
      attachmentSize: attachment?.size ?? null,
      attachmentDurationMs: null,
    },
  );
  if (errorCode || !data) fail(errorCode, errorMessage);
  return data;
}

export async function claimThread(threadId: string) {
  const { data, errorCode, errorMessage } = await callFunction<{ threadId: string; assignedTo: string }>(
    'support-desk', { action: 'claim', threadId },
  );
  if (errorCode || !data) fail(errorCode, errorMessage);
  return data;
}

export async function transferThread(threadId: string, to: string, note: string | null) {
  const { data, errorCode, errorMessage } = await callFunction<{ threadId: string; assignedTo: string }>(
    'support-desk', { action: 'transfer', threadId, to, note: note?.trim() || null },
  );
  if (errorCode || !data) fail(errorCode, errorMessage);
  return data;
}

export async function closeThread(threadId: string, resolved = true) {
  const { data, errorCode, errorMessage } = await callFunction<{ threadId: string; status: string }>(
    'support-desk', { action: 'close', threadId, resolved },
  );
  if (errorCode || !data) fail(errorCode, errorMessage);
  return data;
}

/**
 * An operator's own picture for a conversation, under their own id in the
 * private bucket (the bucket's policy), so the person can be sent a link.
 */
export async function uploadSupportFile(file: File, operatorId: string): Promise<OutgoingAttachment> {
  const extension = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const path = `${operatorId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await db().storage.from(SUPPORT_BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  });
  if (error) throw new ManageError('admin.errors.upload', error.message);
  return { path, type: file.type || 'application/octet-stream', size: file.size };
}

/** A short-lived link to a private file, for drawing it. */
export async function signedUrl(bucket: string, path: string, seconds = 3600): Promise<string | null> {
  const { data } = await db().storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------------------
// Ideas and reports from the app
// ---------------------------------------------------------------------------

export function useIdeasDesk(kind: IdeaKind, status: PlatformRequestStatus | 'open' | 'all') {
  return useQuery({
    queryKey: supportKeys.ideasDesk(kind, status),
    staleTime: 30_000,
    queryFn: async (): Promise<AdminPlatformRequest[]> => {
      const { data, error } = await db().rpc('admin_platform_requests', { p_kind: kind, p_status: status });
      if (error) fail(error.code, error.message);
      return (data ?? []) as AdminPlatformRequest[];
    },
  });
}

export function useIdeaCounts(enabled = true) {
  return useQuery({
    queryKey: supportKeys.ideasCounts,
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<RequestCounts> => {
      const { data, error } = await db().rpc('admin_request_counts');
      if (error) fail(error.code, error.message);
      return data as RequestCounts;
    },
  });
}

export async function decideIdea(input: {
  id: string;
  status: PlatformRequestStatus;
  targetDate: string | null;
  note: string | null;
}) {
  const { data, errorCode, errorMessage } = await callFunction<{ id: string; status: string }>(
    'support-desk',
    {
      action: 'decide',
      id: input.id,
      status: input.status,
      targetDate: input.targetDate,
      note: input.note?.trim() || null,
    },
  );
  if (errorCode || !data) fail(errorCode, errorMessage);
  return data;
}

export const REQUEST_STATUS_TONE: Record<PlatformRequestStatus, BadgeTone> = {
  new: 'neutral',
  reviewing: 'primary',
  planned: 'primary',
  in_progress: 'warning',
  done: 'success',
  declined: 'danger',
};

// ---------------------------------------------------------------------------
// Reported messages (V033)
// ---------------------------------------------------------------------------

/** Open reports in every building's room. */
export function useChatReports(enabled = true) {
  return useQuery({
    queryKey: supportKeys.reports,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ChatReport[]> => {
      const { data, error } = await db().rpc('chat_reports_open');
      if (error) fail(error.code, error.message);
      return (data ?? []) as ChatReport[];
    },
  });
}

/**
 * Remove the message, or keep it. A removed photo or voice note leaves
 * storage too: this is the one moment its path is known.
 */
export async function resolveReport(reportId: string, action: 'remove' | 'keep'): Promise<void> {
  const { data, error } = await db().rpc('resolve_chat_report', { p_report_id: reportId, p_action: action });
  if (error) fail(error.code, error.message);
  const path = (data as { attachment_path?: string | null } | null)?.attachment_path;
  if (path) void db().storage.from(CHAT_BUCKET).remove([path]).then(() => undefined, () => undefined);
}
