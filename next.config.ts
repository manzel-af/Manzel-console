import type { NextConfig } from 'next';

/**
 * Security headers for an operator console. The page talks to one place —
 * the Supabase project — and nothing else: no analytics, no third-party
 * scripts, no frames. Images may come from any https address because a
 * banner's picture can be a link the operator pasted.
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseWs = supabase.replace(/^https:/, 'wss:');

const csp = [
  "default-src 'self'",
  // Next's own inline bootstrap and the theme script need inline scripts.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${supabase} ${supabaseWs}`.trim(),
  "img-src 'self' data: blob: https:",
  `media-src 'self' blob: ${supabase}`.trim(),
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // app/global-not-found.tsx: the root layout sits under [lang], so an
    // address that matches nothing has no layout to render a 404 in.
    globalNotFound: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    const always = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ];
    return [
      {
        source: '/(.*)',
        headers: process.env.NODE_ENV === 'production'
          ? [...always, { key: 'Content-Security-Policy', value: csp }]
          : always,
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
