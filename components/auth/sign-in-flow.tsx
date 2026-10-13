'use client';

/**
 * Signing in to the console, one step at a time:
 *
 *   email        → a 6-digit code is emailed (Supabase Auth, the same email the
 *                  app signs in with; accounts are never created here)
 *   code         → the email's code opens an aal1 session
 *   challenge    → the authenticator's code lifts it to aal2
 *   enroll       → the first time: the authenticator is set up, then the same
 *   not-operator → a real account that does not run Manzel: nothing to see
 *
 * The step is worked out from the session, not remembered, so a refresh, a
 * second tab or the back button always lands on the right one.
 *
 * The email step never says whether an address has an account: "if it belongs
 * to an operator, a code is on its way" either way.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Callout } from '@/components/ui/feedback';
import { Field } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { useAuth, useFactors, useIsOperator } from '@/lib/auth/auth';
import { useI18n, useT } from '@/lib/i18n/client';
import { isLocale } from '@/lib/i18n/languages';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';

const PENDING_KEY = 'manzel.console.pendingEmail';
const RESEND_SECONDS = 60;

interface Pending {
  email: string;
  sentAt: number;
}

function readPending(): Pending | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pending;
    // A code is good for minutes, not hours.
    return Date.now() - parsed.sentAt < 30 * 60_000 ? parsed : null;
  } catch {
    return null;
  }
}

function writePending(pending: Pending | null) {
  try {
    if (pending) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Private mode: the step simply starts over on a refresh.
  }
}

/** Only a path inside the console, never another site. */
function safeNext(next: string | null, locale: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && isLocale(next.split('/')[1])) return next;
  return `/${locale}`;
}

export function SignInFlow() {
  const t = useT();
  const { locale } = useI18n();
  const auth = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'), locale);
  const factors = useFactors(Boolean(auth.session));
  const operator = useIsOperator();
  // A code already sent, before a refresh. The server never has one; nor does
  // the first paint differ for it, since the step waits for auth.ready.
  const [pending, setPending] = useState<Pending | null>(() => (typeof window === 'undefined' ? null : readPending()));

  const verified = factors.data?.verified ?? [];

  let step: 'loading' | 'email' | 'code' | 'challenge' | 'enroll' | 'not-operator' | 'done';
  if (!auth.ready) step = 'loading';
  else if (!auth.session) step = pending ? 'code' : 'email';
  else if (factors.isPending) step = 'loading';
  else if (verified.length > 0 && auth.aal !== 'aal2') step = 'challenge';
  else if (operator.isPending) step = 'loading';
  else if (!operator.data) step = 'not-operator';
  else if (verified.length === 0) step = 'enroll';
  else step = 'done';

  useEffect(() => {
    if (step === 'done') router.replace(next);
  }, [step, next, router]);

  if (!supabaseConfigured()) {
    return <Callout tone="danger" title="NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" />;
  }

  switch (step) {
    case 'loading':
    case 'done':
      return <StepLoading label={t('console.auth.checking')} />;
    case 'email':
      return <EmailStep onSent={(sent) => setPending(sent)} />;
    case 'code':
      return (
        <CodeStep
          pending={pending!}
          onResent={(sent) => setPending(sent)}
          onBack={() => {
            writePending(null);
            setPending(null);
          }}
        />
      );
    case 'challenge':
      return <ChallengeStep factorIds={verified.map((factor) => factor.id)} />;
    case 'enroll':
      return <EnrollStep />;
    case 'not-operator':
      return <NotOperatorStep email={auth.user?.email ?? ''} />;
  }
}

function StepLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-fg-muted" aria-busy="true">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function StepHeading({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col gap-1.5 text-center">
      <h1 className="text-xl font-bold text-fg">{title}</h1>
      {body ? <p className="text-sm text-fg-muted">{body}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function EmailStep({ onSent }: { onSent(pending: Pending): void }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
      setError(t('console.auth.invalidEmail'));
      return;
    }
    setSending(true);
    setError(null);
    const { error: failure } = await getSupabase().auth.signInWithOtp({
      email: address,
      // The console never creates an account.
      options: { shouldCreateUser: false },
    });
    setSending(false);
    if (failure) {
      const message = failure.message ?? '';
      if (failure.status === 429 || /rate limit|security purposes|too many/i.test(message)) {
        setError(t('console.auth.rateLimited'));
        return;
      }
      // "Signups not allowed" means the address has no account. Say the same
      // as for one that has: the page must not reveal who signs in here.
      if (!/signup|not allowed|not found|user/i.test(message)) {
        setError(t('authEmail.errors.failed'));
        return;
      }
    }
    const sent = { email: address, sentAt: Date.now() };
    writePending(sent);
    onSent(sent);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <StepHeading title={t('console.auth.title')} body={t('console.auth.body')} />
      <Field
        type="email"
        dir="ltr"
        label={t('console.auth.emailLabel')}
        placeholder="name@example.com"
        autoComplete="email"
        autoFocus
        icon="mail"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
      />
      <Button type="submit" label={sending ? t('console.auth.sending') : t('console.auth.send')} size="lg" full
        loading={sending} icon="send" />
      <p className="text-center text-xs text-fg-subtle">{t('console.auth.phoneOnly')}</p>
    </form>
  );
}

function CodeStep({
  pending, onBack, onResent,
}: {
  pending: Pending;
  onBack(): void;
  onResent(pending: Pending): void;
}) {
  const t = useT();
  const { has } = useI18n();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const wait = Math.max(0, RESEND_SECONDS - Math.floor((now - pending.sentAt) / 1000));

  const verify = useCallback(async (value: string) => {
    setChecking(true);
    setError(null);
    const { error: failure } = await getSupabase().auth.verifyOtp({ email: pending.email, token: value, type: 'email' });
    setChecking(false);
    if (failure) {
      setError(failure.status === 429 ? t('console.auth.rateLimited') : t('console.auth.codeInvalid'));
      return;
    }
    // The session arrives through onAuthStateChange; the flow moves on by itself.
    writePending(null);
  }, [pending.email, t]);

  const resend = async () => {
    setError(null);
    await getSupabase().auth.signInWithOtp({ email: pending.email, options: { shouldCreateUser: false } });
    const sent = { email: pending.email, sentAt: Date.now() };
    writePending(sent);
    onResent(sent);
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) void verify(code);
      }}
    >
      <StepHeading
        title={t('console.auth.sentTitle')}
        body={t('console.auth.sentBody', { email: pending.email })}
      />
      <CodeInput value={code} onChange={setCode} onComplete={verify} label={t('console.auth.codeLabel')}
        error={error} disabled={checking} />
      <Button type="submit" label={checking ? t('console.auth.checking') : t('console.auth.verify')} size="lg" full
        loading={checking} disabled={code.length !== 6} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={onBack} className="font-semibold text-fg-muted hover:text-fg">
          {t('console.auth.changeEmail')}
        </button>
        <button type="button" onClick={resend} disabled={wait > 0}
          className="font-semibold text-primary hover:underline disabled:cursor-default disabled:text-fg-subtle disabled:no-underline">
          {wait > 0 ? t('console.auth.resendIn', { seconds: wait }) : t('console.auth.resend')}
        </button>
      </div>
      {has('console.auth.checkSpam') ? <p className="text-center text-xs text-fg-subtle">{t('console.auth.checkSpam')}</p> : null}
    </form>
  );
}

function ChallengeStep({ factorIds }: { factorIds: string[] }) {
  const t = useT();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (value: string) => {
    setChecking(true);
    setError(null);
    // With a spare authenticator the code may come from either: try each.
    let ok = false;
    for (const factorId of factorIds) {
      const { error: failure } = await getSupabase().auth.mfa.challengeAndVerify({ factorId, code: value });
      if (!failure) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      setChecking(false);
      setError(t('console.mfa.codeInvalid'));
      return;
    }
    await auth.refresh();
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    setChecking(false);
  }, [factorIds, t, auth, queryClient]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) void verify(code);
      }}
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon name="shieldCheck" size={28} />
      </div>
      <StepHeading title={t('console.mfa.title')} body={t('console.mfa.challengeBody')} />
      <CodeInput value={code} onChange={setCode} onComplete={verify} label={t('console.mfa.codeLabel')}
        error={error} disabled={checking} />
      <Button type="submit" label={checking ? t('console.mfa.verifying') : t('console.mfa.verify')} size="lg" full
        loading={checking} disabled={code.length !== 6} />
      <p className="text-center text-xs text-fg-subtle">{t('console.mfa.lostDevice')}</p>
      <SignOutLink />
    </form>
  );
}

interface Enrollment {
  factorId: string;
  qr: string;
  secret: string;
}

/**
 * Sets up the authenticator. A setup left half-done (an unverified factor)
 * is removed first, so going back and forth never piles them up.
 */
export function EnrollStep({ onDone, compact = false }: { onDone?(): void; compact?: boolean }) {
  const t = useT();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const supabase = getSupabase();
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const factor of list?.all ?? []) {
        if (factor.factor_type === 'totp' && factor.status !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      const { data, error: failure } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        // Unique, and what the operator sees in their list of authenticators.
        friendlyName: `Manzel Console ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        issuer: 'Manzel',
      });
      if (failure || !data) {
        setFailed(true);
        return;
      }
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  const verify = useCallback(async (value: string) => {
    if (!enrollment) return;
    setChecking(true);
    setError(null);
    const { error: failure } = await getSupabase().auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code: value });
    if (failure) {
      setChecking(false);
      setError(t('console.mfa.codeInvalid'));
      return;
    }
    await auth.refresh();
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    setChecking(false);
    onDone?.();
  }, [enrollment, t, auth, queryClient, onDone]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) void verify(code);
      }}
    >
      {!compact ? (
        <>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="shieldCheck" size={28} />
          </div>
          <StepHeading title={t('console.mfa.setupTitle')} body={t('console.mfa.setupBody')} />
        </>
      ) : null}

      <ol className="flex flex-col gap-4 text-sm text-fg">
        <li className="flex gap-3">
          <StepNumber n={1} />
          <span className="pt-0.5">{t('console.mfa.step1')}</span>
        </li>
        <li className="flex gap-3">
          <StepNumber n={2} />
          <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
            <span>{t('console.mfa.step2')}</span>
            {failed ? (
              <Callout tone="danger" title={t('errors.generic')} />
            ) : enrollment ? (
              <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white p-4">
                {/* A data URL made by Supabase: the account's own secret, never sent anywhere else. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollment.qr} alt="" width={184} height={184} className="h-46 w-46" />
              </div>
            ) : (
              <div className="grid h-[13.5rem] place-items-center rounded-card border border-line">
                <span className="text-sm text-fg-muted">{t('console.mfa.preparing')}</span>
              </div>
            )}
            {enrollment ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-fg-muted">{t('console.mfa.cantScan')}</span>
                <div className="flex items-center gap-2">
                  <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-surface-sunken px-3 py-2 font-mono text-xs text-fg select-all">
                    {enrollment.secret}
                  </code>
                  <Button size="sm" variant="secondary" icon={copied ? 'check' : 'copy'}
                    label={copied ? t('console.mfa.copied') : t('console.mfa.copyKey')}
                    onClick={() => {
                      void navigator.clipboard?.writeText(enrollment.secret);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }} />
                </div>
              </div>
            ) : null}
          </div>
        </li>
        <li className="flex gap-3">
          <StepNumber n={3} />
          <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
            <span>{t('console.mfa.step3')}</span>
            <CodeInput value={code} onChange={setCode} onComplete={verify} label={t('console.mfa.codeLabel')}
              error={error} disabled={checking || !enrollment} autoFocus={false} />
          </div>
        </li>
      </ol>

      <Button type="submit" label={checking ? t('console.mfa.verifying') : t('console.mfa.enable')} size="lg" full
        loading={checking} disabled={code.length !== 6 || !enrollment} icon="shieldCheck" />
      {!compact ? <SignOutLink /> : null}
    </form>
  );
}

function StepNumber({ n }: { n: number }) {
  const { language } = useI18n();
  const digits = language === 'en' ? String(n) : String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-fg-on-primary">
      {digits}
    </span>
  );
}

function NotOperatorStep({ email }: { email: string }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning-soft text-warning">
        <Icon name="lock" size={26} />
      </div>
      <StepHeading title={t('console.auth.notOperator')} body={t('console.auth.notOperatorBody', { email })} />
      <SignOutLink primary />
    </div>
  );
}

function SignOutLink({ primary = false }: { primary?: boolean }) {
  const t = useT();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    writePending(null);
    await auth.signOut('local');
    setBusy(false);
  };
  if (primary) {
    return <Button label={t('console.auth.useAnother')} variant="secondary" size="lg" full loading={busy} onClick={run} icon="logout" />;
  }
  return (
    <button type="button" onClick={run} disabled={busy}
      className="mx-auto text-sm font-semibold text-fg-muted hover:text-fg">
      {t('console.auth.useAnother')}
    </button>
  );
}
