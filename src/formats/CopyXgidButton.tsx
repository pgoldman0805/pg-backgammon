/**
 * The "Copy XGID" affordance (ticket 10): one button that puts an XGID string
 * (with its XGID= prefix) on the clipboard, shared by the Play HUD and the
 * Analyze review board.
 */

import { useEffect, useRef, useState } from 'react';

export function CopyXgidButton({
  xgid,
  className,
}: {
  /** The XGID body, without the XGID= prefix. */
  xgid: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  async function copy(): Promise<void> {
    let next: 'copied' | 'failed' = 'copied';
    try {
      await navigator.clipboard.writeText(`XGID=${xgid}`);
    } catch {
      next = 'failed';
    }
    setState(next);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setState('idle'), 2000);
  }

  return (
    <button type="button" className={className} onClick={() => void copy()}>
      {state === 'idle'
        ? 'Copy XGID'
        : state === 'copied'
          ? 'Copied'
          : 'Copy failed'}
    </button>
  );
}
