import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GlossaryTerm } from './GlossaryTerm';
import { GLOSSARY } from './glossary';

describe('GlossaryTerm', () => {
  it('names the trigger by the term and always exposes the definition to assistive tech', () => {
    render(<GlossaryTerm id="crawford" />);

    const trigger = screen.getByRole('button', { name: /crawford game/i });
    // The description is available on focus for screen-reader users whether or
    // not the popover is visually open.
    expect(trigger).toHaveAccessibleDescription(GLOSSARY.crawford.short);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Nothing is shown visually until the term is pointed at or focused.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the definition on hover and hides it when the pointer leaves', async () => {
    const user = userEvent.setup();
    render(<GlossaryTerm id="equity" />);
    const trigger = screen.getByRole('button', { name: /equity/i });

    await user.hover(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      GLOSSARY.equity.short,
    );

    await user.unhover(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows the definition on keyboard focus and closes again on Escape', async () => {
    const user = userEvent.setup();
    render(
      <>
        <GlossaryTerm id="blunder" />
        <button type="button">after</button>
      </>,
    );
    const trigger = screen.getByRole('button', { name: /blunder/i });

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      GLOSSARY.blunder.short,
    );

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders custom trigger text (e.g. a HUD value) while still describing the term', () => {
    render(<GlossaryTerm id="pips">167</GlossaryTerm>);

    const trigger = screen.getByRole('button', { name: '167' });
    expect(trigger).toHaveAccessibleDescription(GLOSSARY.pips.short);
  });
});
