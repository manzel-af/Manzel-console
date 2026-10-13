'use client';

/**
 * Feature requests and reports from the app (V026, the app's admin/ideas.tsx).
 *
 * Move one along and the person who asked hears about it — that is the point
 * of letting them ask. A target date, once set, is shown to them, so it is a
 * promise; leave it empty rather than guess. Turning something down requires
 * a reason, because "declined" with no words is worse than no answer.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Attachment } from '@/components/attachment';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Badge, Callout, EmptyState, SkeletonRows } from '@/components/ui/feedback';
import { Field, Segmented, TextArea } from '@/components/ui/form';
import { Card, PageHeader } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  REQUEST_STATUS_TONE, SUPPORT_BUCKET, decideIdea, useIdeasDesk, type IdeaKind,
} from '@/lib/api/support';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import type { AdminPlatformRequest, PlatformRequestStatus } from '@/lib/supabase/database.types';
import { dotted, telHref } from '@/lib/text';

const STATUSES: PlatformRequestStatus[] = ['new', 'reviewing', 'planned', 'in_progress', 'done', 'declined'];

export function IdeasScreen() {
  const t = useT();
  const href = useHref();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fmt = useFormat();
  const errorText = useErrorText();

  const [tab, setTab] = useState<IdeaKind>('feature');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const ideas = useIdeasDesk(tab, onlyOpen ? 'open' : 'all');
  const rows = ideas.data ?? [];

  const [editing, setEditing] = useState<AdminPlatformRequest | null>(null);
  const [status, setStatus] = useState<PlatformRequestStatus>('reviewing');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsNote = status === 'declined' && note.trim().length < 3;

  const open = (idea: AdminPlatformRequest) => {
    setStatus(idea.status === 'new' ? 'reviewing' : idea.status);
    setTarget(idea.target_date ?? '');
    setNote(idea.decision_note ?? '');
    setError(null);
    setEditing(idea);
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await decideIdea({ id: editing.id, status, targetDate: target || null, note: note.trim() || null });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ideas'] });
      toast.show(t('admin.ideas.updated'));
      setEditing(null);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('admin.ideas.title')} subtitle={t('admin.ideas.subtitle')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented<IdeaKind>
          value={tab}
          onChange={setTab}
          label={t('admin.ideas.title')}
          options={[
            { value: 'feature', label: t('ideas.tabs.feature'), icon: 'bolt' },
            { value: 'report', label: t('ideas.tabs.report'), icon: 'alert' },
            { value: 'all', label: t('common.all'), icon: 'chart' },
          ]}
        />
        <Segmented<'open' | 'all'>
          value={onlyOpen ? 'open' : 'all'}
          onChange={(value) => setOnlyOpen(value === 'open')}
          label={t('console.list.status')}
          options={[
            { value: 'open', label: t('admin.ideas.open') },
            { value: 'all', label: t('admin.ideas.everything') },
          ]}
        />
      </div>

      {ideas.error ? <Callout tone="danger" title={errorText(ideas.error)} className="mb-4" /> : null}

      {ideas.isPending ? <SkeletonRows rows={4} /> : rows.length === 0 ? (
        <EmptyState icon="bolt" title={t('admin.ideas.empty')} body={t('admin.ideas.emptyBody')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((idea) => (
            <Card key={idea.id} as="article" className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-fg">{idea.title}</h2>
                  <p className="text-sm text-fg-muted">
                    {dotted(t(`ideas.kinds.${idea.kind}`), t(`ideas.categories.${idea.category}`), fmt.relative(idea.created_at))}
                  </p>
                </div>
                <Badge tone={REQUEST_STATUS_TONE[idea.status]} label={t(`ideas.status.${idea.status}`)} />
              </div>
              <p className="whitespace-pre-wrap text-fg">{idea.body}</p>
              {idea.attachment_path ? (
                <Attachment bucket={SUPPORT_BUCKET} path={idea.attachment_path} type={idea.attachment_type ?? 'image/jpeg'} />
              ) : null}
              {idea.target_date ? (
                <p className="text-sm text-fg-muted">{t('admin.ideas.target')}: {fmt.date(idea.target_date, 'medium')}</p>
              ) : null}
              {idea.decision_note ? (
                <blockquote className="rounded-xl border-s-4 border-line-strong bg-surface-sunken px-3 py-2 text-sm text-fg-muted">
                  {idea.decision_note}
                </blockquote>
              ) : null}
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate text-fg-muted">{dotted(idea.person_name, idea.building_name)}</p>
                  {idea.decided_name ? (
                    <p className="truncate text-xs text-fg-subtle">
                      {t('admin.ideas.lastBy', { name: idea.decided_name, when: idea.decided_at ? fmt.relative(idea.decided_at) : '' })}
                    </p>
                  ) : null}
                </div>
                {idea.person_phone ? (
                  <ButtonLink href={telHref(idea.person_phone)} size="sm" variant="ghost" icon="phone" label={t('manage.admin.call')} />
                ) : null}
                <ButtonLink href={href(`/people/${idea.profile_id}`)} size="sm" variant="ghost" icon="user" label={t('admin.users.open')} />
                <Button size="sm" icon="edit" label={t('admin.ideas.update')} onClick={() => open(idea)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        dismissible={!busy}
        title={editing?.title ?? ''}
        description={t('admin.ideas.updateBody')}
        footer={(
          <>
            <Button variant="ghost" label={t('common.cancel')} onClick={() => setEditing(null)} disabled={busy} />
            <Button icon="check" label={t('common.save')} loading={busy} disabled={needsNote} onClick={() => void save()} />
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <Segmented<PlatformRequestStatus>
            size="sm"
            value={status}
            onChange={setStatus}
            label={t('console.list.status')}
            options={STATUSES.map((value) => ({ value, label: t(`ideas.status.${value}`) }))}
          />
          <Field type="date" dir="ltr" label={t('admin.ideas.target')} icon="calendar" value={target}
            hint={target ? fmt.date(target, 'long') : t('admin.ideas.targetHint')}
            onChange={(event) => setTarget(event.target.value)} />
          <TextArea label={t('admin.ideas.note')} hint={t('admin.ideas.noteHint')} rows={3} maxLength={500}
            required={status === 'declined'} value={note} onChange={(event) => setNote(event.target.value)} />
          {error ? <Callout tone="danger" title={error} /> : null}
        </div>
      </Dialog>
    </div>
  );
}
