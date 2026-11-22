import { useEffect, useState } from 'react';
import { Button } from '../vendor/action-button';
import { HeaderMedia, Shell, ShellHeader, Panel } from '../vendor/surface';
import type { StoreMark } from '../types';

export const money = (n: number | undefined, currency = 'USD') =>
  typeof n === 'number' && Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency })
    : 'Price unavailable';

/** Status line: a dot plus text, never a pill. */
export function Note({ tone, children }: { tone: 'positive' | 'negative' | 'neutral'; children: React.ReactNode }) {
  const dot = tone === 'positive' ? 'bg-positive' : tone === 'negative' ? 'bg-negative' : 'bg-muted-foreground';
  return (
    <p role="status" className="flex items-start gap-2 px-4 pb-3 text-[0.8125rem] text-muted-foreground">
      <span aria-hidden="true" className={`mt-[0.45rem] size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** The store's own logo, tinted the way the store chose. Shown as an image, so nothing inside the SVG can run. */
export function StoreLogo({ logo }: { logo: StoreMark }) {
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border">
      <img src={logo.src} alt="" className="size-5 object-contain" style={{ filter: `hue-rotate(${logo.hue}deg)` }} />
    </span>
  );
}

/** Every header inside shows the store's logo in place of a generic icon, when the store has one. */
export function WithStoreLogo({ logo, children }: { logo?: StoreMark; children: React.ReactNode }) {
  return <HeaderMedia.Provider value={logo ? <StoreLogo logo={logo} /> : null}>{children}</HeaderMedia.Provider>;
}

export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  };
  return { busy, run };
}

/** Host reports its theme through iframe render data; fall back to the OS setting until it arrives. */
export function useTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    let fromHost = false;
    const apply = (dark: boolean) => root.classList.toggle('dark', dark);
    apply(media.matches);
    const onMedia = () => { if (!fromHost) apply(media.matches); };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.type !== 'ui-lifecycle-iframe-render-data') return;
      const theme = event.data.payload?.renderData?.theme;
      if (theme === 'dark' || theme === 'light') { fromHost = true; apply(theme === 'dark'); }
    };
    media.addEventListener('change', onMedia);
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
    return () => { media.removeEventListener('change', onMedia); window.removeEventListener('message', onMessage); };
  }, []);
}

/** Keep the host iframe exactly as tall as the card. */
export function useAutoResize() {
  useEffect(() => {
    const report = () => {
      const height = Math.max(1, Math.ceil(document.body.getBoundingClientRect().height));
      window.parent.postMessage({ type: 'ui-size-change', payload: { height, width: Math.ceil(document.documentElement.clientWidth) } }, '*');
    };
    const observer = new ResizeObserver(report);
    observer.observe(document.body);
    requestAnimationFrame(report);
    return () => observer.disconnect();
  }, []);
}

export { Button, Shell, ShellHeader, Panel };
