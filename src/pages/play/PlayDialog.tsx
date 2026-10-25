/**
 * The modal dialog over the board (ticket 44). It owns the accessibility
 * contract the cube, resign, game-over and match-over banners share: a dialog
 * role with an accessible name, focus moved in on open and trapped while open,
 * and focus restored to the opener on close. The page builds each specific
 * dialog's contents and passes them as children.
 */

import { useEffect, useRef } from 'react';

/**
 * Any focusable control inside a dialog, for its focus trap. Disabled controls
 * and explicitly-removed ones (tabindex -1, like the dialog container itself)
 * are skipped.
 */
const DIALOG_FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog over the board (ticket 44), following the restore-dialog
 * pattern ticket 27 established in BackupControls. It owns the accessibility
 * contract the cube, resign, game-over and match-over banners share: a dialog
 * role with an accessible name, focus moved into the dialog on open (so screen
 * readers announce its name and description) and trapped while open, and focus
 * restored to the opener on close. Escape closes it only when `onDismiss` is
 * given — the required cube decision passes none, so there is no unsafe
 * keyboard escape from it, while the resign dialog passes "decline" (play on).
 */
export function PlayDialog({
  labelledBy,
  describedBy,
  onDismiss,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  onDismiss?: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      const previous = restoreFocusRef.current;
      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (onDismiss) {
        event.stopPropagation();
        onDismiss();
      }
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const dialog = dialogRef.current;
    const focusable = dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE))
      : [];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    // Focus resting on the container itself (its initial home) tabs to an end
    // rather than escaping to whatever sits behind the overlay.
    if (active === dialog || !dialog?.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="play-banner">
      <div
        className="setup-card play-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
