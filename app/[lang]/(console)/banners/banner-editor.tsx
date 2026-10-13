'use client';

/**
 * Create or edit a banner (the app's admin/banner.tsx), with the live preview
 * beside the form — exactly as it will appear on people's home screens, in
 * the language being written.
 *
 * The look: a tone, or any colour (a swatch or a #RRGGBB of the operator's
 * own); an icon, or an uploaded logo. The reach: everyone or one role, every
 * building or one. The timing: now or from a date, until a date or until
 * switched off. A priority, and whether people may close it. Saving
 * publishes it to every open phone within seconds.
 *
 * The words are written in Dari, Pashto and English, one language at a time;
 * the tabs, the buttons and the question share one choice of language.
 * Publishing waits until every language is complete, and says what is still
 * missing.
 */

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';

import { BuildingPicker } from '@/components/building-picker';
import { AppTargetEditor } from '@/components/content/apps-target';
import { BANNER_ICONS, BannerPreview, isHexColor, type BannerContent } from '@/components/content/banner-preview';
import {
  ButtonsEditor, ContentTexts, LanguageTabs, QuestionEditor, editableButtons,
} from '@/components/content/editor';
import { ProblemsNote } from '@/components/content/problems';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Callout } from '@/components/ui/feedback';
import { ChipGroup, Field, Switch } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Card, Divider, PageHeader, Section } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  deleteBanner, refreshAdmin, saveBanner, uploadPlatformImage, useAdminBuildings, useAnswerCount, type BannerInput,
} from '@/lib/api/admin';
import { cn } from '@/lib/cn';
import {
  asQuestion, contentProblems, emptyTexts, languagesWithProblems, textsFromRow,
  type ContentButton, type ContentLabel, type ContentLanguage, type ContentQuestion, type TextDraft,
} from '@/lib/content';
import { useErrorText } from '@/lib/errors';
import { toIsoDate } from '@/lib/format/date';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n } from '@/lib/i18n/client';
import type { AppTarget, PlatformAnnouncementRow, PlatformAudience, PlatformTone } from '@/lib/supabase/database.types';
import { useNow } from '@/lib/use-now';
import { useOnline } from '@/lib/use-online';

const TONES: PlatformTone[] = ['info', 'success', 'warning', 'danger', 'brand', 'neutral'];
const AUDIENCES: PlatformAudience[] = ['all', 'managers', 'staff', 'residents', 'guards'];
/** Lapis and saffron first, then colours that read well with white text. */
const SWATCHES = ['#1E4E8C', '#B8791F', '#2E7D5B', '#C0483C', '#0F766E', '#6B4FA3', '#DB2777', '#0EA5E9', '#F4C542', '#1A1714'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function localStart(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function localEnd(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** A label as the preview of `lang` shows it: that language's words only, or `fallback`. */
function onlyIn(label: ContentLabel, lang: ContentLanguage, fallback: string): ContentLabel {
  const text = label[lang].trim() || fallback;
  return { 'fa-AF': text, 'ps-AF': text, en: text };
}

const digitsOnly = (raw: string) => raw.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/\D/g, '');

export function BannerEditor({ existing, initialApps = null }: {
  existing: PlatformAnnouncementRow | null;
  /** A new banner's apps, from the App versions page (?apps=). */
  initialApps?: AppTarget | null;
}) {
  const { t, language, wordsIn } = useI18n();
  const fmt = useFormat();
  const href = useHref();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const online = useOnline();
  const buildings = useAdminBuildings();
  const now = useNow(30_000);
  const fileInput = useRef<HTMLInputElement>(null);

  // The words, in every language; the tab is the one being written and previewed.
  const [lang, setLang] = useState<ContentLanguage>(language);
  const [texts, setTexts] = useState<TextDraft>(() => (existing ? textsFromRow(existing) : emptyTexts()));
  const [buttons, setButtons] = useState<ContentButton[]>(() => (existing ? editableButtons(existing) : []));
  const [question, setQuestion] = useState<ContentQuestion | null>(() => asQuestion(existing?.question));
  const [tone, setTone] = useState<PlatformTone>(existing?.tone ?? 'info');
  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const [hex, setHex] = useState(existing?.color ?? '');
  const [icon, setIcon] = useState<string | null>(existing?.icon ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(existing?.image_url ?? null);
  const [audience, setAudience] = useState<PlatformAudience>(existing?.audience ?? 'all');
  const [buildingId, setBuildingId] = useState<string | null>(existing?.building_id ?? null);
  // A start in the future is a date; one already past is "now" and is kept.
  const [startDate, setStartDate] = useState<string | null>(() =>
    existing && Date.parse(existing.starts_at) > Date.now() ? toIsoDate(new Date(existing.starts_at)) : null);
  const [endDate, setEndDate] = useState<string | null>(() =>
    existing?.ends_at ? toIsoDate(new Date(existing.ends_at)) : null);
  const [priority, setPriority] = useState(String(existing?.priority ?? 0));
  const [dismissible, setDismissible] = useState(existing?.dismissible ?? true);
  const [active, setActive] = useState(existing?.active ?? true);
  const [apps, setApps] = useState<AppTarget | null>(() => (existing ? existing.apps ?? null : initialApps));

  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickBuilding, setPickBuilding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The answers to the question as saved, for the Responses link.
  const savedQuestion = existing ? asQuestion(existing.question) : null;
  const answerCount = useAnswerCount(existing && savedQuestion ? { announcementId: existing.id } : null);

  const problems = contentProblems({ kind: 'banner', texts, buttons, question });
  const missing = languagesWithProblems(problems);
  const hexValid = hex === '' || isHexColor(hex);
  const windowValid = !endDate || !startDate || endDate >= startDate;
  const endInFuture = !endDate || localEnd(endDate).getTime() > now;
  const priorityValue = Math.min(100, Math.max(0, Number.parseInt(priority || '0', 10)));
  const canSave = online && !busy && !uploading && problems.length === 0 && hexValid && windowValid && endInFuture;
  const building = buildingId ? buildings.data?.find((candidate) => candidate.id === buildingId) : null;
  const back = href('/banners');

  // The preview: the tab's language exactly as its readers get it, with the
  // app's placeholders in that language where nothing is written yet.
  const words = wordsIn(lang);
  const shownTitle = texts[lang].title.trim() || words('admin.banner.previewTitle');
  const shownBody = texts[lang].body.trim();
  const preview: BannerContent = {
    title: shownTitle,
    body: shownBody || null,
    translations: { [lang]: shownBody ? { title: shownTitle, body: shownBody } : { title: shownTitle } },
    buttons: buttons.map((button) => ({ url: button.url.trim(), label: onlyIn(button.label, lang, '') })),
    question: question?.kind === 'choice'
      ? {
        kind: 'choice',
        prompt: onlyIn(question.prompt, lang, words('content.placeholder.prompt')),
        choices: question.choices.map((choice) => onlyIn(choice, lang, words('content.placeholder.choice'))),
      }
      : question
        ? { kind: 'text', prompt: onlyIn(question.prompt, lang, words('content.placeholder.prompt')) }
        : null,
    tone,
    color,
    icon,
    image_url: imageUrl,
    link_url: null,
    link_label: null,
    dismissible,
  };

  const chooseColor = (next: string | null) => {
    setColor(next);
    setHex(next ?? '');
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
      setImageUrl(await uploadPlatformImage(file, 'banners'));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const keepStart = existing && Date.parse(existing.starts_at) <= Date.now() ? existing.starts_at : new Date().toISOString();
    const input: BannerInput = {
      texts,
      buttons,
      question,
      tone,
      color,
      icon,
      imageUrl,
      audience,
      buildingId,
      startsAt: startDate ? localStart(startDate).toISOString() : keepStart,
      endsAt: endDate ? localEnd(endDate).toISOString() : null,
      dismissible,
      active,
      priority: priorityValue,
      apps,
    };
    try {
      await saveBanner(existing?.id ?? null, input);
      await refreshAdmin(queryClient);
      toast.show(existing ? t('admin.saved') : t('admin.banner.published'));
      router.push(back);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await deleteBanner(existing.id);
      await refreshAdmin(queryClient);
      toast.show(t('admin.banner.deleted'));
      setConfirmDelete(false);
      router.push(back);
    } catch (caught) {
      setError(errorText(caught));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const tabs = <LanguageTabs value={lang} onChange={setLang} missing={missing} />;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={existing ? t('admin.banner.edit') : t('admin.banners.new')}
        back={back}
        backLabel={t('admin.banners.title')}
        actions={existing ? (
          <Button variant="soft-danger" icon="trash" label={t('common.delete')} onClick={() => setConfirmDelete(true)} />
        ) : null}
      />

      <form
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) void save();
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_28rem]">
          {/* ---- the preview: on top on a phone, beside the form on a desk ---- */}
          <aside className="flex flex-col gap-3 lg:sticky lg:top-24 lg:order-2">
            <p className="text-sm font-semibold text-fg-muted">
              {t('admin.banner.preview')} · {t(`content.languages.${lang}`)}
            </p>
            {tabs}
            <div className="rounded-card bg-surface-sunken p-3">
              <BannerPreview banner={preview} language={lang} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-8 lg:order-1">
            {/* ---- words ---- */}
            <Section title={t('admin.banner.message')}>
              <Card className="flex flex-col gap-4">
                <div className="lg:hidden">{tabs}</div>
                <ContentTexts kind="banner" lang={lang} texts={texts} onChange={setTexts} />
              </Card>
            </Section>

            {/* ---- buttons ---- */}
            <Section title={t('content.buttons.title')}>
              <Card className="flex flex-col gap-4">
                {tabs}
                <ButtonsEditor kind="banner" lang={lang} buttons={buttons} onChange={setButtons} />
              </Card>
            </Section>

            {/* ---- the question ---- */}
            <Section title={t('content.question.title')}>
              <Card className="flex flex-col gap-4">
                {tabs}
                <QuestionEditor lang={lang} question={question} onChange={setQuestion} />
                {existing && savedQuestion ? (
                  <>
                    {(answerCount.data ?? 0) > 0 ? (
                      <p className="text-sm text-fg-muted">{t('content.question.answered', { n: fmt.number(answerCount.data ?? 0) })}</p>
                    ) : null}
                    <Link href={href(`/banners/${existing.id}/answers`)}
                      className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-surface-sunken">
                      <Icon name="chat" size={20} className="text-fg-muted" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold text-fg">{t('content.answers.title')}</span>
                        <span className="text-sm text-fg-muted">
                          {answerCount.data === undefined
                            ? t('content.answers.entry')
                            : t('content.answers.total', { n: fmt.number(answerCount.data) })}
                        </span>
                      </span>
                      <Icon name="chevron" size={18} className="text-fg-subtle" />
                    </Link>
                  </>
                ) : null}
              </Card>
            </Section>

            {/* ---- look ---- */}
            <Section title={t('admin.banner.look')}>
              <Card className="flex flex-col gap-5">
                <Labelled label={t('admin.banner.tone')}>
                  <ChipGroup<PlatformTone>
                    label={t('admin.banner.tone')}
                    options={TONES.map((value) => ({ value, label: t(`admin.banner.tones.${value}`) }))}
                    value={color ? null : tone}
                    onChange={(next) => {
                      setTone(next);
                      chooseColor(null);
                    }}
                  />
                </Labelled>

                <Labelled label={t('admin.banner.color')}>
                  <div role="radiogroup" aria-label={t('admin.banner.color')} className="flex flex-wrap gap-2">
                    <button type="button" role="radio" aria-checked={color === null} aria-label={t('admin.banner.toneColor')}
                      title={t('admin.banner.toneColor')} onClick={() => chooseColor(null)}
                      className={cn('grid h-10 w-10 place-items-center rounded-full border-2 text-fg-muted',
                        color === null ? 'border-primary' : 'border-line hover:border-line-strong')}>
                      <Icon name="close" size={16} />
                    </button>
                    {SWATCHES.map((swatch) => (
                      <button key={swatch} type="button" role="radio" aria-checked={color === swatch} aria-label={swatch}
                        title={swatch} onClick={() => chooseColor(swatch)}
                        className={cn('grid h-10 w-10 place-items-center rounded-full border-2',
                          color === swatch ? 'border-fg' : 'border-transparent hover:border-line-strong')}>
                        <span className="h-8 w-8 rounded-full" style={{ background: swatch }} />
                      </button>
                    ))}
                  </div>
                </Labelled>

                <Field
                  label={t('admin.banner.hex')}
                  value={hex}
                  placeholder="#1E4E8C"
                  dir="ltr"
                  className="font-mono uppercase"
                  wrapperClassName="max-w-60"
                  maxLength={7}
                  spellCheck={false}
                  onChange={(event) => {
                    const next = `#${event.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)}`.toUpperCase();
                    const value = next === '#' ? '' : next;
                    setHex(value);
                    setColor(isHexColor(value) ? value : null);
                  }}
                  trailing={isHexColor(hex) ? <span className="me-1.5 h-6 w-6 rounded-full border border-line" style={{ background: hex }} /> : null}
                  error={hexValid ? null : t('admin.errors.hex', { example: '#1E4E8C' })}
                />

                <Labelled label={t('admin.banner.logo')}>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3.5">
                    {imageUrl ? (
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="" className="h-12 w-12 object-contain" />
                      </span>
                    ) : null}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-fg">{imageUrl ? t('admin.banner.logoSet') : t('admin.banner.logoNone')}</span>
                      <span className="text-sm text-fg-muted">{t('admin.banner.logoHint', { n: fmt.number(2) })}</span>
                    </span>
                    <span className="flex gap-2">
                      {imageUrl ? (
                        <Button label={t('admin.banner.remove')} variant="ghost" size="sm" onClick={() => setImageUrl(null)} />
                      ) : null}
                      <Button label={imageUrl ? t('admin.banner.change') : t('admin.banner.upload')} variant="secondary" size="sm"
                        icon="upload" loading={uploading} disabled={!online} onClick={() => fileInput.current?.click()} />
                    </span>
                    <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={(event) => {
                        void upload(event.target.files?.[0]);
                        event.target.value = '';
                      }} />
                  </div>
                </Labelled>

                {!imageUrl ? (
                  <Labelled label={t('admin.banner.icon')}>
                    <div role="radiogroup" aria-label={t('admin.banner.icon')} className="flex flex-wrap gap-2">
                      <IconChoice selected={icon === null} onClick={() => setIcon(null)} label={t('admin.banner.iconAuto')}>
                        <span className={cn('text-xs font-semibold', icon === null ? 'text-primary' : 'text-fg-muted')}>
                          {t('admin.banner.auto')}
                        </span>
                      </IconChoice>
                      {BANNER_ICONS.map((name) => (
                        <IconChoice key={name} selected={icon === name} onClick={() => setIcon(name)} label={name}>
                          <Icon name={name} size={20} className={icon === name ? 'text-primary' : 'text-fg-muted'} />
                        </IconChoice>
                      ))}
                    </div>
                  </Labelled>
                ) : null}
              </Card>
            </Section>

            {/* ---- reach ---- */}
            <Section title={t('admin.banner.reach')}>
              <Card className="flex flex-col gap-5">
                <Labelled label={t('admin.banner.audienceLabel')}>
                  <ChipGroup<PlatformAudience>
                    label={t('admin.banner.audienceLabel')}
                    options={AUDIENCES.map((value) => ({ value, label: t(`admin.banner.audience.${value}`) }))}
                    value={audience}
                    onChange={setAudience}
                  />
                </Labelled>
                <Labelled label={t('admin.banner.buildingLabel')}>
                  <button type="button" onClick={() => setPickBuilding(true)}
                    className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-start transition-colors hover:bg-surface-sunken">
                    <Icon name="building" size={20} className="text-fg-muted" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                      {buildingId ? building?.name ?? '…' : t('admin.banner.everyBuilding')}
                    </span>
                    <Icon name="chevronDown" size={18} className="text-fg-subtle" />
                  </button>
                </Labelled>
              </Card>
            </Section>

            {/* ---- which apps (V037) ---- */}
          <Section title={t('console.apps.target.title')} description={t('console.apps.target.bannerHint')}>
            <Card>
              <AppTargetEditor value={apps} onChange={setApps} />
            </Card>
          </Section>

          {/* ---- timing ---- */}
            <Section title={t('admin.banner.timing')}>
              <Card className="flex flex-col gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <DateField label={t('admin.banner.starts')} value={startDate} onChange={setStartDate}
                    placeholder={t('admin.banner.startsNow')} />
                  <DateField label={t('admin.banner.ends')} value={endDate} onChange={setEndDate}
                    placeholder={t('admin.banner.noEnd')} />
                </div>
                {!windowValid ? <Callout tone="danger" title={t('admin.errors.window')} /> : null}
                {windowValid && !endInFuture ? <Callout tone="danger" title={t('admin.errors.endPast')} /> : null}
                <Field
                  label={t('admin.banner.priority', { min: fmt.number(0), max: fmt.number(100) })}
                  hint={t('admin.banner.priorityHint')}
                  value={priority}
                  onChange={(event) => setPriority(digitsOnly(event.target.value).slice(0, 3))}
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={3}
                  wrapperClassName="max-w-60"
                />
              </Card>
            </Section>

            <Card className="flex flex-col gap-4">
              <Switch label={t('admin.banner.active')} description={t('admin.banner.activeHint')} checked={active} onChange={setActive} />
              <Divider />
              <Switch label={t('admin.banner.dismissible')} description={t('admin.banner.dismissibleHint')}
                checked={dismissible} onChange={setDismissible} />
            </Card>

            {error ? <Callout tone="danger" title={error} /> : null}
          </div>
        </div>

        {/* ---- the bar that stays in reach ---- */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2.5 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-card lg:border lg:px-5">
          <ProblemsNote problems={problems} onLanguage={setLang} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" label={t('common.cancel')} onClick={() => router.push(back)} />
            <Button type="submit" icon="check" label={existing ? t('common.save') : t('admin.banner.publish')}
              loading={busy} disabled={!canSave} />
          </div>
        </div>
      </form>

      <BuildingPicker
        open={pickBuilding}
        onClose={() => setPickBuilding(false)}
        value={buildingId}
        onPick={setBuildingId}
        title={t('admin.banner.buildingLabel')}
        everyLabel={t('admin.banner.everyBuilding')}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title={t('admin.banner.deleteTitle')}
        body={t('admin.banner.deleteBody')}
        confirmLabel={t('common.delete')}
        tone="danger"
        loading={busy}
      />
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-fg">{label}</p>
      {children}
    </div>
  );
}

function IconChoice({
  selected, onClick, label, children,
}: { selected: boolean; onClick(): void; label: string; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} aria-label={label} title={label} onClick={onClick}
      className={cn('grid h-11 min-w-11 place-items-center rounded-xl border px-2 transition-colors',
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:bg-surface-sunken')}>
      {children}
    </button>
  );
}
