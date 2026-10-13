'use client';

/**
 * Review one building request (the app's admin/request.tsx).
 *
 * Everything an operator needs to tell a real building from a fake one: the
 * requester's verified phone, how long the account has existed, how many
 * requests they have made and buildings they already run, and any building,
 * complex or request with the same code or a similar name. Approving creates
 * the building and makes the requester its manager in one step; rejecting
 * needs a reason, which the requester sees.
 *
 * A complex (V031) is reviewed the same way, as one: approving creates the
 * complex with the requester as its office's manager.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState } from '@/components/ui/feedback';
import { Field, TextArea } from '@/components/ui/form';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Card, DetailGrid, DetailItem, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  isValidBuildingCode, normaliseBuildingCode, refreshAdmin, reviewBuildingRequest, useAdminRequests,
} from '@/lib/api/admin';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminBuildingRequest } from '@/lib/supabase/database.types';
import { CODE_MAX, CODE_MIN, dotted, isolate, isValidComplexCode, normaliseComplexCode, telHref } from '@/lib/text';

import { REQUEST_STATUS_TONE } from '../screen';

export function RequestScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const href = useHref();
  const { data, isPending } = useAdminRequests('all');
  const request = data?.find((candidate) => candidate.id === id);

  if (isPending) return <PageSkeleton rows={4} />;
  if (!request) {
    return (
      <div>
        <PageHeader title={t('manage.admin.requests')} back={href('/requests')} backLabel={t('admin.requests.title')} />
        <EmptyState icon="alert" title={t('manage.errors.notOpen')} />
      </div>
    );
  }
  return <Review request={request} />;
}

function Review({ request }: { request: AdminBuildingRequest }) {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fmt = useFormat();
  const errorText = useErrorText();

  const [code, setCode] = useState(request.building_code);
  const [billingDay, setBillingDay] = useState('1');
  const [dueDays, setDueDays] = useState('10');
  const [reason, setReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = request.status === 'pending';
  const isComplex = request.kind === 'complex';
  const codeMax = isComplex ? 6 : CODE_MAX;
  const codeValid = isComplex ? isValidComplexCode(code) : isValidBuildingCode(code);
  const billing = Number.parseInt(billingDay || '0', 10);
  const due = Number.parseInt(dueDays || '-1', 10);
  const approveValid = codeValid && billing >= 1 && billing <= 28 && due >= 0 && due <= 90;
  const similarComplexes = request.similar_complexes ?? [];

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await reviewBuildingRequest({
        requestId: request.id,
        approve,
        note: approve ? undefined : reason,
        code: approve ? code : undefined,
        billingDay: billing,
        dueDays: due,
      });
      toast.show(approve
        ? isComplex
          ? t('complex.admin.approved', { code: isolate(result.buildingCode ?? code) })
          : t('manage.admin.approved', { code: isolate(result.buildingCode ?? code) })
        : t('manage.admin.rejected'));
      await refreshAdmin(queryClient);
      router.push(href('/requests'));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
      setApproving(false);
      setRejecting(false);
    }
  };

  const roleLabel = t(`manage.register.roles.${request.requester_role}`);

  return (
    <div>
      <PageHeader
        back={href('/requests')}
        backLabel={t('admin.requests.title')}
        title={request.building_name}
        badge={<Badge tone={REQUEST_STATUS_TONE[request.status]} label={t(`manage.admin.status.${request.status}`)} />}
        subtitle={dotted(isolate(request.building_code), request.city, request.district, request.address)}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          {error ? <Callout tone="danger" title={error} /> : null}

          {/* ---- look-alikes: the duplicate / impostor check ------------------ */}
          {request.similar_buildings.length > 0 ? (
            <Callout tone="warning" title={t('manage.admin.similarTitle')} body={(
              <>
                <p>{t('manage.admin.similarBody')}</p>
                <ul className="mt-1.5 list-disc ps-5">
                  {request.similar_buildings.map((building) => (
                    <li key={building.id}>{building.name} ({isolate(building.code)}, {building.city})</li>
                  ))}
                </ul>
              </>
            )} />
          ) : null}
          {similarComplexes.length > 0 ? (
            <Callout tone="warning" title={t('complex.admin.similarTitle')} body={(
              <ul className="list-disc ps-5">
                {similarComplexes.map((complex) => (
                  <li key={complex.id}>
                    {complex.name} ({isolate(complex.code)}, {complex.city}) — {t('complex.admin.buildingsCount', { n: fmt.number(complex.buildings) })}
                  </li>
                ))}
              </ul>
            )} />
          ) : null}
          {request.similar_requests.length > 0 ? (
            <Callout tone="info" title={t('manage.admin.similarRequests')} body={(
              <ul className="list-disc ps-5">
                {request.similar_requests.map((similar) => (
                  <li key={similar.id}>{similar.name} ({isolate(similar.code)}) — {t(`manage.admin.status.${similar.status}`)}</li>
                ))}
              </ul>
            )} />
          ) : null}

          {/* ---- the building ------------------------------------------------- */}
          <Card className="flex flex-col gap-4">
            {isComplex ? (
              <div className="flex flex-col gap-2">
                <Badge tone="accent" icon="chart" label={t('complex.admin.kind', { n: fmt.number(request.building_count ?? 0) })} className="w-fit" />
                <p className="text-sm text-fg-muted">{t('complex.admin.explain')}</p>
              </div>
            ) : null}
            <DetailGrid>
              <DetailItem label={t('console.list.code')}><bdi dir="ltr" className="font-mono">{request.building_code}</bdi></DetailItem>
              <DetailItem label={t('console.list.city')}>{dotted(request.city, request.district) || '—'}</DetailItem>
              <DetailItem label={t('console.list.flats')}>{t('manage.admin.flatsCount', { n: fmt.number(request.unit_count) })}</DetailItem>
              <DetailItem label={t('console.list.received')}>{fmt.dateTime(request.created_at)}</DetailItem>
              {request.address ? <DetailItem label={t('console.list.address')} className="sm:col-span-2">{request.address}</DetailItem> : null}
            </DetailGrid>
            {request.note ? (
              <blockquote className="rounded-xl border-s-4 border-line-strong bg-surface-sunken px-4 py-3 text-fg-muted">
                {request.note}
              </blockquote>
            ) : null}
          </Card>

          {/* ---- who is asking ------------------------------------------------ */}
          <Section title={t('manage.admin.requester')}>
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-fg">{request.requester_name}</p>
                  <p className="text-sm text-fg-muted">
                    {roleLabel}
                    {' · '}
                    {request.requester_phone
                      ? <bdi dir="ltr">{request.requester_phone}</bdi>
                      : <span className="text-danger">{t('manage.admin.noPhone')}</span>}
                  </p>
                </div>
                {request.requester_phone ? (
                  <ButtonLink href={telHref(request.requester_phone)} size="sm" icon="phone" label={t('manage.admin.call')} />
                ) : null}
                <ButtonLink href={href(`/people/${request.requester_id}`)} size="sm" icon="user" label={t('console.list.details')} />
              </div>
              <DetailGrid>
                <DetailItem label={t('console.list.joined')}>
                  {request.requester_since ? t('manage.admin.since', { date: fmt.date(request.requester_since, 'medium') }) : '—'}
                </DetailItem>
                <DetailItem label={t('manage.admin.requests')} className="sm:col-span-2">
                  {t('manage.admin.history', {
                    requests: fmt.number(request.requester_requests),
                    buildings: fmt.number(request.requester_buildings),
                  })}
                </DetailItem>
              </DetailGrid>
            </Card>
          </Section>

          {!open && request.review_note ? (
            <Callout tone="info" title={t('manage.register.rejectedBody', { reason: request.review_note })} />
          ) : null}
        </div>

        {/* ---- the decision --------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col gap-3">
            <h2 className="font-bold text-fg">{t('console.list.actions')}</h2>
            {open ? (
              <>
                <p className="text-sm text-fg-muted">
                  {isComplex
                    ? t('complex.admin.approveBody', { person: request.requester_name })
                    : t('manage.admin.approveBody', { person: request.requester_name })}
                </p>
                <Button label={t('manage.admin.approve')} icon="check" size="lg" full disabled={busy}
                  onClick={() => setApproving(true)} />
                <Button label={t('manage.admin.reject')} icon="close" variant="secondary" size="lg" full disabled={busy}
                  onClick={() => setRejecting(true)} />
              </>
            ) : (
              <p className="text-sm text-fg-muted">{t(`manage.admin.status.${request.status}`)}</p>
            )}
          </Card>
        </aside>
      </div>

      {/* Approve: confirm the code and the billing schedule the building starts with. */}
      <Dialog
        open={approving}
        onClose={() => setApproving(false)}
        dismissible={!busy}
        title={t('manage.admin.approveTitle', { name: request.building_name })}
        description={isComplex
          ? t('complex.admin.approveBody', { person: request.requester_name })
          : t('manage.admin.approveBody', { person: request.requester_name })}
        footer={(
          <>
            <Button label={t('common.cancel')} variant="ghost" onClick={() => setApproving(false)} disabled={busy} />
            <Button label={t('manage.admin.approve')} icon="check" loading={busy} disabled={!approveValid}
              onClick={() => void decide(true)} />
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <Field
            label={t('manage.admin.codeOverride')}
            value={code}
            dir="ltr"
            className="font-mono uppercase"
            maxLength={codeMax}
            onChange={(event) => setCode(isComplex ? normaliseComplexCode(event.target.value) : normaliseBuildingCode(event.target.value))}
            error={code && !codeValid ? t('manage.errors.codeInvalid', { min: fmt.number(CODE_MIN), max: fmt.number(codeMax) }) : null}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('manage.building.billingDay')} inputMode="numeric" dir="ltr" maxLength={2}
              value={billingDay} onChange={(event) => setBillingDay(event.target.value.replace(/\D/g, ''))} />
            <Field label={t('manage.building.dueDays')} inputMode="numeric" dir="ltr" maxLength={2}
              value={dueDays} onChange={(event) => setDueDays(event.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
      </Dialog>

      {/* Reject: a reason is required, because the requester sees it. */}
      <Dialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        dismissible={!busy}
        title={t('manage.admin.rejectTitle')}
        description={t('manage.admin.rejectReasonRequired')}
        footer={(
          <>
            <Button label={t('common.cancel')} variant="ghost" onClick={() => setRejecting(false)} disabled={busy} />
            <Button label={t('manage.admin.reject')} variant="danger" icon="close" loading={busy}
              disabled={reason.trim().length < 3} onClick={() => void decide(false)} />
          </>
        )}
      >
        <TextArea label={t('manage.admin.rejectReason')} value={reason} onChange={(event) => setReason(event.target.value)}
          maxLength={500} rows={3} counter={`${fmt.number(reason.length)}/${fmt.number(500)}`} />
      </Dialog>
    </div>
  );
}
