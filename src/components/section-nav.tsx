'use client';
import { useEffect, useRef, useState } from 'react';
export type Section = {
  id: string;
  label: string;
  count?: number;
  // Only offered when the page is in one column, where this part comes after the others.
  narrow?: boolean;
};
/* The parts of a long page as links, in a bar that stays in view while the page scrolls: a
   strip of the page's colour, so nothing shows around the bar, and the bar itself, which scrolls
   sideways on a narrow screen. The part being read is marked: the last one whose top has passed
   under the strip, or the last of the page once its end is reached. A link marks its own part
   at once; the scroll takes over again afterwards. Styles: `.section-nav` in styles/portal.css. */
export function SectionNav({ label, sections }: { label: string; sections: Section[] }) {
  const bar = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const held = useRef(0);
  const [current, setCurrent] = useState('');
  const ids = sections.map((section) => section.id).join(' ');
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      if (Date.now() < held.current || !bar.current) return;
      const line = bar.current.getBoundingClientRect().bottom + 48;
      let reading = { id: '', top: -Infinity };
      let last = { id: '', top: -Infinity };
      // A link that is not shown (see `narrow`) stands for no part.
      for (const link of bar.current.querySelectorAll('a')) {
        const id = link.hash.slice(1);
        const top = link.offsetParent && document.getElementById(id)?.getBoundingClientRect().top;
        if (typeof top !== 'number') continue;
        if (top <= line && top > reading.top) reading = { id, top };
        if (top > last.top) last = { id, top };
      }
      const page = document.documentElement;
      const ended =
        window.scrollY > 0 && window.innerHeight + window.scrollY >= page.scrollHeight - 2;
      setCurrent(ended ? last.id : reading.id);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(read);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ids]);
  // The marked link is kept in view when the bar scrolls sideways.
  useEffect(() => {
    const links = rail.current;
    const link = links?.querySelector<HTMLElement>('[aria-current]');
    if (!links || !link) return;
    const start = link.offsetLeft - 8;
    const end = link.offsetLeft + link.offsetWidth + 8;
    if (start < links.scrollLeft) links.scrollTo({ left: start, behavior: 'smooth' });
    else if (end > links.scrollLeft + links.clientWidth)
      links.scrollTo({ left: end - links.clientWidth, behavior: 'smooth' });
  }, [current]);
  return (
    <nav className="section-nav" aria-label={label} ref={bar}>
      <div ref={rail}>
        {sections.map((section) => (
          <a
            href={`#${section.id}`}
            key={section.id}
            data-narrow={section.narrow ? '' : undefined}
            aria-current={current === section.id ? 'true' : undefined}
            onClick={() => {
              // The page glides to the part: its mark does not follow the parts passed on the way.
              held.current = Date.now() + 900;
              setCurrent(section.id);
            }}
          >
            {section.label}
            {section.count !== undefined && <span>{section.count}</span>}
          </a>
        ))}
      </div>
    </nav>
  );
}
