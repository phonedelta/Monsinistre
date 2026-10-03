import type { NextConfig } from 'next';
const config: NextConfig = {
  logging: false,
  // In development, keep the Next.js badge away from the portal's side menu.
  devIndicators: { position: 'bottom-right' },
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
      {
        // A document shown in the preview popup or opened in a tab of its own: nothing in the
        // file may run, and it may load nothing but itself. This policy replaces the one above
        // (the headers set here win over those a route handler sets itself). Like every page,
        // the file cannot be framed: the popup draws a PDF itself (components/pdf-view.tsx).
        source: '/api/documents/:id',
        has: [{ type: 'query', key: 'preview' }],
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
