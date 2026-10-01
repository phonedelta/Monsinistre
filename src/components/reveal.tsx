'use client';
import { useEffect, useRef, useState } from 'react';

// One observer for the whole page: an element is revealed once, when it scrolls into view.
let observer: IntersectionObserver | undefined;
const waiting = new WeakMap<Element, () => void>();
function watch(element: Element, show: () => void) {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        waiting.get(entry.target)?.();
        waiting.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  waiting.set(element, show);
  observer.observe(element);
}

/* Fades its content in when it enters the screen (styles in styles/motion.css).
   The content is rendered visible: it is only hidden once this script has found it below
   the fold, so the page stays complete without JavaScript and nothing flashes on load.
   `stagger` reveals the direct children one after the other instead of the block. */
export function Reveal({
  as = 'div',
  stagger = false,
  className = '',
  children,
}: {
  as?: 'div' | 'section' | 'article' | 'header' | 'ul' | 'ol';
  stagger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = as as 'div';
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'pending' | 'shown'>('idle');
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    // Wait one frame: on a navigation the page has then been scrolled back to the top.
    const frame = requestAnimationFrame(() => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      setState('pending');
      watch(element, () => setState('shown'));
    });
    return () => {
      cancelAnimationFrame(frame);
      waiting.delete(element);
      observer?.unobserve(element);
    };
  }, []);
  return (
    <Tag
      ref={ref}
      className={`reveal ${stagger ? 'reveal-stagger ' : ''}${state === 'idle' ? '' : `is-${state} `}${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
