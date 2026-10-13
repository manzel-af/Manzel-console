'use client';

/**
 * Create a building directly and get its first manager's code (the app's
 * admin/building-new.tsx). For buildings onboarded in person, where a request
 * would be a formality: the building, its security policy, and a single-use
 * 7-day manager invite, from one server function (onboard_building).
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { InviteCode } from '@/components/invite-code';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { Field } from '@/components/ui/form';
import { Card, PageHeader } from '@/components/ui/surfaces';
import { onboardBuilding, refreshAdmin } from '@/lib/api/admin';
import { useErrorText } from '@/lib/errors';
import { useHref, useI18n, useT } from '@/lib/i18n/client';
import { isolate } from '@/lib/text';

import { BuildingFields, buildingValid, type BuildingValues } from '../building-form';

export function NewBuildingScreen() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const { language } = useI18n();
  const queryClient = useQueryClient();
  const errorText = useErrorText();

  const [values, setValues] = useState<BuildingValues>({
    name: '', code: '', city: language === 'en' ? 'Kabul' : 'کابل', address: '', billingDay: '1', dueDays: '10',
  });
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ buildingCode: string; inviteCode: string; expiresAt: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await onboardBuilding({
        ...values,
        billingDay: Number.parseInt(values.billingDay, 10),
        dueDays: Number.parseInt(values.dueDays, 10),
        managerName,
        managerPhone,
      });
      setCreated(result);
      await refreshAdmin(queryClient);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t('manage.admin.created')} subtitle={`${values.name} · ${isolate(created.buildingCode)}`} />
        <Card className="flex flex-col gap-2">
          <h2 className="text-center font-bold text-fg">{t('manage.admin.managerInviteCreated')}</h2>
          <InviteCode code={created.inviteCode} expiresAt={created.expiresAt} body={t('manage.admin.managerInviteBody')}
            onDone={() => router.push(href('/buildings'))} />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('manage.admin.newBuilding')} back={href('/buildings')} backLabel={t('admin.buildings.title')} />
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (buildingValid(values) && !busy) void submit();
        }}
      >
        <Card>
          <BuildingFields values={values} onChange={setValues}>
            <Field label={t('manage.admin.managerName')} optionalLabel={t('common.optional')} icon="users" maxLength={80}
              value={managerName} onChange={(event) => setManagerName(event.target.value)} />
            <Field label={t('manage.admin.managerPhone')} optionalLabel={t('common.optional')} icon="phone" maxLength={20}
              type="tel" dir="ltr" value={managerPhone} onChange={(event) => setManagerPhone(event.target.value)} />
          </BuildingFields>
        </Card>
        {error ? <Callout tone="danger" title={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" label={t('common.cancel')} onClick={() => router.push(href('/buildings'))} />
          <Button type="submit" icon="check" label={t('manage.admin.newBuilding')} loading={busy} disabled={!buildingValid(values)} />
        </div>
      </form>
    </div>
  );
}
