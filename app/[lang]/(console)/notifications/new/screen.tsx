'use client';

/**
 * Write and send a notification (the app's admin/push-new.tsx).
 *
 * It reaches a phone that is locked or has the app closed (push), and it is
 * always in the person's inbox — which is what people without push get, and
 * where the whole text and the picture stay. The preview beside the form is
 * the notification as Android draws it, buttons and all.
 *
 * Who gets it is decided on the server from the audience chosen here; the
 * count under it is the server's answer, so what is seen is what will be
 * sent to. "Send a test to me" puts the real thing on this operator's own
 * phone first.
 *
 * Written in Dari, Pashto and English — everyone gets their own — one
 * language at a time, with up to three link buttons and a question. A tap
 * opens the message, never a link. Sending waits until every language is
 * complete and says what is still missing. What has been written is kept in
 * this tab until it is sent or started over, so a reload does not lose it.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BuildingPicker } from '@/components/building-picker';
import { AppTargetEditor } from '@/components/content/apps-target';
import { ButtonsEditor, ContentTexts, LanguageTabs, QuestionEditor } from '@/components/content/editor';
import { NotificationPreview } from '@/components/content/notification-preview';
import { ProblemsNote } from '@/components/content/problems';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Badge, Callout, Skeleton } from '@/components/ui/feedback';
import { ChipGroup, Field } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Card, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  refreshAdmin, sendPush, uploadPlatformImage, useAdminBuildings, usePushPreview, type PushMessageInput,
} from '@/lib/api/admin';
import { targetFromParam } from '@/lib/api/apps';
import { useAudienceLabel } from '@/lib/api/audience';
import {
  clearMessageDraft, clearPicked, draftHasContent, getMessageDraft, keepMessageDraft, usePickedPeople,
} from '@/lib/api/people';
import { cn } from '@/lib/cn';
import {
  contentProblems, emptyTexts, languagesWithProblems,
  type ContentButton, type ContentLanguage, type ContentQuestion, type TextDraft,
} from '@/lib/content';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n } from '@/lib/i18n/client';
import type { AppTarget, NotificationScreen, PushAudience, PushImportance } from '@/lib/supabase/database.types';
import { useOnline } from '@/lib/use-online';

import { PeoplePicker } from '../people-picker';

type Mode = PushAudience['mode'];
type Role = NonNullable<PushAudience['role']>;

const MODES: Mode[] = ['all', 'selected', 'online', 'offline', 'inactive'];
const ROLES: Role[] = ['managers', 'staff', 'residents', 'guards'];
const IMPORTANCES: PushImportance[] = ['normal', 'high', 'quiet'];
const SCREENS: NotificationScreen[] = ['home', 'inbox', 'notices', 'bills', 'repairs', 'settings'];
const INACTIVE_HOURS = [24, 72, 168, 720];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const PREVIEW_PAUSE_MS = 400;

const newClientId = () => crypto.randomUUID();

/** "Send again" (?audience=): who a sent notification went to, but its people (picked apart). */
interface AudienceSeed {
  mode: Mode;
  role: Role | null;
  buildingId: string | null;
  inactiveHours: number | null;
  apps: AppTarget | null;
}

function audienceFromParam(raw: string | null): AudienceSeed | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AudienceSeed>;
    if (!value || !MODES.includes(value.mode as Mode)) return null;
    return {
      mode: value.mode as Mode,
      role: ROLES.includes(value.role as Role) ? value.role as Role : null,
      buildingId: typeof value.buildingId === 'string' ? value.buildingId : null,
      inactiveHours: typeof value.inactiveHours === 'number' ? value.inactiveHours : null,
      // The server checks it again; anything that is not an object is no target.
      apps: value.apps && typeof value.apps === 'object' ? value.apps : null,
    };
  } catch {
    return null;
  }
}
const digitsOnly = (raw: string) => raw.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/\D/g, '');

export function ComposeScreen() {
  const params = useSearchParams();
  const { t, language } = useI18n();
  const fmt = useFormat();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const online = useOnline();
  const buildings = useAdminBuildings();
  const audienceLabel = useAudienceLabel();
  const picked = usePickedPeople();
  const fileInput = useRef<HTMLInputElement>(null);

  // The message as it was left in this tab, if it was not sent — or, from
  // "Send again", a notification already sent, with its audience.
  const again = params.get('again');
  const [seed] = useState(() => audienceFromParam(params.get('audience')));
  const [kept] = useState(getMessageDraft);
  const [showKept, setShowKept] = useState(kept !== null && !again);
  const [showAgain, setShowAgain] = useState(Boolean(again));
  const [lang, setLang] = useState<ContentLanguage>(language);
  const [texts, setTexts] = useState<TextDraft>(() => kept?.texts ?? emptyTexts());
  const [buttons, setButtons] = useState<ContentButton[]>(() => kept?.buttons ?? []);
  const [question, setQuestion] = useState<ContentQuestion | null>(() => kept?.question ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(() => kept?.imageUrl ?? null);
  const [screen, setScreen] = useState<NotificationScreen | null>(() => kept?.screen ?? null);
  const [importance, setImportance] = useState<PushImportance>(() => kept?.importance ?? 'normal');

  // People chosen on People (or a person's page) arrive already picked; "Send
  // again" brings the whole audience it went to.
  const [mode, setMode] = useState<Mode>(() => {
    if (seed && (seed.mode !== 'selected' || picked.length > 0)) return seed.mode;
    return picked.length > 0 ? 'selected' : 'all';
  });
  const [inactiveHours, setInactiveHours] = useState(() => String(seed?.inactiveHours ?? 24));
  const [role, setRole] = useState<Role | null>(() => seed?.role ?? null);
  const [buildingId, setBuildingId] = useState<string | null>(() => seed?.buildingId ?? null);
  // V037: some apps only — or what the App versions page sent (?apps=).
  const [apps, setApps] = useState<AppTarget | null>(() => (seed ? seed.apps : targetFromParam(params.get('apps'))));

  const [clientId, setClientId] = useState(newClientId);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<'send' | 'test' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [pickPeople, setPickPeople] = useState(false);
  const [pickBuilding, setPickBuilding] = useState(false);

  const message: PushMessageInput = { texts, buttons, question, imageUrl, screen, importance };
  // Kept as it is written, until it is sent or started over.
  useEffect(() => {
    keepMessageDraft({ texts, buttons, question, imageUrl, screen, importance });
  }, [texts, buttons, question, imageUrl, screen, importance]);

  const hours = Math.min(8760, Math.max(1, Number.parseInt(inactiveHours || '24', 10)));
  const audience: PushAudience = {
    mode,
    ...(mode === 'selected' ? { profileIds: picked.map((person) => person.id) } : {}),
    ...(mode === 'inactive' ? { inactiveHours: hours } : {}),
    role,
    buildingId,
    apps,
  };
  const audienceReady = mode !== 'selected' || picked.length > 0;

  // The server counts it, a moment after the last change.
  const [counted, setCounted] = useState<PushAudience | null>(null);
  const audienceKey = JSON.stringify(audience);
  useEffect(() => {
    const timer = setTimeout(
      () => setCounted(audienceReady ? JSON.parse(audienceKey) as PushAudience : null),
      PREVIEW_PAUSE_MS,
    );
    return () => clearTimeout(timer);
  }, [audienceKey, audienceReady]);
  const reach = usePushPreview(counted);
  const people = reach.data?.people ?? 0;

  const problems = contentProblems({ kind: 'push', texts, buttons, question });
  const missing = languagesWithProblems(problems);
  const complete = problems.length === 0;
  const canSend = online && !busy && !uploading && complete && audienceReady && people > 0;
  const hasContent = draftHasContent(message);
  const building = buildingId ? buildings.data?.find((candidate) => candidate.id === buildingId) : null;

  const startOver = () => {
    setTexts(emptyTexts());
    setButtons([]);
    setQuestion(null);
    setImageUrl(null);
    setScreen(null);
    setImportance('normal');
    setError(null);
    setShowKept(false);
    setClientId(newClientId());
    clearMessageDraft();
    setConfirmRestart(false);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('admin.errors.imageTooBig', { n: fmt.number(2) }));
      return;
    }
    setUploading(true);
    try {
      setImageUrl(await uploadPlatformImage(file, 'push'));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  };

  const send = async (test: boolean) => {
    setBusy(test ? 'test' : 'send');
    setError(null);
    try {
      const result = await sendPush({ clientId, audience, message, test });
      await refreshAdmin(queryClient);
      if (test) {
        setClientId(newClientId());
        toast.show(t('admin.push.testSent'));
        return;
      }
      setConfirm(false);
      clearPicked();
      clearMessageDraft();
      toast.show(t('admin.push.sent', { n: fmt.number(result.recipients) }));
      router.replace(href(`/notifications/${result.campaignId}`));
    } catch (caught) {
      setConfirm(false);
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  };

  const tabs = <LanguageTabs value={lang} onChange={setLang} missing={missing} />;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t('admin.push.new')}
        back={href('/notifications')}
        backLabel={t('admin.push.title')}
        actions={hasContent ? (
          <Button variant="ghost" icon="undo" label={t('content.startOver')} onClick={() => setConfirmRestart(true)} />
        ) : null}
      />

      {showKept ? (
        <Callout className="mb-6" title={t('admin.push.draftRestored')}
          action={<Button variant="ghost" size="sm" label={t('common.close')} onClick={() => setShowKept(false)} />} />
      ) : null}
      {showAgain ? (
        <Callout className="mb-6" icon="copy" title={t('console.push.againTitle')} body={t('console.push.againBody')}
          action={<Button variant="ghost" size="sm" label={t('common.close')} onClick={() => setShowAgain(false)} />} />
      ) : null}

      <form
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) setConfirm(true);
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_26rem]">
          {/* ---- as the phone will show it, in the language being written ---- */}
          <aside className="flex flex-col gap-3 lg:sticky lg:top-24 lg:order-2">
            <p className="text-sm font-semibold text-fg-muted">
              {t('admin.push.preview')} · {t(`content.languages.${lang}`)}
            </p>
            {tabs}
            <NotificationPreview
              lang={lang}
              title={texts[lang].title}
              body={texts[lang].body}
              imageUrl={imageUrl}
              importance={importance}
              buttons={buttons}
              question={question}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-8 lg:order-1">
            <Section title={t('admin.push.message')}>
              <Card className="flex flex-col gap-4">
                <div className="lg:hidden">{tabs}</div>
                <ContentTexts kind="push" lang={lang} texts={texts} onChange={setTexts} />
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3.5">
                  {imageUrl ? (
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="" className="h-12 w-12 object-cover" />
                    </span>
                  ) : <Icon name="image" size={22} className="text-fg-subtle" />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold text-fg">{imageUrl ? t('admin.banner.logoSet') : t('admin.push.noImage')}</span>
                    <span className="text-sm text-fg-muted">{t('admin.push.imageHint')}</span>
                  </span>
                  <span className="flex gap-2">
                    {imageUrl ? (
                      <Button label={t('admin.banner.remove')} variant="ghost" size="sm" onClick={() => setImageUrl(null)} />
                    ) : null}
                    <Button label={imageUrl ? t('admin.banner.change') : t('admin.banner.upload')} variant="secondary"
                      size="sm" icon="upload" loading={uploading} disabled={!online} onClick={() => fileInput.current?.click()} />
                  </span>
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={(event) => {
                      void upload(event.target.files?.[0]);
                      event.target.value = '';
                    }} />
                </div>
              </Card>
            </Section>

            {/* ---- buttons and the question ---- */}
            <Section title={t('content.buttons.title')}>
              <Card className="flex flex-col gap-4">
                {tabs}
                <ButtonsEditor kind="push" lang={lang} buttons={buttons} onChange={setButtons} />
              </Card>
            </Section>

            <Section title={t('content.question.title')}>
              <Card className="flex flex-col gap-4">
                {tabs}
                <QuestionEditor lang={lang} question={question} onChange={setQuestion} />
              </Card>
            </Section>

            <Section title={t('admin.push.style')}>
              <Card className="flex flex-col gap-3">
                <ChipGroup<PushImportance>
                  label={t('admin.push.style')}
                  options={IMPORTANCES.map((value) => ({
                    value,
                    label: t(`admin.push.importance.${value}`),
                    icon: value === 'high' ? 'alert' : value === 'quiet' ? 'moon' : 'bell',
                  }))}
                  value={importance}
                  onChange={setImportance}
                />
                <p className="text-sm text-fg-muted">{t(`admin.push.importanceHint.${importance}`)}</p>
              </Card>
            </Section>

            {/* ---- where a tap goes ---- */}
            <Section title={t('admin.push.opens')} description={t('content.opensHint')}>
              <Card className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-fg">{t('admin.push.screen')}</p>
                <ChipGroup<string>
                  label={t('admin.push.screen')}
                  options={[{ value: 'none', label: t('admin.push.screenNone') },
                    ...SCREENS.map((value) => ({ value, label: t(`inbox.screens.${value}`) }))]}
                  value={screen ?? 'none'}
                  onChange={(next) => setScreen(next === 'none' ? null : next as NotificationScreen)}
                />
              </Card>
            </Section>

            {/* ---- who gets it ---- */}
            <Section title={t('admin.push.who')}>
              <Card className="flex flex-col gap-5">
                <ChipGroup<Mode>
                  label={t('admin.push.who')}
                  options={MODES.map((value) => ({
                    value,
                    label: t(`admin.push.audience.${value}`),
                    icon: value === 'online' ? 'users' : value === 'selected' ? 'user' : value === 'inactive' ? 'clock' : undefined,
                  }))}
                  value={mode}
                  onChange={setMode}
                />

                {mode === 'selected' ? (
                  <button type="button" onClick={() => setPickPeople(true)}
                    className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-start transition-colors hover:bg-surface-sunken">
                    <Icon name="users" size={20} className="text-primary" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-fg">{t('admin.push.choosePeople')}</span>
                      <span className="truncate text-sm text-fg-muted">
                        {picked.length === 0
                          ? t('admin.push.nobodyChosen')
                          : picked.map((person) => person.name).filter(Boolean).join(language === 'en' ? ', ' : '، ')
                            || t('admin.push.audience.selectedCount', { n: fmt.number(picked.length) })}
                      </span>
                    </span>
                    <Badge tone={picked.length > 0 ? 'primary' : 'neutral'} label={fmt.number(picked.length)} />
                    <Icon name="chevron" size={18} className="text-fg-subtle" />
                  </button>
                ) : null}

                {mode === 'inactive' ? (
                  <div className="flex flex-col gap-3">
                    <ChipGroup<string>
                      label={t('admin.push.inactiveHours')}
                      options={INACTIVE_HOURS.map((value) => ({
                        value: String(value),
                        label: t('admin.push.audience.inactiveFor', { hours: fmt.number(value) }),
                      }))}
                      value={INACTIVE_HOURS.includes(hours) ? String(hours) : null}
                      onChange={setInactiveHours}
                    />
                    <Field label={t('admin.push.inactiveHours')} hint={t('admin.push.inactiveHint')} value={inactiveHours}
                      onChange={(event) => setInactiveHours(digitsOnly(event.target.value).slice(0, 4))}
                      inputMode="numeric" dir="ltr" maxLength={4} wrapperClassName="max-w-60" />
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-fg">{t('admin.push.narrow')}</p>
                  <ChipGroup<string>
                    label={t('admin.push.narrow')}
                    options={[{ value: 'any', label: t('admin.push.anyRole') },
                      ...ROLES.map((value) => ({ value, label: t(`admin.banner.audience.${value}`) }))]}
                    value={role ?? 'any'}
                    onChange={(next) => setRole(next === 'any' ? null : next as Role)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-fg">{t('admin.banner.buildingLabel')}</p>
                  <button type="button" onClick={() => setPickBuilding(true)}
                    className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-start transition-colors hover:bg-surface-sunken">
                    <Icon name="building" size={20} className="text-fg-muted" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                      {buildingId ? building?.name ?? '…' : t('admin.banner.everyBuilding')}
                    </span>
                    <Icon name="chevronDown" size={18} className="text-fg-subtle" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 border-t border-line pt-5">
                  <p className="text-sm font-semibold text-fg">{t('console.apps.target.title')}</p>
                  <AppTargetEditor value={apps} onChange={setApps} />
                </div>

                {/* The server's own count of this audience. */}
                <div aria-live="polite" className={cn('flex flex-col gap-1 rounded-xl border p-4',
                  people > 0 ? 'border-primary/25 bg-primary-soft/50' : 'border-line bg-surface-sunken/50')}>
                  {!audienceReady ? (
                    <p className="text-fg-muted">{t('admin.push.nobodyChosen')}</p>
                  ) : reach.isLoading || reach.isFetching || counted === null ? (
                    <Skeleton className="h-5 w-48" />
                  ) : reach.error ? (
                    <p className="font-semibold text-danger">{errorText(reach.error)}</p>
                  ) : (
                    <>
                      <p className="font-semibold text-fg">{t('admin.push.willReach', { n: fmt.number(people) })}</p>
                      <p className="text-sm text-fg-muted">
                        {t('admin.push.willReachBody', {
                          devices: fmt.number(reach.data?.reachable ?? 0),
                          online: fmt.number(reach.data?.online ?? 0),
                        })}
                      </p>
                    </>
                  )}
                </div>
              </Card>
            </Section>

            {error ? <Callout tone="danger" title={error} /> : null}
          </div>
        </div>

        {/* ---- the bar that stays in reach ---- */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2.5 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-card lg:border lg:px-5">
          <ProblemsNote problems={problems} onLanguage={setLang} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" icon="phone" label={t('admin.push.testMe')}
              disabled={!online || Boolean(busy) || !complete} loading={busy === 'test'} onClick={() => void send(true)} />
            <Button type="submit" icon="send" label={t('admin.push.send')} disabled={!canSend} loading={busy === 'send'} />
          </div>
        </div>
      </form>

      {pickPeople ? <PeoplePicker open onClose={() => setPickPeople(false)} /> : null}

      <BuildingPicker
        open={pickBuilding}
        onClose={() => setPickBuilding(false)}
        value={buildingId}
        onPick={setBuildingId}
        title={t('admin.banner.buildingLabel')}
        everyLabel={t('admin.banner.everyBuilding')}
      />

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void send(false)}
        title={t('admin.push.confirmTitle', { n: fmt.number(people) })}
        body={`${audienceLabel(audience)} · ${t('admin.push.confirmBody')}`}
        confirmLabel={t('admin.push.send')}
        loading={busy === 'send'}
      />

      <ConfirmDialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        onConfirm={startOver}
        title={t('content.startOverTitle')}
        body={t('content.startOverBody')}
        confirmLabel={t('content.startOver')}
        tone="danger"
      />
    </div>
  );
}
