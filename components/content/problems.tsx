'use client';

/**
 * What still stops a banner or a notification from going out, in words (the
 * app's components/admin/content-problems.tsx).
 *
 * contentProblems() is the database's own rules (V036); this says them the
 * way the operator fixes them — one language at a time ("Pashto: title,
 * button 2"), then what belongs to no language ("Button 1: a link starting
 * with https://"). The form's main button stays off until nothing is left,
 * and this sits beside it saying why; a click opens the first language that
 * still needs something.
 */

import { useCallback } from 'react';

import { Icon } from '@/components/ui/icon';
import { CONTENT_LANGUAGES, CONTENT_LIMITS, type ContentLanguage, type ContentProblem } from '@/lib/content';
import { useFormat } from '@/lib/format/use-format';
import { useI18n } from '@/lib/i18n/client';

type LanguageProblem = Extract<ContentProblem, { lang: ContentLanguage }>;

function isLanguageProblem(problem: ContentProblem): problem is LanguageProblem {
  return 'lang' in problem;
}

/** The first language with something missing: where a click on the summary goes. */
export function firstLanguageWithProblems(problems: ContentProblem[]): ContentLanguage | null {
  return CONTENT_LANGUAGES.find((lang) => problems.some((problem) => isLanguageProblem(problem) && problem.lang === lang))
    ?? null;
}

/** contentProblems() as one sentence in the console's language. */
export function useProblemsText() {
  const { t, language } = useI18n();
  const fmt = useFormat();

  return useCallback((problems: ContentProblem[]): string => {
    const comma = language === 'en' ? ', ' : '، ';

    const item = (problem: LanguageProblem): string => {
      switch (problem.code) {
        case 'title': return t('content.problems.title');
        case 'titleLong': return t('content.problems.titleLong');
        case 'body': return t('content.problems.body');
        case 'bodyLong': return t('content.problems.bodyLong');
        case 'buttonLabel': return t('content.problems.buttonLabel', { n: fmt.number(problem.index + 1) });
        case 'prompt': return t('content.problems.prompt');
        case 'choice': return t('content.problems.choice', { n: fmt.number(problem.index + 1) });
      }
    };

    const parts: string[] = [];
    for (const lang of CONTENT_LANGUAGES) {
      const items = [...new Set(problems.filter(isLanguageProblem).filter((problem) => problem.lang === lang).map(item))];
      if (items.length > 0) {
        parts.push(t('content.problems.inLanguage', { language: t(`content.languages.${lang}`), items: items.join(comma) }));
      }
    }
    for (const problem of problems) {
      if (problem.code === 'buttonUrl') {
        parts.push(t('content.problems.buttonUrl', { n: fmt.number(problem.index + 1) }));
      } else if (problem.code === 'tooManyButtons') {
        parts.push(t('content.problems.tooManyButtons'));
      } else if (problem.code === 'choiceCount') {
        parts.push(t('content.problems.choiceCount', {
          min: fmt.number(CONTENT_LIMITS.minChoices),
          max: fmt.number(CONTENT_LIMITS.maxChoices),
        }));
      }
    }
    return t('content.problems.missing', { items: parts.join(' · ') });
  }, [t, fmt, language]);
}

/** The line beside a form's main button while it is off for its content; nothing once complete. */
export function ProblemsNote({
  problems, onLanguage,
}: {
  problems: ContentProblem[];
  /** Opens a language's tab: the first one still missing something. */
  onLanguage?(lang: ContentLanguage): void;
}) {
  const describe = useProblemsText();
  if (problems.length === 0) return null;

  const first = firstLanguageWithProblems(problems);
  const text = (
    <>
      <Icon name="edit" size={14} className="mt-0.5 text-warning" />
      <span className="min-w-0 flex-1">{describe(problems)}</span>
    </>
  );
  const classes = 'flex items-start gap-2 text-start text-xs text-fg-muted';
  return first && onLanguage ? (
    <button type="button" onClick={() => onLanguage(first)} className={`${classes} rounded-md hover:text-fg`}>{text}</button>
  ) : <p className={classes} role="status">{text}</p>;
}
