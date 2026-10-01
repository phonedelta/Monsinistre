'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function RefreshData() {
  const router = useRouter();
  useEffect(() => {
    let version = '';
    let busy = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || busy) return;
      busy = true;
      try {
        const response = await fetch('/api/updates', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.refresh();
          return;
        }
        if (!response.ok) return;
        const result: { version: string } = await response.json();
        if (result.version !== version) router.refresh();
        version = result.version;
      } catch {
        /* Retain the current screen during a network interruption. */
      } finally {
        busy = false;
      }
    };
    void refresh();
    const timer = setInterval(refresh, 2000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [router]);
  return null;
}
