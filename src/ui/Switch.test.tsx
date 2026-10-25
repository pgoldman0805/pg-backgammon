/**
 * The shared binary-setting switch (ticket 42): one component behind every
 * on/off setting across Play and Settings. It carries the switch role and
 * state; its name comes either from a visible label it renders, or from an
 * external element it points at.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('the shared Switch', () => {
  it('reflects its on/off state through aria-checked', () => {
    const { rerender } = render(
      <Switch label="Tutor mode" on={false} onChange={() => {}} />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch label="Tutor mode" on={true} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles to the opposite state when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Tutor mode" on={false} onChange={onChange} />);

    await user.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('takes its accessible name from a visible label', () => {
    render(<Switch label="Tutor mode" on={false} onChange={() => {}} />);

    expect(
      screen.getByRole('switch', { name: 'Tutor mode' }),
    ).toBeInTheDocument();
  });

  it('takes its accessible name from an external element when labelled by id', () => {
    render(
      <>
        <span id="the-row">Auto-roll in races</span>
        <Switch labelledBy="the-row" on={true} onChange={() => {}} />
      </>,
    );

    const toggle = screen.getByRole('switch', { name: 'Auto-roll in races' });
    // In the labelled-by variant the control still spells out its state for
    // sighted users, without doubling the accessible name.
    expect(toggle).toHaveTextContent('On');
  });
});
