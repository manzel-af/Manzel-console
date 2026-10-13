'use client';

/**
 * The platform fee, the operator's side (V025, the app's features/billing).
 *
 * Every building pays the platform a flat monthly fee, and its flats share
 * it. A fee left unpaid past its due date closes the building until an
 * operator records the money here — and the building opens again by itself
 * the moment nothing is overdue.
 */

import { useQuery, type QueryClient } from '@tanstack/react-query';

import { fail } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import type {
  AdminBuildingBilling, BillingRunResult, PlatformFeeMethod, PlatformInvoiceRow,
} from '@/lib/supabase/database.types';

export type AdminBillingFilter = 'all' | 'unpaid' | 'paid' | 'overdue';

export const billingKeys = {
  admin: (status: AdminBillingFilter) => ['admin', 'billing', status] as const,
  history: (buildingId: string) => ['billing', 'history', buildingId] as const,
};

const db = () => getSupabase();

export function refreshBilling(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] }),
    queryClient.invalidateQueries({ queryKey: ['billing'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-buildings'] }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
  ]);
}

export function useAdminBilling(status: AdminBillingFilter = 'all') {
  return useQuery({
    queryKey: billingKeys.admin(status),
    staleTime: 30_000,
    queryFn: async (): Promise<AdminBuildingBilling[]> => {
      const { data, error } = await db().rpc('admin_platform_billing', { p_status: status });
      if (error) fail(error);
      return (data ?? []) as AdminBuildingBilling[];
    },
  });
}

/** The fee month by month, for one building. */
export function useBuildingFeeHistory(buildingId: string, limit = 24) {
  return useQuery({
    queryKey: billingKeys.history(buildingId),
    enabled: Boolean(buildingId),
    staleTime: 60_000,
    queryFn: async (): Promise<PlatformInvoiceRow[]> => {
      const { data, error } = await db().rpc('building_fee_history', { p_building_id: buildingId, p_limit: limit });
      if (error) fail(error);
      return (data ?? []) as PlatformInvoiceRow[];
    },
  });
}

/** The money arrived. A building closed for the fee opens again by itself. */
export async function markFeePaid(invoiceId: string, method: PlatformFeeMethod, note: string | null) {
  const { data, error } = await db().rpc('admin_mark_fee_paid', {
    p_invoice_id: invoiceId, p_method: method, p_note: note?.trim() || null,
  });
  if (error) fail(error);
  return data as { id: string; building_id: string; reopened: boolean };
}

/** Undoes a paid or waived mark; a fee already past due closes the building again. */
export async function unmarkFeePaid(invoiceId: string, reason: string) {
  const { data, error } = await db().rpc('admin_unmark_fee_paid', { p_invoice_id: invoiceId, p_reason: reason.trim() });
  if (error) fail(error);
  return data as { id: string; building_id: string; was: string; closed: boolean };
}

/** Forgiven rather than paid — a free month, a mistake, a building being set up. */
export async function waiveFee(invoiceId: string, note: string | null) {
  const { data, error } = await db().rpc('admin_waive_fee', { p_invoice_id: invoiceId, p_note: note?.trim() || null });
  if (error) fail(error);
  return data as { id: string; building_id: string };
}

/** Issue this month now, instead of waiting for tonight's run. Safe to run twice. */
export async function runBilling(): Promise<BillingRunResult> {
  const { data, error } = await db().rpc('admin_billing_run');
  if (error) fail(error);
  return data as BillingRunResult;
}
