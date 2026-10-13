'use client';

/**
 * How calls find each other (V029, the app's admin/calls.tsx).
 *
 * Calls go phone to phone. STUN — free, public — gets them through ordinary
 * home and mobile networks. Behind strict networks only a TURN relay gets
 * through: the platform's own coturn server, whose shared secret is set here.
 *
 * The secret is WRITE-ONLY: the database never returns it, the page never
 * shows it, and phones get short-lived credentials derived from it, never
 * the secret itself. Leaving the field empty keeps the saved one.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Callout, SkeletonRows } from '@/components/ui/feedback';
import { Field, Switch, TextArea } from '@/components/ui/form';
import { Card, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import { callSettingsKey, saveAdminCallSettings, useAdminCallSettings } from '@/lib/api/calls';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useT } from '@/lib/i18n/client';
import type { AdminCallSettings } from '@/lib/supabase/database.types';
import { isolate } from '@/lib/text';
import { useOnline } from '@/lib/use-online';

const STUN = /^stun:[A-Za-z0-9.-]+(:[0-9]{1,5})?$/;
const TURN = /^turns?:[A-Za-z0-9.-]+(:[0-9]{1,5})?(\?transport=(udp|tcp))?$/;

function lines(text: string): string[] {
  return text.split(/[\n,]+/).map((line) => line.trim()).filter(Boolean);
}

export function CallsScreen() {
  const t = useT();
  const settings = useAdminCallSettings();
  const errorText = useErrorText();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('calls.admin.title')} subtitle={t('calls.admin.body')} />
      {settings.data ? (
        // A fresh form whenever the saved settings change.
        <CallSettingsForm key={settings.data.updated_at ?? 'none'} settings={settings.data} />
      ) : settings.error ? <Callout tone="danger" title={errorText(settings.error)} /> : <SkeletonRows rows={4} />}
    </div>
  );
}

function CallSettingsForm({ settings }: { settings: AdminCallSettings }) {
  const t = useT();
  const fmt = useFormat();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const online = useOnline();

  const [stun, setStun] = useState(settings.stun_urls.join('\n'));
  const [turn, setTurn] = useState(settings.turn_urls.join('\n'));
  const [secret, setSecret] = useState('');
  const [clearSecret, setClearSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stunUrls = lines(stun);
  const turnUrls = lines(turn);
  const urlsValid = stunUrls.length <= 6 && turnUrls.length <= 6
    && stunUrls.every((url) => STUN.test(url)) && turnUrls.every((url) => TURN.test(url));
  const secretValid = secret.length === 0 || (secret.length >= 16 && secret.length <= 200);
  const relay = turnUrls.length > 0 && ((settings.has_secret && !clearSecret) || secret.length > 0);
  const canSave = online && !busy && urlsValid && secretValid;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveAdminCallSettings({ stunUrls, turnUrls, turnSecret: secret || null, clearSecret: clearSecret && !secret });
      setSecret('');
      await queryClient.invalidateQueries({ queryKey: callSettingsKey });
      toast.show(t('calls.admin.saved'));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-6"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) void save();
      }}
    >
      <Callout tone={relay ? 'success' : 'warning'} title={relay ? t('calls.admin.relayOn') : t('calls.admin.relayOff')} />

      <Section title={t('calls.admin.stun')}>
        <Card>
          <TextArea aria-label={t('calls.admin.stun')} value={stun} rows={3} dir="ltr" spellCheck={false}
            className="font-mono text-sm" onChange={(event) => setStun(event.target.value)}
            hint={t('calls.admin.onePerLine', { example: isolate('stun:stun.l.google.com:19302') })} />
        </Card>
      </Section>

      <Section title={t('calls.admin.turn')}>
        <Card className="flex flex-col gap-5">
          <TextArea aria-label={t('calls.admin.turn')} value={turn} rows={3} dir="ltr" spellCheck={false}
            className="font-mono text-sm" onChange={(event) => setTurn(event.target.value)}
            hint={t('calls.admin.onePerLine', { example: isolate('turn:turn.example.af:3478?transport=udp') })} />
          {/* Never filled in: the saved secret does not leave the database. */}
          <Field
            label={t('calls.admin.secret')}
            type="password"
            autoComplete="new-password"
            dir="ltr"
            icon="key"
            value={secret}
            maxLength={200}
            placeholder={t('calls.admin.secretPlaceholder')}
            onChange={(event) => setSecret(event.target.value)}
            hint={settings.has_secret ? t('calls.admin.secretKept') : t('calls.admin.secretNone')}
            error={secretValid ? null : t('calls.admin.secretInvalid')}
            counter={secret ? `${fmt.number(secret.length)}/${fmt.number(200)}` : undefined}
          />
          {settings.has_secret ? (
            <Switch label={t('calls.admin.clearSecret')} checked={clearSecret} onChange={setClearSecret} />
          ) : null}
        </Card>
      </Section>

      {!urlsValid ? <Callout tone="danger" title={t('calls.admin.invalid')} /> : null}
      {error ? <Callout tone="danger" title={error} /> : null}

      <div className="flex justify-end">
        <Button type="submit" icon="check" label={t('common.save')} disabled={!canSave} loading={busy} />
      </div>
    </form>
  );
}
