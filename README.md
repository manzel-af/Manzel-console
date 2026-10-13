# Manzel Console

The web console for the people who run Manzel: building requests, buildings,
people, the support desk, ideas and reports, banners and notifications, the
platform fee, store-review access, calls, settings, the activity log, app
versions, and alerts. It replaces the operator screens of the mobile app.

- **Address:** `https://console.manzel.af` (Vercel; DNS on Vercel).
- **Who can sign in:** platform operators only — an email code, then a code
  from an authenticator app. Everyone else is turned away after the first
  step.
- **Languages:** Dari (default), Pashto, English — right to left where they
  are, with the app's own words.
- **Installs as an app** (PWA) on a desk or a phone, and shows alerts as
  notifications.

## How it works

- Next.js 16.4 (Turbopack, Cache Components), React 19, Tailwind 4,
  supabase-js and TanStack Query.
- `app/[lang]` is the root layout: `/fa`, `/ps`, `/en`. `proxy.ts` sends a
  path without a language to the operator's (cookie, then browser, then Dari).
- Every page is a server `page.tsx` (its title) and a client `screen.tsx`.
  All data is read **in the browser, with the operator's own session**: the
  console holds only the project's public URL and anon key, and the database
  checks everything (RLS and the `admin_*` functions, which require an
  operator who used their authenticator — `aal2`, V037).
- `components/shell` is the frame: the gate (session + aal2 + authenticator +
  operator), the sidebar with live counts, the top bar, the PWA manager and
  the live alert feed.
- `lib/api/*` is the data layer, ported from the app with the same names.
- Words: the app's (`lib/i18n/app`, copied by `npm run sync`) plus the
  console's own under `console.` (`lib/i18n/console`, added with
  `node scripts/add-keys.mjs words.json` — all three languages at once).

## Working on it

```bash
npm install
cp .env.example .env.local   # then fill in the two public values
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run check` | `next typegen`, TypeScript, ESLint and the words check — run before every commit |
| `npm run sync` | copies the app's words, types, formats, content rules and icons (`../Manzel`) |
| `npm run icons` | makes the app icons from the brand mark |
| `npm run build` | the production build |

Rules that keep it right in three languages: no letter-spacing or capitals on
Dari/Pashto text; numbers through `fmt.number`; phone numbers, codes and
versions in `<bdi dir="ltr">` or `isolate()`; `rtl:`/`ltr:` follow the nearest
`dir` (redefined in `globals.css`). React lint is the compiler set: never set
state synchronously in an effect.

## Deploying on Vercel

1. **Import the repository** in Vercel (Framework: Next.js; the defaults are
   right: `npm run build`, output `.next`).
2. **Environment variables** (Project → Settings → Environment Variables,
   for Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://potalyqllvaqcybjscxy.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon (public) key — the same one the app ships |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the public half of the Web Push key pair (below) |

   Never add the service-role key, the SMTP password or the VAPID private key
   here. The console needs none of them.
3. **Domain:** Project → Settings → Domains → add `console.manzel.af`. The DNS
   is on Vercel, so the record is made for you.
4. **Supabase Auth** (Dashboard → Authentication):
   - URL Configuration → Redirect URLs: add `https://console.manzel.af/**`.
     (Sign-in uses six-digit codes, not links, but a link in an email must
     never land on an unknown address.)
   - Multi-Factor → TOTP: enabled (it is by default).
   - The email template already sends the code (`{{ .Token }}`) from
     `noreply@manzel.af`.
5. **Database:** the console needs migration **V037** for App versions,
   Alerts, version targeting and the second step in the database
   (`../Manzel/docs/database/CHANGELOG.md`). Deploy the console after it is
   applied.

## Alerts by email and web push

The database writes an alert (a support message waiting, a building request,
an idea or a report, a reported chat message) and calls the `operator-alerts`
edge function, which sends it:

- **Email** — support to `support@manzel.af`, everything else to
  `admin@manzel.af`, from the company's Zoho mailbox over SMTPS (port **465**;
  Supabase blocks 25 and 587).
- **Web push** — to every console where an operator turned alerts on
  (Alerts → Turn on alerts). On an iPhone or iPad, install the console to the
  Home Screen first (iOS 16.4+).

Set these once, as **edge function secrets** (Supabase Dashboard → Edge
Functions → Secrets). Until they are set, the function marks the email or the
push "skipped" and nothing breaks.

| Secret | Value |
| --- | --- |
| `ALERTS_SMTP_HOST` | Zoho's SMTP host for your domain — the same as in Authentication → SMTP Settings (for a domain mailbox usually `smtppro.zoho.com`) |
| `ALERTS_SMTP_PORT` | `465` |
| `ALERTS_SMTP_USER` | the sending mailbox, e.g. `noreply@manzel.af` |
| `ALERTS_SMTP_PASS` | its password (or a Zoho app password) |
| `ALERTS_FROM` | `Manzel <noreply@manzel.af>` |
| `VAPID_PUBLIC_KEY` | the public key (also `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on Vercel) |
| `VAPID_PRIVATE_KEY` | the private key — only here |
| `VAPID_SUBJECT` | `mailto:admin@manzel.af` |

Optional: `ALERTS_TO_SUPPORT`, `ALERTS_TO_ADMIN` (default the two addresses
above) and `CONSOLE_URL` (default `https://console.manzel.af`).

Make the VAPID pair once, on your own machine, and keep the private key out of
any repository:

```bash
npx web-push generate-vapid-keys
```

Then, in the console: **Alerts → Turn on alerts**, then **Send a test**. The
test goes to `admin@manzel.af` and to your own consoles, and the list below
says what became of it.

## App versions

Each app reports its install (version and build, the OTA update it runs, OS,
make and model) from the build after V037; older apps are counted from their
push token and presence, with the version alone. **App versions** shows who
runs what, which version is newest on each platform and where it is
installed; from any version (or "everyone not up to date") it opens a
notification or a banner for exactly those phones.
