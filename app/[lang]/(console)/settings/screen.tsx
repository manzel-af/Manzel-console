'use client';

/**
 * Settings for the whole platform (the app's admin/settings.tsx).
 *
 *   * Maintenance mode — everyone but operators sees a "back soon" screen
 *     with the operator's message, until it is switched off. Confirmed first.
 *   * Building requests — open, or closed to new ones (the server refuses a
 *     request while closed; waiting ones can still be reviewed).
 *   * The platform fee — on or off, how much, and how long buildings have.
 *   * Support contacts — the phone, WhatsApp and email people see in the
 *     app's Settings and on the maintenance screen, and the website on its
 *     contact page within the hour.
 *
 * All of it reaches every open phone within seconds.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Callout, SkeletonRows } from '@/components/ui/feedback';
import { Field, Segmented, Switch, TextArea } from '@/components/ui/form';
import { Card, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import { refreshAdmin, saveSettings, usePlatformSettings } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/auth';
import { useErrorText } from '@/lib/errors';
import { currencyDecimals, type CurrencyCode } from '@/lib/format/money';
import { parseDigits } from '@/lib/format/numerals';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import type { PlatformSettingsRow } from '@/lib/supabase/database.types';
import { isolate } from '@/lib/text';
import { useOnline } from '@/lib/use-online';

/** "0799 123 456", "+93 799-123-456", "۰۷۹۹۱۲۳۴۵۶" → "+93799123456"; "" stays empty. */
function normalisePhone(raw: string): string {
  const latin = parseDigits(raw).trim();
  const plus = latin.startsWith('+');
  const digits = latin.replace(/\D/g, '');
  if (!digits) return '';
  if (plus) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0') && digits.length === 10) return `+93${digits.slice(1)}`;
  return digits;
}

const CURRENCIES: CurrencyCode[] = ['AFN', 'USD', 'EUR', 'PKR'];
const PHONE = /^\+?[0-9]{6,15}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const digitsOnly = (raw: string) => parseDigits(raw).replace(/\D/g, '');

export function SettingsScreen() {
  const t = useT();
  const settings = usePlatformSettings();
  const errorText = useErrorText();
  return settings.data ? (
    <SettingsForm key={settings.data.updated_at} settings={settings.data} />
  ) : (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('admin.settings.title')} />
      {settings.error ? <Callout tone="danger" title={errorText(settings.error)} /> : <SkeletonRows rows={5} />}
    </div>
  );
}

function SettingsForm({ settings }: { settings: PlatformSettingsRow }) {
  const t = useT();
  const fmt = useFormat();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const online = useOnline();
  const auth = useAuth();

  const [maintenance, setMaintenance] = useState(settings.maintenance_enabled);
  const [message, setMessage] = useState(settings.maintenance_message ?? '');
  const [requestsOpen, setRequestsOpen] = useState(settings.building_requests_open);
  // The fee is kept in minor units; operators think in whole ؋.
  const [fee, setFee] = useState(String(Math.round(settings.monthly_fee_minor / 10 ** currencyDecimals(settings.fee_currency))));
  const [currency, setCurrency] = useState<CurrencyCode>(settings.fee_currency as CurrencyCode);
  const [graceDays, setGraceDays] = useState(String(settings.grace_days));
  const [billingOn, setBillingOn] = useState(settings.billing_enabled);
  const [phone, setPhone] = useState(settings.support_phone ?? '');
  const [whatsapp, setWhatsapp] = useState(settings.support_whatsapp ?? '');
  const [email, setEmail] = useState(settings.support_email ?? '');
  const [confirmOn, setConfirmOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValue = normalisePhone(phone);
  const whatsappValue = normalisePhone(whatsapp);
  const emailValue = email.trim().toLowerCase();
  const phoneValid = !phoneValue || PHONE.test(phoneValue);
  const whatsappValid = !whatsappValue || PHONE.test(whatsappValue);
  const emailValid = !emailValue || EMAIL.test(emailValue);
  const feeMinor = Math.round(Number(fee || '0') * 10 ** currencyDecimals(currency));
  const grace = Number(graceDays || '0');
  const feeValid = Number.isFinite(feeMinor) && feeMinor >= 0 && feeMinor <= 100_000_000;
  const graceValid = Number.isInteger(grace) && grace >= 0 && grace <= 90;
  const canSave = online && !busy && phoneValid && whatsappValid && emailValid && feeValid && graceValid
    && message.length <= 500;

  const save = async () => {
    setConfirmOn(false);
    setBusy(true);
    setError(null);
    try {
      await saveSettings({
        maintenance_enabled: maintenance,
        maintenance_message: message.trim() || null,
        building_requests_open: requestsOpen,
        support_phone: phoneValue || null,
        support_whatsapp: whatsappValue || null,
        support_email: emailValue || null,
        monthly_fee_minor: feeMinor,
        fee_currency: currency,
        grace_days: grace,
        billing_enabled: billingOn,
      }, auth.user?.id ?? '');
      await refreshAdmin(queryClient);
      toast.show(t('admin.saved'));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  // Switching maintenance ON is the one change here that stops everyone.
  const onSave = () => {
    if (maintenance && !settings.maintenance_enabled) setConfirmOn(true);
    else void save();
  };

  const phoneError = t('admin.errors.phone', { example: isolate('+93799123456') });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('admin.settings.title')} subtitle={t('admin.settings.changed', { when: fmt.relative(settings.updated_at) })} />

      <form
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSave();
        }}
      >
        <Section title={t('admin.settings.maintenance')}>
          <Card className="flex flex-col gap-5">
            <Switch label={t('admin.settings.maintenanceToggle')} description={t('admin.settings.maintenanceHint')}
              checked={maintenance} onChange={setMaintenance} />
            <TextArea label={t('admin.settings.message')} hint={t('admin.settings.messageHint')} value={message} maxLength={500}
              rows={3} placeholder={t('platform.maintenance.body')} onChange={(event) => setMessage(event.target.value)}
              counter={`${fmt.number(message.length)}/${fmt.number(500)}`} />
            {maintenance ? (
              <Callout tone="warning" icon="wrench" title={t('admin.home.maintenanceOn')} body={t('admin.home.maintenanceOnBody')} />
            ) : null}
          </Card>
        </Section>

        <Section title={t('admin.settings.requests')}>
          <Card>
            <Switch label={t('admin.settings.requestsToggle')} description={t('admin.settings.requestsHint')}
              checked={requestsOpen} onChange={setRequestsOpen} />
          </Card>
        </Section>

        {/* The platform fee every building pays, and how long they have. */}
        <Section title={t('admin.settings.fee')}>
          <Card className="flex flex-col gap-5">
            <Switch label={t('admin.settings.billingToggle')} description={t('admin.settings.billingHint')}
              checked={billingOn} onChange={setBillingOn} />
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t('admin.settings.feeAmount')} hint={t('admin.settings.feeAmountHint')} icon="receipt"
                inputMode="numeric" dir="ltr" maxLength={7} value={fee}
                onChange={(event) => setFee(digitsOnly(event.target.value).slice(0, 7))}
                error={feeValid ? null : t('admin.settings.feeAmountError')} />
              <Field label={t('admin.settings.graceDays')} hint={t('admin.settings.graceDaysHint')} icon="clock"
                inputMode="numeric" dir="ltr" maxLength={2} value={graceDays}
                onChange={(event) => setGraceDays(digitsOnly(event.target.value).slice(0, 2))}
                error={graceValid ? null : t('admin.settings.graceDaysError')} />
            </div>
            <Segmented<CurrencyCode>
              value={currency}
              onChange={setCurrency}
              label={t('admin.settings.feeAmount')}
              options={CURRENCIES.map((value) => ({ value, label: value }))}
            />
            <p className="text-sm text-fg-muted">
              {t('admin.settings.feeShare', { amount: fmt.money(feeMinor, { currency }), n: fmt.number(grace) })}
            </p>
          </Card>
        </Section>

        <Section title={t('platform.support.title')} description={t('admin.settings.supportHint')}>
          <Card className="grid gap-5 md:grid-cols-2">
            <Field label={t('admin.settings.supportPhone')} type="tel" dir="ltr" icon="phone" maxLength={20}
              placeholder="+93 7XX XXX XXX" value={phone} onChange={(event) => setPhone(event.target.value)}
              error={phoneValid ? null : phoneError} />
            <Field label={t('admin.settings.supportWhatsapp')} type="tel" dir="ltr" icon="chat" maxLength={20}
              placeholder="+93 7XX XXX XXX" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)}
              error={whatsappValid ? null : phoneError} />
            <Field label={t('admin.settings.supportEmail')} type="email" dir="ltr" icon="mail" maxLength={120}
              placeholder="support@manzel.af" value={email} onChange={(event) => setEmail(event.target.value)}
              wrapperClassName="md:col-span-2" error={emailValid ? null : t('admin.errors.email')} />
          </Card>
        </Section>

        {error ? <Callout tone="danger" title={error} /> : null}

        <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-card lg:border lg:px-5">
          <Button type="submit" icon="check" label={t('common.save')} disabled={!canSave} loading={busy} />
        </div>
      </form>

      <ConfirmDialog
        open={confirmOn}
        onClose={() => setConfirmOn(false)}
        onConfirm={() => void save()}
        title={t('admin.settings.confirmTitle')}
        body={t('admin.settings.confirmBody')}
        confirmLabel={t('admin.settings.confirm')}
        tone="danger"
        loading={busy}
      />
    </div>
  );
}
