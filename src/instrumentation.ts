/* Run once when the server starts, before it answers. On a host where nobody runs the seed by
   hand, such as Railway, the first administrator is created from the ADMIN_… variables of the
   host (src/lib/first-admin.ts). A wrong setting is reported in the logs; the site still
   starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { ensureFirstAdmin } = await import('./lib/first-admin');
  try {
    const result = await ensureFirstAdmin();
    if (result === 'created') console.log('Premier administrateur créé.');
  } catch (e) {
    console.error(
      'Premier administrateur non créé :',
      e instanceof Error ? e.message : 'erreur inconnue',
    );
  }
}
