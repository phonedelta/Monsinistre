/* The file endpoints are not Server Actions, so they check by themselves that a request was
   sent from a page of this site. The rule is the one the framework applies to its actions: the
   host the browser names in `Origin` must be the host the request came to (`x-forwarded-host`
   behind a proxy, `host` otherwise). It holds whatever name the site is reached by: its
   domain, or `localhost` as well as `127.0.0.1` in development. The public address in APP_URL
   is accepted too, for a proxy that forwards neither header. No `Origin`, no access. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || !URL.canParse(origin)) return false;
  const host = new URL(origin).host;
  const own = req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host');
  const site = process.env.APP_URL;
  return (
    host === own?.toLowerCase() || (!!site && URL.canParse(site) && host === new URL(site).host)
  );
}
