import React from 'react';
import { createRoot } from 'react-dom/client';
import { SplashScene } from './SplashScene';
import { DURATION_MS } from './timeline';

export function mountSplash(container, onComplete) {
  if (!container) return;

  const root = createRoot(container);
  let raf = 0;

  const drawStage = (t) => {
    const r = container.getBoundingClientRect();
    const width = r.width || window.innerWidth;
    const height = r.height || window.innerHeight;
    root.render(<SplashScene t={t} width={width} height={height} />);
  };

  const play = () => {
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / DURATION_MS);
      drawStage(t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        if (onComplete) onComplete();
      }
    };
    raf = requestAnimationFrame(tick);
  };

  play();
  
  return () => {
    cancelAnimationFrame(raf);
    setTimeout(() => root.unmount(), 0);
  };
}
