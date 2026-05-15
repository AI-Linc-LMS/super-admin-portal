import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  /** Status line under the percentage, e.g. "Checking authentication" */
  label?: string;
  /**
   * If true, runs the fake-progress tick and auto-fades when it hits 100%.
   * If false, holds at the indeterminate state — pass when a parent owns
   * the loading lifecycle and just wants the AI Linc logo screen visible
   * for as long as it renders.
   */
  autoTick?: boolean;
}

/**
 * Cinematic loading screen — the AI Linc infinity-loop mark traces itself
 * in cyan→blue over 2.4s while a percent counter ticks up. Mirrors the
 * preloader from ailinc.com / ailinc-app so the two surfaces feel like one
 * product.
 */
const Preloader: React.FC<PreloaderProps> = ({
  label = 'AI Linc · Loading',
  autoTick = true,
}) => {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!autoTick) return;
    let mounted = true;
    let p = 0;
    const tick = () => {
      if (!mounted) return;
      p += Math.random() * 11 + 4;
      if (p >= 100) {
        setPct(100);
        return;
      }
      setPct(Math.floor(p));
      setTimeout(tick, 80 + Math.random() * 110);
    };
    const start = () => setTimeout(tick, 120);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(start);
    } else {
      start();
    }
    return () => {
      mounted = false;
    };
  }, [autoTick]);

  return (
    <div
      aria-busy="true"
      role="status"
      className="fixed inset-0 z-[200] grid place-items-center bg-ink-0"
    >
      <div className="w-[min(380px,70vw)] text-center">
        <svg viewBox="0 0 400 240" className="h-auto w-full" aria-hidden>
          <defs>
            <linearGradient
              id="ailinc-sa-preloader-grad"
              x1="40"
              y1="120"
              x2="380"
              y2="120"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#2356D6" />
              <stop offset="1" stopColor="#00E0FF" />
            </linearGradient>
          </defs>
          <g transform="rotate(-7 200 120)">
            <path
              d="M 200 120 C 150 48.5, 105 48.5, 100 120 C 95 191.5, 150 191.5, 200 120 C 282.5 9.999999999999986, 356.75 9.999999999999986, 365 120 C 373.25 230, 282.5 230, 200 120 Z M 200 120 C 164 69, 129.6 69, 126 120 C 122.4 171, 164 171, 200 120 C 268.5 34, 332.15 34, 339 120 C 345.85 206, 268.5 206, 200 120 Z"
              fill="none"
              stroke="url(#ailinc-sa-preloader-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              fillRule="evenodd"
              style={{
                strokeDasharray: 1400,
                strokeDashoffset: 1400,
                animation:
                  'ailinc-sa-dash 2.4s cubic-bezier(.16,1,.3,1) forwards',
              }}
            />
          </g>
        </svg>
        <div className="mt-6 flex items-center justify-between font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-text-dim">
          <span>{label}</span>
          <span className="tabular-nums text-brand-cyan">
            {String(pct).padStart(2, '0')}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes ailinc-sa-dash {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

export default Preloader;
