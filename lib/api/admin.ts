'use client';

/**
 * The operator console's data: the app's features/admin/api.ts (V022–V036)
 * and the operator half of features/building/api.ts, in the same words, so
 * a screen reads the same here as there.
 *
 * Everything is checked again on the server: every admin_* function starts
 * with admin_require(), the banner and settings tables write only for
 * operators (RLS), the logo bucket takes uploads only from operators, and the
 * account actions run in the admin-users edge function behind the caller's
 * own session.
 */

import { keepPreviousData, useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query';

import {
  buttonsOf, questionOf, translationsOf,
  type ContentButton, type ContentQuestion, type TextDraft,
} from '@/lib/content';
import { ManageError, errorKey, fail } from '@/lib/errors';
import { callFunction, getSupabase } from '@/lib/supabase/client';
import type {
  AccountStatusRow, AdminAuditEntry, AdminBuilding, AdminBuildingDetail, AdminBuildingRequest,
  AdminPlatformAnswers, AdminPlatformStats, AdminPushCampaign, AdminPushCampaignDetail, AdminPushPreview,
  AdminUser, AdminUserDetail, AppTarget, BuildingRequestStatus, NotificationScreen, PlatformAnnouncementRow,
  PlatformAudience, PlatformSettingsRow, PlatformTone, PushAudience, PushImportance, ReviewAccess,
} from '@/lib/supabase/database.types';

const db = () => getSupabase();

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  building: (id: string) => ['admin', 'building', id] as const,
  users: (search: string, filters?: UserFilters) => ['admin', 'users', search, filters ?? {}] as const,
  user: (id: string) => ['admin', 'user', id] as const,
  audit: (buildingId: string | null, filters?: AuditFilters) =>
    ['admin', 'audit', buildingId ?? 'all', filters ?? {}] as const,
  banners: ['admin', 'banners'] as const,
  push: ['admin', 'push'] as const,
  pushCampaign: (id: string) => ['admin', 'push', id] as const,
  pushPreview: (audience: PushAudience | null) => ['admin', 'push', 'preview', audience] as const,
  answers: (of: AnswersOf) => ('announcementId' in of
    ? ['admin', 'answers', 'banner', of.announcementId] as const
    : ['admin', 'answers', 'push', of.campaignId] as const),
  settings: ['platform', 'settings'] as const,
};

/** After any operator write: every admin list and number, fetched again. */
export function refreshAdmin(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-buildings'] }),
    queryClient.invalidateQueries({ queryKey: ['platform'] }),
  ]);
}

// ---------------------------------------------------------------------------
// Overview and settings
// ---------------------------------------------------------------------------

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    refetchInterval: 60_000,
    queryFn: async (): Promise<AdminPlatformStats> => {
      const { data, error } = await db().rpc('admin_platform_stats');
      if (error || !data) fail(error);
      return data;
    },
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: adminKeys.settings,
    staleTime: 60_000,
    queryFn: async (): Promise<PlatformSettingsRow | null> => {
      const { data, error } = await db().from('platform_settings').select('*').eq('id', true).maybeSingle();
      if (error) fail(error);
      return (data as PlatformSettingsRow | null) ?? null;
    },
  });
}

export async function saveSettings(input: Omit<PlatformSettingsRow, 'id' | 'updated_at' | 'updated_by'>, profileId: string) {
  const { error } = await db()
    .from('platform_settings')
    .update({ ...input, updated_by: profileId })
    .eq('id', true);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Building requests and buildings
// ---------------------------------------------------------------------------

export function useAdminRequests(status: BuildingRequestStatus | 'all') {
  return useQuery({
    queryKey: ['admin-requests', status],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminBuildingRequest[]> => {
      const { data, error } = await db().rpc('admin_building_requests', { p_status: status });
      if (error) fail(error);
      return (data ?? []) as AdminBuildingRequest[];
    },
  });
}

export async function reviewBuildingRequest(args: {
  requestId: string;
  approve: boolean;
  note?: string;
  code?: string;
  billingDay?: number;
  dueDays?: number;
}): Promise<{ status: BuildingRequestStatus; buildingCode?: string }> {
  const { data, error } = await db().rpc('review_building_request', {
    p_request_id: args.requestId,
    p_approve: args.approve,
    p_note: args.note?.trim() || null,
    p_code: args.code?.trim().toUpperCase() || null,
    p_billing_day: args.billingDay ?? 1,
    p_due_days: args.dueDays ?? 10,
  });
  if (error) fail(error);
  // A complex (V031) answers with its own code.
  return { status: data?.status ?? 'pending', buildingCode: data?.building_code ?? data?.complex_code };
}

export function useAdminBuildings() {
  return useQuery({
    queryKey: ['admin-buildings'],
    queryFn: async (): Promise<AdminBuilding[]> => {
      const { data, error } = await db().rpc('admin_buildings');
      if (error) fail(error);
      return (data ?? []) as AdminBuilding[];
    },
  });
}

export function useAdminBuildingDetail(buildingId: string) {
  return useQuery({
    queryKey: adminKeys.building(buildingId),
    enabled: Boolean(buildingId),
    queryFn: async (): Promise<AdminBuildingDetail> => {
      const { data, error } = await db().rpc('admin_building_detail', { p_building_id: buildingId });
      if (error || !data) fail(error);
      return data;
    },
  });
}

export async function onboardBuilding(args: {
  name: string;
  code: string;
  city: string;
  address: string;
  billingDay: number;
  dueDays: number;
  managerName: string;
  managerPhone: string;
}): Promise<{ buildingCode: string; inviteCode: string; expiresAt: string }> {
  const { data, error } = await db().rpc('onboard_building', {
    p_name: args.name.trim(),
    p_code: args.code.trim().toUpperCase(),
    p_city: args.city.trim() || 'Kabul',
    p_billing_day: args.billingDay,
    p_due_days: args.dueDays,
    p_address: args.address.trim() || null,
    p_manager_name: args.managerName.trim() || null,
    p_manager_phone: args.managerPhone.trim() || null,
  });
  if (error || !data) fail(error);
  return { buildingCode: data.building_code, inviteCode: data.manager_invite_code, expiresAt: data.invite_expires_at };
}

export async function issueManagerInvite(buildingCode: string): Promise<{ inviteCode: string; expiresAt: string }> {
  const { data, error } = await db().rpc('issue_invite', { p_building_code: buildingCode, p_role: 'manager' });
  if (error || !data) fail(error);
  return { inviteCode: data.invite_code, expiresAt: data.expires_at };
}

/** Building codes are typed by hand and printed on receipts: A–Z and 0–9 only. */
export function normaliseBuildingCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function isValidBuildingCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{1,7}$/.test(code);
}

export async function updateBuilding(input: {
  buildingId: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  billingDay: number;
  dueDays: number;
}) {
  const { error } = await db().rpc('admin_update_building', {
    p_building_id: input.buildingId,
    p_name: input.name.trim(),
    p_code: input.code.trim().toUpperCase(),
    p_city: input.city.trim(),
    p_address: input.address?.trim() || null,
    p_billing_day: input.billingDay,
    p_due_days: input.dueDays,
  });
  if (error) fail(error);
}

/** Closing a building needs a reason (V025); reopening needs none. */
export async function setBuildingActive(buildingId: string, active: boolean, reason?: string | null) {
  const { error } = await db().rpc('admin_set_building_active', {
    p_building_id: buildingId, p_active: active, p_reason: reason?.trim() || null,
  });
  if (error) fail(error);
}

export async function deleteBuilding(buildingId: string) {
  const { error } = await db().rpc('admin_delete_building', { p_building_id: buildingId });
  if (error) fail(error);
}

/** A super_admin membership for the operator: the manager app, for that building. */
export async function enterBuilding(buildingId: string): Promise<string> {
  const { data, error } = await db().rpc('admin_enter_building', { p_building_id: buildingId });
  if (error || !data) fail(error);
  return data.membership_id;
}

export async function revokeInvite(inviteId: string) {
  const { error } = await db().rpc('admin_revoke_invite', { p_invite_id: inviteId });
  if (error) fail(error);
}

export async function endMembershipAsOperator(membershipId: string) {
  const { error } = await db().rpc('admin_end_membership', { p_membership_id: membershipId });
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface UserFilters {
  presence?: 'online' | 'offline' | 'never' | null;
  /** ISO moments. "Before" includes people never seen. */
  seenAfter?: string | null;
  seenBefore?: string | null;
  order?: 'joined' | 'seen';
}

export function useAdminUsers(search: string, filters: UserFilters = {}, limit = 200) {
  const watchingPresence = Boolean(filters.presence || filters.seenAfter || filters.order === 'seen');
  return useQuery({
    queryKey: [...adminKeys.users(search, filters), limit],
    placeholderData: keepPreviousData,
    refetchInterval: watchingPresence ? 30_000 : 120_000,
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await db().rpc('admin_users', {
        p_search: search.trim() || null,
        p_limit: limit,
        p_offset: 0,
        p_presence: filters.presence ?? null,
        p_seen_after: filters.seenAfter ?? null,
        p_seen_before: filters.seenBefore ?? null,
        p_order: filters.order ?? 'joined',
      });
      if (error) fail(error);
      return data ?? [];
    },
  });
}

export function useAdminUserDetail(profileId: string) {
  return useQuery({
    queryKey: adminKeys.user(profileId),
    enabled: Boolean(profileId),
    queryFn: async (): Promise<AdminUserDetail> => {
      const { data, error } = await db().rpc('admin_user_detail', { p_profile_id: profileId });
      if (error || !data) fail(error);
      return data;
    },
  });
}

export async function updateUser(profileId: string, fullName: string, phone: string | null) {
  const { error } = await db().rpc('admin_update_user', {
    p_profile_id: profileId,
    p_full_name: fullName.trim(),
    p_phone: phone,
  });
  if (error) fail(error);
}

export async function setOperator(profileId: string, grant: boolean) {
  const { error } = await db().rpc('admin_set_platform_admin', { p_profile_id: profileId, p_grant: grant });
  if (error) fail(error);
}

export function useAccountStatusOf(profileId: string) {
  return useQuery({
    queryKey: ['admin', 'account-status', profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<AccountStatusRow | null> => {
      const { data, error } = await db()
        .from('account_status').select('*').eq('profile_id', profileId).maybeSingle();
      if (error) fail(error);
      return (data as AccountStatusRow | null) ?? null;
    },
  });
}

/**
 * Suspend, unsuspend or delete an account: the admin-users edge function.
 * Suspending needs a reason — the person reads it on their locked screen.
 */
export async function accountAction(
  profileId: string,
  action: 'suspend' | 'unsuspend' | 'delete',
  reason?: string,
) {
  const { errorCode, errorMessage } = await callFunction<{ ok: boolean }>('admin-users', {
    action, profileId, ...(reason ? { reason: reason.trim() } : {}),
  });
  if (!errorCode) return;
  const key = errorCode === 'conflict' ? 'admin.errors.hasHistory'
    : /why the account/i.test(errorMessage ?? '') ? 'admin.user.reasonRequired'
      : /own account/i.test(errorMessage ?? '') ? 'admin.errors.self'
        : /operator role/i.test(errorMessage ?? '') ? 'admin.errors.isOperator'
          : errorCode === 'forbidden' ? 'manage.errors.forbidden'
            : errorCode === 'not_found' ? 'admin.errors.notFound'
              : 'errors.generic';
  throw new ManageError(key, errorMessage ?? undefined);
}

/** V037: whether a person has an authenticator — the console's second step. */
export function useMfaStatus(profileId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'mfa', profileId] as const,
    enabled: enabled && Boolean(profileId),
    queryFn: async (): Promise<{ verified: number; unverified: number }> => {
      const { data, error } = await db().rpc('admin_mfa_status', { p_profile_id: profileId });
      if (error || !data) fail(error);
      return data;
    },
  });
}

/**
 * V037: removes another operator's authenticators (admin-users reset_mfa),
 * when they lost the phone that had one. They set up a new one at their next
 * sign-in. Never one's own.
 */
export async function resetMfa(profileId: string): Promise<number> {
  const { data, errorCode, errorMessage } = await callFunction<{ removed: number }>('admin-users', {
    action: 'reset_mfa', profileId,
  });
  if (!errorCode) return data?.removed ?? 0;
  const key = /own account/i.test(errorMessage ?? '') ? 'admin.errors.self'
    : errorCode === 'forbidden' ? 'manage.errors.forbidden'
      : errorCode === 'not_found' ? 'admin.errors.notFound'
        : 'errors.generic';
  throw new ManageError(key, errorMessage ?? undefined);
}

// ---------------------------------------------------------------------------
// The audit log
// ---------------------------------------------------------------------------

const AUDIT_PAGE = 50;

export interface AuditFilters {
  search?: string;
  from?: string | null;
  to?: string | null;
  areas?: string[];
}

export function useAdminAudit(buildingId: string | null, filters: AuditFilters = {}) {
  return useInfiniteQuery({
    queryKey: adminKeys.audit(buildingId, filters),
    initialPageParam: null as number | null,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }): Promise<AdminAuditEntry[]> => {
      const { data, error } = await db().rpc('admin_audit_log', {
        p_building_id: buildingId,
        p_before: pageParam,
        p_limit: AUDIT_PAGE,
        p_search: filters.search?.trim() || null,
        p_from: filters.from ?? null,
        p_to: filters.to ?? null,
        p_areas: filters.areas && filters.areas.length > 0 ? filters.areas : null,
      });
      if (error) fail(error);
      return data ?? [];
    },
    getNextPageParam: (last) => (last.length === AUDIT_PAGE ? last[last.length - 1].id : undefined),
  });
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export function useAdminBanners(enabled = true) {
  return useQuery({
    queryKey: adminKeys.banners,
    enabled,
    queryFn: async (): Promise<PlatformAnnouncementRow[]> => {
      const { data, error } = await db()
        .from('platform_announcements')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []) as PlatformAnnouncementRow[];
    },
  });
}

export type BannerStatus = 'live' | 'scheduled' | 'ended' | 'off';

export function bannerStatus(banner: PlatformAnnouncementRow, now: number): BannerStatus {
  if (!banner.active) return 'off';
  if (Date.parse(banner.starts_at) > now) return 'scheduled';
  if (banner.ends_at && Date.parse(banner.ends_at) <= now) return 'ended';
  return 'live';
}

export interface BannerInput {
  texts: TextDraft;
  buttons: ContentButton[];
  question: ContentQuestion | null;
  tone: PlatformTone;
  color: string | null;
  icon: string | null;
  imageUrl: string | null;
  audience: PlatformAudience;
  buildingId: string | null;
  startsAt: string;
  endsAt: string | null;
  dismissible: boolean;
  active: boolean;
  priority: number;
  /** V037: which apps see it; null for every one. */
  apps: AppTarget | null;
}

/**
 * Every language, the buttons and the question (V036) — and the columns an
 * app from before V036 reads as well: the title and text in Dari, and the
 * first button as the one link. The table's trigger fills those the same way.
 */
export async function saveBanner(id: string | null, input: BannerInput): Promise<string | null> {
  const translations = translationsOf(input.texts);
  const buttons = buttonsOf(input.buttons);
  const dari = translations['fa-AF'];
  const first = buttons[0];
  const row = {
    title: dari?.title ?? '',
    body: dari?.body || null,
    link_url: first?.url ?? null,
    link_label: first ? first.label['fa-AF'] : null,
    translations,
    buttons,
    question: questionOf(input.question),
    tone: input.tone,
    color: input.color,
    icon: input.icon,
    image_url: input.imageUrl,
    audience: input.audience,
    building_id: input.buildingId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    dismissible: input.dismissible,
    active: input.active,
    priority: input.priority,
    apps: input.apps,
  };
  if (id) {
    const { error } = await db().from('platform_announcements').update(row).eq('id', id);
    if (error) fail(error);
    return id;
  }
  const { data, error } = await db().from('platform_announcements').insert(row).select('id').single();
  if (error) fail(error);
  return (data as { id: string } | null)?.id ?? null;
}

/** Soft: the row stays, so the change still reaches phones through Realtime. */
export async function deleteBanner(id: string): Promise<void> {
  const { error } = await db()
    .from('platform_announcements')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', id);
  if (error) fail(error);
}

const IMAGE_TYPES = /^image\/(png|jpeg|webp)$/;

/** Uploads a picked image to the public platform bucket and returns its URL. */
export async function uploadPlatformImage(file: File, folder: 'banners' | 'push' = 'banners'): Promise<string> {
  const type = IMAGE_TYPES.test(file.type) ? file.type : 'image/jpeg';
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await db().storage.from('platform-assets').upload(path, file, { contentType: type, upsert: false });
  if (error) throw new ManageError('admin.errors.upload', error.message);
  return db().storage.from('platform-assets').getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Notifications (V023): push and the in-app inbox
// ---------------------------------------------------------------------------

export function usePushPreview(audience: PushAudience | null) {
  return useQuery({
    queryKey: adminKeys.pushPreview(audience),
    enabled: Boolean(audience),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminPushPreview> => {
      const { data, error } = await db().rpc('admin_push_preview', { p_audience: audience! });
      if (error || !data) fail(error);
      return data;
    },
  });
}

export function usePushCampaigns() {
  return useQuery({
    queryKey: adminKeys.push,
    queryFn: async (): Promise<AdminPushCampaign[]> => {
      const { data, error } = await db().rpc('admin_push_campaigns', { p_limit: 100 });
      if (error) fail(error);
      return data ?? [];
    },
  });
}

export function usePushCampaign(campaignId: string) {
  return useQuery({
    queryKey: adminKeys.pushCampaign(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async (): Promise<AdminPushCampaignDetail> => {
      const { data, error } = await db().rpc('admin_push_campaign', { p_campaign_id: campaignId });
      if (error || !data) fail(error);
      return data;
    },
  });
}

export interface PushMessageInput {
  texts: TextDraft;
  buttons: ContentButton[];
  question: ContentQuestion | null;
  imageUrl: string | null;
  screen: NotificationScreen | null;
  importance: PushImportance;
}

function pushErrorKey(code: string | null, message: string | null): string {
  if (code === 'rate_limited') return 'admin.push.errors.rateLimited';
  if (code === 'forbidden') return 'manage.errors.forbidden';
  if (code === 'bad_request' && /Nobody/i.test(message ?? '')) return 'admin.push.errors.empty';
  if (code === 'bad_request' && /too many/i.test(message ?? '')) return 'admin.push.errors.tooMany';
  if (code === 'bad_request') return 'manage.errors.invalid';
  if (code === 'server_error' && /fetch|network/i.test(message ?? '')) return 'errors.network';
  return 'errors.generic';
}

/**
 * Sends through the admin-push edge function. `clientId` makes it safe to
 * retry: the same id is the same campaign.
 */
export async function sendPush(input: {
  clientId: string;
  audience: PushAudience;
  message: PushMessageInput;
  test?: boolean;
}): Promise<{ campaignId: string; recipients: number }> {
  const translations = translationsOf(input.message.texts);
  const dari = translations['fa-AF'];
  const { data, errorCode, errorMessage } = await callFunction<{ campaignId: string; recipients: number }>('admin-push', {
    action: 'send',
    clientId: input.clientId,
    audience: input.audience,
    test: input.test === true,
    message: {
      title: dari?.title ?? '',
      body: dari?.body ?? '',
      imageUrl: input.message.imageUrl,
      screen: input.message.screen,
      importance: input.message.importance,
      translations,
      buttons: buttonsOf(input.message.buttons),
      question: questionOf(input.message.question),
    },
  });
  if (errorCode || !data) throw new ManageError(pushErrorKey(errorCode, errorMessage), errorMessage ?? undefined);
  return data;
}

export async function checkPushReceipts(campaignId: string) {
  const { data, errorCode, errorMessage } = await callFunction<{
    checked: number; delivered: number; failed: number; waiting: number;
  }>('admin-push', { action: 'receipts', campaignId });
  if (errorCode || !data) throw new ManageError(pushErrorKey(errorCode, errorMessage), errorMessage ?? undefined);
  return data;
}

export async function deletePushCampaign(campaignId: string) {
  const { error } = await db().rpc('admin_delete_push_campaign', { p_campaign_id: campaignId });
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Answers to a banner's or a notification's question (V036)
// ---------------------------------------------------------------------------

export type AnswersOf = { announcementId: string } | { campaignId: string };

export function useAdminAnswers(of: AnswersOf | null) {
  return useQuery({
    queryKey: of ? adminKeys.answers(of) : ['admin', 'answers', 'none'],
    enabled: Boolean(of),
    refetchInterval: 30_000,
    queryFn: async (): Promise<AdminPlatformAnswers> => {
      const { data, error } = await db().rpc('admin_platform_answers', {
        p_announcement_id: of && 'announcementId' in of ? of.announcementId : null,
        p_campaign_id: of && 'campaignId' in of ? of.campaignId : null,
      });
      if (error || !data) fail(error);
      return data;
    },
  });
}

export function useAnswerCount(of: AnswersOf | null) {
  return useQuery({
    queryKey: [...(of ? adminKeys.answers(of) : ['admin', 'answers', 'none']), 'count'],
    enabled: Boolean(of),
    queryFn: async (): Promise<number> => {
      if (!of) return 0;
      const rows = db().from('platform_answers').select('id', { count: 'exact', head: true });
      const { count, error } = await ('announcementId' in of
        ? rows.eq('announcement_id', of.announcementId)
        : rows.eq('campaign_id', of.campaignId));
      if (error) fail(error);
      return count ?? 0;
    },
  });
}

// ---------------------------------------------------------------------------
// The store reviewers' sign-in (V033)
// ---------------------------------------------------------------------------

export const reviewAccessKey = ['admin', 'review-access'] as const;

export function useReviewAccess() {
  return useQuery({
    queryKey: reviewAccessKey,
    queryFn: async (): Promise<ReviewAccess> => {
      const { data, error } = await db().rpc('admin_review_access');
      if (error || !data) fail(error);
      return data;
    },
  });
}

export async function setReviewAccess(enabled: boolean, newCode = false): Promise<ReviewAccess & { code: string | null }> {
  const { data, error } = await db().rpc('admin_set_review_access', { p_enabled: enabled, p_new_code: newCode });
  if (error || !data) fail(error);
  return data;
}

export async function createReviewAccount(): Promise<string> {
  const { data, errorCode, errorMessage } = await callFunction<{ profileId: string }>('admin-users', {
    action: 'review_account',
  });
  if (errorCode || !data?.profileId) {
    throw new ManageError(errorKey(errorMessage ?? undefined, errorCode ?? undefined), errorMessage ?? undefined);
  }
  return data.profileId;
}

export async function addReviewPlace(buildingId: string, role: 'manager' | 'resident'): Promise<void> {
  const { error } = await db().rpc('admin_review_add_place', { p_building_id: buildingId, p_role: role });
  if (error) fail(error);
}

export async function removeReviewPlace(membershipId: string): Promise<void> {
  const { error } = await db().rpc('admin_review_remove_place', { p_membership_id: membershipId });
  if (error) fail(error);
}
