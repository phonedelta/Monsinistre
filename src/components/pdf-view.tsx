'use client';
import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from '@/lib/pdf';
/* Shows a PDF page by page, drawn by the site itself rather than by the browser's own reader,
   which a setting or an extension can turn off and which phones often lack. A page is drawn
   when it comes near the visible part and released when it is far from it, so that a long
   document does not fill the memory. `onFailed` is called when the file cannot be read. */
export function PdfView({ source, onFailed }: { source: string; onFailed: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const failed = useRef(onFailed);
  const [pdf, setPdf] = useState<{ doc: PDFDocumentProxy; ratio: number }>();
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    failed.current = onFailed;
  });
  useEffect(() => {
    let closed = false;
    let task: { promise: Promise<PDFDocumentProxy>; destroy(): Promise<void> } | undefined;
    (async () => {
      try {
        const { openPdf } = await import('@/lib/pdf');
        if (closed) return;
        task = openPdf(source);
        const doc = await task.promise;
        // Every page takes the shape of the first one until it is drawn.
        const first = (await doc.getPage(1)).getViewport({ scale: 1 });
        if (!closed) setPdf({ doc, ratio: first.width / first.height });
      } catch {
        if (!closed) failed.current();
      }
    })();
    return () => {
      closed = true;
      void task?.destroy();
    };
  }, [source]);
  useEffect(() => {
    const root = scroller.current;
    if (!root || !pdf) return;
    const tasks = new Map<Element, RenderTask>();
    async function draw(holder: HTMLElement) {
      if (holder.firstChild) return;
      const canvas = holder.appendChild(document.createElement('canvas'));
      try {
        const page = await pdf!.doc.getPage(Number(holder.dataset.page));
        if (!canvas.isConnected) return;
        const natural = page.getViewport({ scale: 1 });
        // As many dots as the screen shows, up to twice the size on dense screens.
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({
          scale: (holder.clientWidth * density) / natural.width,
        });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        holder.style.aspectRatio = `${natural.width} / ${natural.height}`;
        const task = page.render({ canvas, viewport });
        tasks.set(holder, task);
        await task.promise;
      } catch {
        // The page was released while it was being drawn, or it cannot be drawn: it stays blank.
      } finally {
        tasks.delete(holder);
      }
    }
    function release(holder: Element) {
      tasks.get(holder)?.cancel();
      const canvas = holder.firstChild as HTMLCanvasElement | null;
      if (canvas) {
        canvas.width = 0;
        canvas.remove();
      }
    }
    const near = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) void draw(entry.target as HTMLElement);
          else release(entry.target);
      },
      { root, rootMargin: '100% 0px' },
    );
    const holders = [...root.querySelectorAll<HTMLElement>('[data-page]')];
    holders.forEach((holder) => near.observe(holder));
    // The page counted as current is the one across the middle of the visible part.
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const middle = root.scrollTop + root.clientHeight / 2;
        const index = holders.findLastIndex((holder) => holder.offsetTop <= middle);
        setCurrent(Math.max(1, index + 1));
      });
    };
    root.addEventListener('scroll', follow, { passive: true });
    return () => {
      near.disconnect();
      root.removeEventListener('scroll', follow);
      cancelAnimationFrame(frame);
      holders.forEach(release);
    };
  }, [pdf, zoom]);
  if (!pdf) return <span className="spinner" aria-hidden="true" />;
  return (
    <>
      <div className="pdf-pages" ref={scroller} tabIndex={0} aria-label="Pages du document">
        {/* A page is at most a comfortable reading width; the zoom multiplies it. */}
        <div style={{ width: `calc(min(100%, 50rem) * ${zoom})` }}>
          {Array.from({ length: pdf.doc.numPages }, (_, index) => (
            <div data-page={index + 1} style={{ aspectRatio: pdf.ratio }} key={index} />
          ))}
        </div>
      </div>
      <div className="pdf-tools">
        <button
          type="button"
          className="icon-btn"
          aria-label="Réduire"
          disabled={zoom <= 1}
          onClick={() => setZoom(zoom - 0.5)}
        >
          <ZoomOut size={18} />
        </button>
        <output aria-live="off">
          Page {current} sur {pdf.doc.numPages}
        </output>
        <button
          type="button"
          className="icon-btn"
          aria-label="Agrandir"
          disabled={zoom >= 3}
          onClick={() => setZoom(zoom + 0.5)}
        >
          <ZoomIn size={18} />
        </button>
      </div>
    </>
  );
}
