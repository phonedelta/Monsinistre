import { readFile } from 'node:fs/promises';
import path from 'node:path';
/* The data files the site's PDF reader fetches when a document needs them (image decoders,
   standard fonts, character maps, colour profiles), served from the library's own package so
   that they always match its version. Public: they are the library's, not a dossier's. */
const root = path.join(/* turbopackIgnore: true */ process.cwd(), 'node_modules/pdfjs-dist');
const folders = ['wasm', 'standard_fonts', 'cmaps', 'iccs'];
const types: Record<string, string> = {
  wasm: 'application/wasm',
  js: 'text/javascript',
  ttf: 'font/ttf',
};
export async function GET(_: Request, ctx: { params: Promise<{ file: string[] }> }) {
  const [folder, name, ...rest] = (await ctx.params).file;
  if (rest.length || !folders.includes(folder) || !/^[A-Za-z0-9][\w.-]*$/.test(name || ''))
    return new Response(null, { status: 404 });
  try {
    const data = await readFile(path.join(/* turbopackIgnore: true */ root, folder, name));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': types[name.split('.').pop()!] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
