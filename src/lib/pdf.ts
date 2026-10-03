/* The PDF reader of the site (PDF.js), loaded only when a PDF is opened. The "legacy" build
   also runs on the browsers of older phones. Documents are parsed in a worker, so that a long
   one does not freeze the page. */
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
if (typeof window !== 'undefined' && 'Worker' in window)
  GlobalWorkerOptions.workerPort = new Worker(new URL('./pdf-worker.ts', import.meta.url), {
    type: 'module',
  });
// Where the reader fetches what some documents need: image decoders, the standard fonts a PDF
// may use without embedding them, character maps and colour profiles (app/pdfjs).
const assets = {
  wasmUrl: '/pdfjs/wasm/',
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  cMapUrl: '/pdfjs/cmaps/',
  iccUrl: '/pdfjs/iccs/',
};
// A document is read in parts of 1 MB: its first pages show before the whole file is there.
// Verbosity 0: errors only, without the library's advice about fonts in the console.
export const openPdf = (url: string) =>
  getDocument({ url, rangeChunkSize: 1 << 20, verbosity: 0, ...assets });
export type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
