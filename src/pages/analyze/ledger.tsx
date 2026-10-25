/**
 * The match-history ledger's controls (ticket 42): the per-row overflow menu
 * that holds a row's secondary actions, and the sort/filter helpers that
 * arrange the loaded matches for display. The page owns the rows; these keep
 * the ledger scannable as history grows.
 */

import { useEffect, useRef, useState } from 'react';
import { DIFFICULTY_LABELS } from '../../engine';
import type { StoredMatch } from '../../storage';
import { metaLine, resultLine } from './reviewFormat';

interface MenuAction {
  readonly label: string;
  readonly onSelect: () => void;
}

/**
 * A per-row overflow menu (ticket 42): a quiet ⋯ trigger that holds a row's
 * secondary actions, so the ledger leads with one primary action (Open or
 * Resume) and stays scannable as history grows. Fully keyboard-operable —
 * the trigger opens on click or ↓, arrows move between items, Escape closes
 * and restores focus to the trigger, and a click outside dismisses it.
 */
export function OverflowMenu({
  label,
  actions,
}: {
  label: string;
  actions: readonly MenuAction[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (open) {
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  // A press anywhere outside closes the menu.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close(restoreFocus: boolean): void {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function onMenuKeyDown(event: React.KeyboardEvent): void {
    const items = itemRefs.current.filter(
      (item): item is HTMLButtonElement => item !== null,
    );
    const active = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'Escape':
        event.stopPropagation();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        items[(active + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(active - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
    }
  }

  return (
    <div className="row-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="history-button history-button--menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div
          className="row-menu-list"
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className="row-menu-item"
              onClick={() => {
                action.onSelect();
                close(false);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type LedgerSort = 'newest' | 'oldest' | 'difficulty';

export const SORT_LABELS: ReadonlyArray<{ id: LedgerSort; label: string }> = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'difficulty', label: 'Difficulty' },
];

/** Weakest-first rank for the difficulty sort; unranked modes sort last. */
const DIFFICULTY_RANK: Record<string, number> = Object.fromEntries(
  Object.keys(DIFFICULTY_LABELS).map((id, index) => [id, index]),
);

function difficultyRank(stored: StoredMatch): number {
  const rank = DIFFICULTY_RANK[String(stored.config.difficulty)];
  return rank ?? Object.keys(DIFFICULTY_LABELS).length;
}

/** Everything a ledger row is searchable by: result, name, date, status. */
function rowHaystack(stored: StoredMatch): string {
  return `${resultLine(stored)} ${metaLine(stored)}`.toLowerCase();
}

/** Apply the current filter and sort to the loaded matches. */
export function arrangeMatches(
  matches: readonly StoredMatch[],
  query: string,
  sort: LedgerSort,
): readonly StoredMatch[] {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? matches.filter((row) => rowHaystack(row).includes(needle))
    : matches;
  const sorted = [...filtered];
  switch (sort) {
    case 'oldest':
      sorted.sort((a, b) => a.updatedAt - b.updatedAt);
      break;
    case 'difficulty':
      sorted.sort((a, b) => difficultyRank(a) - difficultyRank(b));
      break;
    default:
      sorted.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return sorted;
}
