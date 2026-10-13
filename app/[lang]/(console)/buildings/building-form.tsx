'use client';

/**
 * A building's details, as a form: name, code, city, address, billing day and
 * due days. Shared by "new building" and "edit", which differ only in where
 * the values come from and what Save does.
 */

import type { ReactNode } from 'react';

import { Field } from '@/components/ui/form';
import { isValidBuildingCode, normaliseBuildingCode } from '@/lib/api/admin';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import { CODE_MAX, CODE_MIN } from '@/lib/text';

export interface BuildingValues {
  name: string;
  code: string;
  city: string;
  address: string;
  billingDay: string;
  dueDays: string;
}

export function buildingValid(values: BuildingValues): boolean {
  const billing = Number.parseInt(values.billingDay || '0', 10);
  const due = Number.parseInt(values.dueDays || '-1', 10);
  return values.name.trim().length >= 2 && isValidBuildingCode(values.code) && values.city.trim().length >= 2
    && billing >= 1 && billing <= 28 && due >= 0 && due <= 90;
}

export function BuildingFields({
  values, onChange, codeLocked = false, codeHint, children,
}: {
  values: BuildingValues;
  onChange(next: BuildingValues): void;
  codeLocked?: boolean;
  codeHint?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const fmt = useFormat();
  const set = (patch: Partial<BuildingValues>) => onChange({ ...values, ...patch });
  const codeValid = isValidBuildingCode(values.code);
  const digits = (raw: string) => raw.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/\D/g, '');

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label={t('manage.register.name')} placeholder={t('manage.register.namePlaceholder')} required icon="building"
        value={values.name} maxLength={120} onChange={(event) => set({ name: event.target.value })}
        wrapperClassName="md:col-span-2" />
      <Field
        label={t('manage.register.code')}
        placeholder="GOLS"
        required
        dir="ltr"
        className="font-mono uppercase"
        value={values.code}
        maxLength={CODE_MAX}
        disabled={codeLocked}
        onChange={(event) => set({ code: normaliseBuildingCode(event.target.value) })}
        hint={codeHint ?? t('manage.register.codeHint', { min: fmt.number(CODE_MIN), max: fmt.number(CODE_MAX), example: 'GOLS-1405-0001' })}
        error={values.code.length > 0 && !codeValid ? t('manage.errors.codeInvalid', { min: fmt.number(CODE_MIN), max: fmt.number(CODE_MAX) }) : null}
      />
      <Field label={t('manage.register.city')} required value={values.city} maxLength={60}
        onChange={(event) => set({ city: event.target.value })} />
      <Field label={t('manage.register.address')} optionalLabel={t('common.optional')} value={values.address} maxLength={240}
        onChange={(event) => set({ address: event.target.value })} wrapperClassName="md:col-span-2" />
      <Field label={t('manage.building.billingDay')} required inputMode="numeric" dir="ltr" maxLength={2}
        value={values.billingDay} onChange={(event) => set({ billingDay: digits(event.target.value) })} />
      <Field label={t('manage.building.dueDays')} required inputMode="numeric" dir="ltr" maxLength={2}
        value={values.dueDays} onChange={(event) => set({ dueDays: digits(event.target.value) })} />
      {children}
    </div>
  );
}
