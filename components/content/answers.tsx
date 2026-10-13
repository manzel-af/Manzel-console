'use client';

/**
 * Who answered a banner's or a notification's question, and what (V036, the
 * app's admin/answers.tsx).
 *
 * For choices, how many chose each — as a share of everyone who chose — and
 * then every answer, newest first: the person (a click opens them), their
 * phone and buildings, what they chose or wrote, whether they answered inside
 * the notification or in the app, when, and whether they changed it. All in
 * the console's language; the question was written in all three.
 *
 * Nothing rings when someone answers: while this is open the list looks
 * again every half minute (useAdminAnswers), and Refresh looks at once.
 */

import { Badge, Callout, EmptyState, ProgressBar, SkeletonRows } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Card, PageHeader, Section } from '@/components/ui/surfaces';
import { DataTable, useShowMore, type Column } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminAnswers, type AnswersOf } from '@/lib/api/admin';
import { asQuestion, choiceText, pick, type ContentQuestion } from '@/lib/content';
import { downloadCsv, stamp } from '@/lib/csv';
import { useErrorText } from '@/lib/errors';
import { useFormat } from '@/lib/format/use-format';
import { useHref, useI18n } from '@/lib/i18n/client';
import type { AdminPlatformAnswers } from '@/lib/supabase/database.types';

type Answer = AdminPlatformAnswers['answers'][number];

export function AnswersView({ of, back, backLabel }: { of: AnswersOf; back: string; backLabel: string }) {
  const { t, language } = useI18n();
  const fmt = useFormat();
  const href = useHref();
  const toast = useToast();
  const errorText = useErrorText();
  const answers = useAdminAnswers(of);
  const data = answers.data;
  const question = asQuestion(data?.question);
  const list = useShowMore(data?.answers ?? [], 50);
  const subtitle = 'announcementId' in of ? t('content.answers.forBanner') : t('content.answers.forNotification');

  /** What they chose, in the console's language — or a choice the question no longer offers. */
  const answerText = (answer: Answer) => (answer.choice === null
    ? answer.answer ?? ''
    : choiceText(question, answer.choice, language) || t('content.answers.choiceGone', { n: fmt.number(answer.choice + 1) }));
  const changed = (answer: Answer) => Date.parse(answer.updated_at) - Date.parse(answer.created_at) > 1000;
  const viaLabel = (answer: Answer) => (answer.via === 'notification'
    ? t('content.answers.viaNotification')
    : t('content.answers.viaApp'));

  const exportCsv = () => {
    const rows = data?.answers ?? [];
    downloadCsv(`answers-${stamp()}`, rows, [
      { header: t('console.list.name'), value: (row) => row.full_name },
      { header: t('console.list.phone'), value: (row) => row.phone },
      { header: t('console.list.buildings'), value: (row) => row.buildings },
      { header: t('console.answers.answer'), value: answerText },
      { header: t('console.answers.where'), value: viaLabel },
      { header: t('content.answers.changed'), value: (row) => (changed(row) ? t('console.list.yes') : '') },
      { header: t('console.list.when'), value: (row) => fmt.dateTime(row.updated_at) },
    ]);
    toast.show(t('console.list.exported', { n: fmt.number(rows.length) }));
  };

  const header = (
    <PageHeader
      title={t('content.answers.title')}
      subtitle={subtitle}
      back={back}
      backLabel={backLabel}
      actions={data ? (
        <>
          <Button variant="secondary" icon="sync" label={t('console.shell.refresh')} loading={answers.isFetching}
            onClick={() => void answers.refetch()} />
          <Button variant="secondary" icon="download" label={t('console.list.export')} disabled={data.answers.length === 0}
            onClick={exportCsv} />
        </>
      ) : null}
    />
  );

  if (answers.isLoading) return <>{header}<SkeletonRows rows={6} /></>;
  if (!data) {
    return (
      <>
        {header}
        <EmptyState icon="chat" title={answers.error ? errorText(answers.error) : t('admin.errors.notFound')} />
      </>
    );
  }

  const choiceTotal = data.counts.reduce((sum, entry) => sum + entry.count, 0);

  const columns: Column<Answer>[] = [
    {
      key: 'person',
      header: t('console.list.name'),
      sort: (row) => row.full_name ?? '',
      cell: (row) => <Person answer={row} />,
    },
    {
      key: 'answer',
      header: t('console.answers.answer'),
      cell: (row) => <p className="max-w-md whitespace-pre-line wrap-break-word">{answerText(row)}</p>,
    },
    {
      key: 'via',
      header: t('console.answers.where'),
      hideBelow: 'lg',
      sort: (row) => row.via,
      cell: (row) => <Via answer={row} label={viaLabel(row)} changed={changed(row)} />,
    },
    {
      key: 'when',
      header: t('console.list.when'),
      align: 'end',
      sort: (row) => Date.parse(row.updated_at),
      cell: (row) => <time dateTime={row.updated_at} title={fmt.dateTime(row.updated_at)} className="whitespace-nowrap text-fg-muted">{fmt.relative(row.updated_at)}</time>,
    },
  ];

  return (
    <>
      {header}
      {answers.error ? <Callout tone="danger" title={errorText(answers.error)} className="mb-5" /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        {/* ---- the question, and how many answered ---- */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-24">
          <Card className="flex flex-col gap-1.5">
            {question ? (
              <p className="font-semibold text-fg">{pick(question.prompt, language)}</p>
            ) : (
              <p className="text-fg-muted">{t('content.answers.noQuestion')}</p>
            )}
            <p className="text-sm text-fg-muted">{t('content.answers.total', { n: fmt.number(data.total) })}</p>
          </Card>

          {question?.kind === 'choice' && choiceTotal > 0 ? (
            <Section title={t('content.answers.choices')}>
              <Card className="flex flex-col gap-4">
                <ChoiceShares question={question} counts={data.counts} total={choiceTotal} />
              </Card>
            </Section>
          ) : null}
        </div>

        {/* ---- every answer ---- */}
        {data.answers.length === 0 ? (
          <Card><EmptyState icon="chat" title={t('content.answers.empty')} body={t('content.answers.emptyBody')} /></Card>
        ) : (
          <Section title={t('content.answers.people', { n: fmt.number(data.total) })}
            description={data.answers.length < data.total
              ? t('content.answers.capped', { shown: fmt.number(data.answers.length), n: fmt.number(data.total) })
              : undefined}>
            <DataTable
              rows={list.visible}
              columns={columns}
              rowKey={(row) => row.id}
              rowHref={(row) => href(`/people/${row.profile_id}`)}
              caption={t('content.answers.title')}
              mobile={(row) => (
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1"><Person answer={row} /></div>
                    <span className="shrink-0 text-xs text-fg-subtle">{fmt.relative(row.updated_at)}</span>
                  </div>
                  <p className="whitespace-pre-line wrap-break-word text-fg">{answerText(row)}</p>
                  <Via answer={row} label={viaLabel(row)} changed={changed(row)} />
                </div>
              )}
            />
            {list.more ? (
              <Button variant="secondary" label={t('content.answers.more')} className="self-center" onClick={list.showMore} />
            ) : null}
          </Section>
        )}
      </div>
    </>
  );
}

function Person({ answer }: { answer: Answer }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-semibold text-fg">{answer.full_name ?? '—'}</span>
      {answer.phone || answer.buildings ? (
        <span className="truncate text-xs text-fg-muted">
          {answer.phone ? <bdi dir="ltr">{answer.phone}</bdi> : null}
          {answer.phone && answer.buildings ? ' · ' : null}
          {answer.buildings}
        </span>
      ) : null}
    </span>
  );
}

function Via({ answer, label, changed }: { answer: Answer; label: string; changed: boolean }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge tone={answer.via === 'notification' ? 'primary' : 'neutral'} icon={answer.via === 'notification' ? 'bell' : 'phone'}
        label={label} />
      {changed ? <Badge icon="edit" label={t('content.answers.changed')} /> : null}
    </span>
  );
}

/** Each choice, its count and its share of everyone who chose. */
function ChoiceShares({
  question, counts, total,
}: { question: Extract<ContentQuestion, { kind: 'choice' }>; counts: AdminPlatformAnswers['counts']; total: number }) {
  const { t, language } = useI18n();
  const fmt = useFormat();
  return (
    <>
      {question.choices.map((choice, index) => {
        const count = counts.find((entry) => entry.choice === index)?.count ?? 0;
        const share = count / total;
        return (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 font-medium text-fg">{pick(choice, language)}</span>
              <span className="font-semibold tabular-nums text-fg">{fmt.number(count)}</span>
              <span className="text-xs text-fg-muted">{t('content.answers.share', { n: fmt.number(Math.round(share * 100)) })}</span>
            </div>
            <ProgressBar value={share} />
          </div>
        );
      })}
    </>
  );
}
