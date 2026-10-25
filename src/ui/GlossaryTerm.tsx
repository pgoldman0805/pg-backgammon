/**
 * GlossaryTerm (ticket 32): the one inline affordance that explains a jargon
 * word wherever the UI shows it. The term reads as underlined text; pointing
 * at it, tabbing to it, or tapping it reveals a one-line definition from the
 * glossary. The definition is wired to the trigger with aria-describedby so a
 * screen reader always announces it on focus, visible or not, and Escape
 * dismisses the open popover.
 */

import {
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { GLOSSARY, type GlossaryTermId } from './glossary';
import './term.css';

export function GlossaryTerm({
  id,
  children,
}: {
  id: GlossaryTermId;
  /** Trigger text; defaults to the term itself. Pass a HUD value to wrap it. */
  children?: ReactNode;
}) {
  const entry = GLOSSARY[id];
  const descId = useId();
  // Pointer/focus opens transiently; a tap pins it open on touch, where there
  // is no hover and a second tap (or a tap away) closes it.
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovering || pinned;

  // The popover is absolutely positioned at the term's left edge, so a term
  // on the right of a narrow screen would push its box off-screen. On open,
  // measure and shift it horizontally so it always stays within the viewport.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const [shiftX, setShiftX] = useState(0);

  useLayoutEffect(() => {
    if (!open) {
      setShiftX(0);
      return;
    }
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) {
      return;
    }
    const t = trigger.getBoundingClientRect();
    const p = popover.getBoundingClientRect();
    if (p.width === 0) {
      return; // no real layout (e.g. jsdom) — leave the CSS default.
    }
    const margin = 8;
    const vw = window.innerWidth;
    let s = 0;
    if (t.left + p.width > vw - margin) {
      s = vw - margin - (t.left + p.width); // shift left so it fits
    }
    if (t.left + s < margin) {
      s = margin - t.left; // never push past the left edge either
    }
    setShiftX(s);
  }, [open]);

  const close = () => {
    setHovering(false);
    setPinned(false);
  };

  return (
    <span className="term">
      <button
        ref={triggerRef}
        type="button"
        className="term-trigger"
        aria-describedby={descId}
        aria-expanded={open}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={close}
        onClick={() => setPinned((p) => !p)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            close();
          }
        }}
      >
        {children ?? entry.term}
      </button>
      <span
        ref={popoverRef}
        role="tooltip"
        className="term-popover"
        hidden={!open}
        style={shiftX ? { left: `${shiftX}px` } : undefined}
      >
        <span className="term-popover-name" aria-hidden="true">
          {entry.term}
        </span>
        {/* The described element carries the definition alone, so a screen
            reader hears the term (the trigger) then its meaning, not twice. */}
        <span id={descId} className="term-popover-def">
          {entry.short}
        </span>
      </span>
    </span>
  );
}
