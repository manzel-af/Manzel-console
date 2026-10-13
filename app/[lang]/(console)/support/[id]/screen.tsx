'use client';

/**
 * One support conversation, the operator's side (the app's support/[id].tsx).
 *
 * The thread plus who it is with: name, phone, how long they have had an
 * account, which buildings and in what role — support that cannot see the
 * person cannot help them. Only the operator holding the thread may answer
 * it; an unclaimed one is claimed here, or simply answered, which claims it.
 * "Hand over" gives it to another operator with the whole history intact.
 *
 * Replies arrive by themselves: this conversation's own Realtime channel,
 * open while the page is. Being here is also the server's "watching"
 * heartbeat, which stops a push for a message already on this screen.
 */

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';

import { Attachment } from '@/components/attachment';
import { Button, ButtonLink, IconButton } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { Badge, Callout, LiveDot, SkeletonRows } from '@/components/ui/feedback';
import { TextArea } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/toast';
import {
  SUPPORT_BUCKET, claimThread, closeThread, markThreadRead, sendMessage, supportKeys, transferThread,
  uploadSupportFile, useOperators, useSupportThread, type OutgoingAttachment,
} from '@/lib/api/support';
import { useAuth } from '@/lib/auth/auth';
import { cn } from '@/lib/cn';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useT } from '@/lib/i18n/client';
import { getSupabase } from '@/lib/supabase/client';
import { dotted, telHref } from '@/lib/text';

import { SUPPORT_STATUS_TONE } from '../frame';

const MAX_FILE = 10 * 1024 * 1024;

export function ConversationScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = use(params);
  const t = useT();
  const href = useHref();
  const fmt = useFormat();
  const toast = useToast();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const errorText = useErrorText();
  const detail = useSupportThread(threadId);
  const operators = useOperators();

  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<OutgoingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferTo, setTransferTo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Being here is reading it, and the server's "watching" heartbeat.
  useEffect(() => {
    const beat = () => void markThreadRead(threadId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin', 'support'] }));
    beat();
    const timer = window.setInterval(beat, 20_000);
    return () => window.clearInterval(timer);
  }, [threadId, queryClient]);

  // This conversation's own channel, so a reply lands without a refresh.
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`console-thread:${threadId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${threadId}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey: supportKeys.thread(threadId) });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  const thread = detail.data?.thread;
  const person = detail.data?.person ?? null;
  const messages = detail.data?.messages ?? [];
  const unclaimed = Boolean(thread) && !thread?.assigned_to;
  const someoneElses = Boolean(thread?.assigned_to) && thread?.mine === false;
  const closed = thread?.status === 'resolved' || thread?.status === 'closed';
  const canWrite = !busy && !someoneElses;

  // The newest message in view, as in any messenger.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end', behavior: messages.length > 0 ? 'smooth' : 'auto' });
  }, [messages.length]);

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: supportKeys.thread(threadId) });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
      if (done) toast.show(done);
      return true;
    } catch (caught) {
      setError(errorText(caught));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!body.trim() && !attachment) return;
    const ok = await run(() => sendMessage(threadId, body, attachment));
    if (ok) {
      setBody('');
      setAttachment(null);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file || !auth.user) return;
    if (file.size > MAX_FILE) {
      setError(t('console.support.tooBig'));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      setAttachment(await uploadSupportFile(file, auth.user.id));
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (detail.isPending) return <SkeletonRows rows={5} />;
  if (detail.error || !thread) return <Callout tone="danger" title={t('support.errors.notFound')} />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start gap-3">
          <Link href={href('/support')} className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-sunken lg:hidden"
            aria-label={t('console.nav.back')}>
            <Icon name="back" size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-fg">{thread.subject}</h2>
            <p className="text-sm text-fg-muted">
              {thread.assigned_name ? t('support.withWho', { name: thread.assigned_name }) : t('support.waiting')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {live ? <span className="inline-flex items-center gap-1.5 text-xs text-success"><LiveDot />{t('console.support.live')}</span> : null}
            <Badge tone={SUPPORT_STATUS_TONE[thread.status]} label={t(`support.status.${thread.status}`)} />
            <Badge label={t(`support.topics.${thread.topic}`)} />
          </div>
        </div>

        {/* Who support is talking to. */}
        {person ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-sunken p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-fg-subtle">{t('support.whoIsThis')}</p>
              <p className="font-semibold text-fg">{person.name}</p>
              <p className="text-sm text-fg-muted">
                <bdi dir="ltr">{person.phone}</bdi>
                {' · '}{t('support.memberSince', { date: fmt.date(person.since, 'medium') })}
              </p>
              {person.buildings.length > 0 ? (
                <p className="mt-1 text-sm text-fg-muted">
                  {person.buildings.map((building) => dotted(
                    building.name, t(`roles.${building.role}`), building.flat ? `${t('units.one')} ${building.flat}` : null,
                  )).join(' — ')}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <ButtonLink href={telHref(person.phone)} size="sm" variant="secondary" icon="phone" label={t('manage.admin.call')} />
              <ButtonLink href={href(`/people/${person.id}`)} size="sm" variant="ghost" icon="user" label={t('console.support.person')} />
            </div>
          </div>
        ) : null}

        {someoneElses ? (
          <Callout tone="warning" icon="lock" title={t('support.heldByOther', { name: thread.assigned_name ?? '' })}
            body={t('support.heldByOtherBody')} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {unclaimed ? (
            <Button icon="check" label={t('support.claim')} loading={busy} onClick={() => void run(() => claimThread(threadId), t('support.claimed'))} />
          ) : null}
          {thread.mine ? (
            <>
              <Button variant="secondary" icon="users" label={t('support.transfer')} disabled={busy}
                onClick={() => { setNote(''); setTransferTo(null); setTransferring(true); }} />
              {!closed ? (
                <Button variant="secondary" icon="check" label={t('support.resolve')} disabled={busy} onClick={() => setClosing(true)} />
              ) : null}
            </>
          ) : null}
        </div>
      </Card>

      {/* The conversation. */}
      <Card className="flex flex-col gap-3 bg-surface-sunken/40">
        <div className="flex max-h-[60dvh] min-h-48 flex-col gap-3 overflow-y-auto pe-1">
          {messages.map((message) => {
            const mine = message.author_id === auth.user?.id;
            const who = message.from_staff ? (mine ? null : t('support.fromSupport')) : message.author_name;
            return (
              <div key={message.id} className={cn('flex max-w-[86%] flex-col gap-1', mine ? 'self-end items-end' : 'self-start items-start')}>
                {who ? <span className="px-1 text-xs text-fg-subtle">{who}</span> : null}
                <div className={cn('flex flex-col gap-2 rounded-2xl px-4 py-2.5 shadow-card',
                  mine ? 'rounded-ee-md bg-primary text-fg-on-primary' : message.from_staff ? 'rounded-es-md bg-accent-soft text-fg' : 'rounded-es-md bg-surface text-fg')}>
                  {message.body ? <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p> : null}
                  {message.attachment_path ? (
                    <Attachment bucket={SUPPORT_BUCKET} path={message.attachment_path} type={message.attachment_type}
                      durationMs={message.attachment_duration_ms} />
                  ) : null}
                </div>
                <span className="px-1 text-[0.7rem] text-fg-subtle">{fmt.dateTime(message.created_at)}</span>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>

        {error ? <Callout tone="danger" title={error} /> : null}

        {/* Writing. */}
        {someoneElses ? null : (
          <form
            className="flex flex-col gap-2 border-t border-line pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {attachment ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
                <Icon name={attachment.type.startsWith('image/') ? 'image' : 'download'} size={16} className="text-fg-muted" />
                <span className="max-w-56 truncate">{attachment.path.split('/').pop()}</span>
                <button type="button" aria-label={t('common.remove')} onClick={() => setAttachment(null)}
                  className="grid h-6 w-6 place-items-center rounded-md text-fg-subtle hover:bg-surface-sunken hover:text-fg">
                  <Icon name="close" size={14} />
                </button>
              </span>
            ) : null}
            <div className="flex items-end gap-2">
              <input ref={fileInput} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(event) => void pick(event.target.files?.[0])} />
              <IconButton icon="image" label={t('console.support.attach')} variant="secondary" disabled={!canWrite || uploading}
                onClick={() => fileInput.current?.click()} />
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={t('support.reply')}
                aria-label={t('support.reply')}
                disabled={!canWrite}
                className="max-h-40 min-h-10 flex-1 resize-none rounded-field border border-line bg-surface px-3.5 py-2 text-fg shadow-card outline-none [field-sizing:content] focus:border-primary focus:ring-3 focus:ring-primary/20"
              />
              <IconButton icon="send" label={t('support.send')} variant="primary" type="submit"
                disabled={!canWrite || uploading || (!body.trim() && !attachment)} />
            </div>
            <p className="hidden text-xs text-fg-subtle sm:block">{t('console.support.enterHint')}</p>
          </form>
        )}
      </Card>

      <Dialog
        open={transferring}
        onClose={() => setTransferring(false)}
        dismissible={!busy}
        title={t('support.transferTitle')}
        description={t('support.transferBody')}
        footer={(
          <>
            <Button variant="ghost" label={t('common.cancel')} onClick={() => setTransferring(false)} disabled={busy} />
            <Button icon="users" label={t('support.transfer')} loading={busy} disabled={!transferTo}
              onClick={async () => {
                const ok = await run(() => transferThread(threadId, transferTo!, note), t('support.transferred'));
                if (ok) setTransferring(false);
              }} />
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <div role="radiogroup" className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line">
            {(operators.data ?? []).filter((operator) => !operator.is_me).map((operator) => {
              const chosen = transferTo === operator.profile_id;
              return (
                <button key={operator.profile_id} type="button" role="radio" aria-checked={chosen}
                  onClick={() => setTransferTo(operator.profile_id)}
                  className={cn('flex items-center gap-3 px-4 py-3 text-start', chosen ? 'bg-primary-soft' : 'hover:bg-surface-sunken')}>
                  <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', chosen ? 'border-primary' : 'border-line-strong')}>
                    {chosen ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fg">{operator.full_name}</span>
                    <span className="block text-sm text-fg-muted"><bdi dir="ltr">{operator.phone}</bdi></span>
                  </span>
                </button>
              );
            })}
          </div>
          <TextArea label={t('support.transferNote')} hint={t('support.transferNoteHint')} rows={2} maxLength={2000}
            value={note} onChange={(event) => setNote(event.target.value)} />
          {error ? <Callout tone="danger" title={error} /> : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={closing}
        onClose={() => setClosing(false)}
        onConfirm={async () => {
          const ok = await run(() => closeThread(threadId, true), t('support.resolved'));
          if (ok) setClosing(false);
        }}
        title={t('support.resolveTitle')}
        body={t('support.resolveBody')}
        confirmLabel={t('support.resolve')}
        loading={busy}
      />
    </div>
  );
}
