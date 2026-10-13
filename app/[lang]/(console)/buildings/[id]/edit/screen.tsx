'use client';

/**
 * A building's details (the app's admin/building-edit.tsx). Managers edit
 * most of these themselves; the operator can edit all of them, including the
 * code while no invoice or receipt carries it yet.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Card, PageHeader } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import { refreshAdmin, updateBuilding, useAdminBuildingDetail } from '@/lib/api/admin';
import { useErrorText } from '@/lib/errors';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminBuildingDetail } from '@/lib/supabase/database.types';

import { BuildingFields, buildingValid, type BuildingValues } from '../../building-form';

export function EditBuildingScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const detail = useAdminBuildingDetail(id);
  if (!detail.data) return <PageSkeleton rows={3} />;
  return <EditForm detail={detail.data} />;
}

function EditForm({ detail }: { detail: AdminBuildingDetail }) {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const building = detail.building;
  const codeLocked = detail.invoices > 0 || detail.payments > 0;
  const back = href(`/buildings/${building.id}`);

  const [values, setValues] = useState<BuildingValues>({
    name: building.name,
    code: building.code,
    city: building.city,
    address: building.address ?? '',
    billingDay: String(building.billing_day),
    dueDays: String(building.due_days),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateBuilding({
        buildingId: building.id,
        name: values.name,
        code: values.code,
        city: values.city,
        address: values.address,
        billingDay: Number.parseInt(values.billingDay, 10),
        dueDays: Number.parseInt(values.dueDays, 10),
      });
      await refreshAdmin(queryClient);
      toast.show(t('admin.saved'));
      router.push(back);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('admin.building.edit')} subtitle={building.name} back={back} backLabel={building.name} />
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (buildingValid(values) && !busy) void save();
        }}
      >
        <Card>
          <BuildingFields values={values} onChange={setValues} codeLocked={codeLocked}
            codeHint={codeLocked ? t('admin.errors.codeInUse') : t('admin.building.codeHint')} />
        </Card>
        {error ? <Callout tone="danger" title={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" label={t('common.cancel')} onClick={() => router.push(back)} />
          <Button type="submit" icon="check" label={t('common.save')} loading={busy} disabled={!buildingValid(values)} />
        </div>
      </form>
    </div>
  );
}
