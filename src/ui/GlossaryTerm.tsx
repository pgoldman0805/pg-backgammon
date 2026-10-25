/**
 * GlossaryTerm (ticket 32): the one inline affordance that explains a jargon
 * word wherever the UI shows it. The term reads as underlined text; pointing
 * at it, tabbing to it, or tapping it reveals a one-line definition from the
 * glossary. The definition is wired to the trigger with aria-describedby so a
 * screen reader always announces it on focus, visible or not, and Escape
 * dismisses the open popover.
 */

import { type ReactNode, useId, useState } from 'react';
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

  const close = () => {
    setHovering(false);
    setPinned(false);
  };

  return (
    <span className="term">
      <button
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
      <span role="tooltip" className="term-popover" hidden={!open}>
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
