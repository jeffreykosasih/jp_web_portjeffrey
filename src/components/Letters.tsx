import React from 'react';

/** Delays a piece's entrance by `ms`, through the --d custom property. */
export const joinsAt = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

/**
 * Reveals `text` from left to right as if written by hand, starting at
 * `startMs` and taking `durationMs`. For the joined-up script, whose joins
 * would break if it were split into letters. Use inside an element that
 * carries `aria-label={text}`.
 */
export function WriteOn({
  text,
  startMs = 0,
  durationMs = 1200,
}: {
  text: string;
  startMs?: number;
  durationMs?: number;
}) {
  return (
    <span
      aria-hidden='true'
      className='write-on'
      style={{ '--d': `${startMs}ms`, '--w': `${durationMs}ms` } as React.CSSProperties}
    >
      {text}
    </span>
  );
}

// One wave crest, tiled along the tide's leading edge
const WAVE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 40' preserveAspectRatio='none'%3E%3Cpath d='M0 20 C20 0 40 0 60 20 C80 40 100 40 120 20 L120 40 L0 40 Z'/%3E%3C/svg%3E\")";

/** The tide that washes the opening screen off the island, in `color`. */
export function Tide({ color }: { color: string }) {
  return (
    <div
      className='tide'
      aria-hidden='true'
      style={{ '--tide': color, '--tide-wave': WAVE_SVG } as React.CSSProperties}
    >
      <div className='tide__water'>
        <div className='tide__edge' />
      </div>
    </div>
  );
}
