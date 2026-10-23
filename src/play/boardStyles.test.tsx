import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { BoardStylePicker } from './BoardStylePicker';
import {
  BOARD_STYLE_KEY,
  BOARD_STYLES,
  DEFAULT_BOARD_STYLE,
  getBoardStyle,
  readStoredBoardStyle,
  setBoardStyle,
} from './boardStyles';

function renderBoard() {
  const noop = () => {};
  return render(
    <Board game={null} selected={null} onSelect={noop} onMove={noop} />,
  );
}

// The selected style is module state applied to <html>; every test starts
// from the default so none leaks into its neighbours.
beforeEach(() => {
  localStorage.clear();
  setBoardStyle(DEFAULT_BOARD_STYLE);
});

describe('the Board style registry', () => {
  it('offers the default plus the five geographic styles, default first', () => {
    expect(BOARD_STYLES.map((style) => style.id)).toEqual([
      'classic',
      'aegean',
      'bosphorus',
      'marrakech',
      'kyoto',
      'reykjavik',
    ]);
    expect(BOARD_STYLES[0].id).toBe(DEFAULT_BOARD_STYLE);
  });

  it('gives every style a name and a mood line', () => {
    for (const style of BOARD_STYLES) {
      expect(style.name).not.toBe('');
      expect(style.mood).not.toBe('');
    }
  });
});

describe('Board style persistence', () => {
  it('falls back to the default when nothing (or garbage) is stored', () => {
    expect(readStoredBoardStyle()).toBe(DEFAULT_BOARD_STYLE);
    localStorage.setItem(BOARD_STYLE_KEY, 'walnut-skin');
    expect(readStoredBoardStyle()).toBe(DEFAULT_BOARD_STYLE);
  });

  it('reads back the stored choice', () => {
    localStorage.setItem(BOARD_STYLE_KEY, 'kyoto');
    expect(readStoredBoardStyle()).toBe('kyoto');
  });

  it('persists the choice when it is set', () => {
    setBoardStyle('marrakech');
    expect(localStorage.getItem(BOARD_STYLE_KEY)).toBe('marrakech');
    expect(getBoardStyle()).toBe('marrakech');
  });
});

describe('the Board style picker', () => {
  it('offers all six styles as radios with the stored choice checked', () => {
    setBoardStyle('kyoto');
    render(<BoardStylePicker />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(6);
    expect(screen.getByRole('radio', { name: 'Kyoto' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Classic' })).not.toBeChecked();
  });

  it('persists and applies a picked style instantly', async () => {
    const user = userEvent.setup();
    render(<BoardStylePicker />);

    await user.click(screen.getByRole('radio', { name: 'Bosphorus' }));

    expect(localStorage.getItem(BOARD_STYLE_KEY)).toBe('bosphorus');
    expect(document.documentElement.getAttribute('data-board-style')).toBe(
      'bosphorus',
    );
    expect(screen.getByRole('radio', { name: 'Bosphorus' })).toBeChecked();
  });

  it('describes the selected style with its mood line', async () => {
    const user = userEvent.setup();
    render(<BoardStylePicker />);

    expect(
      screen.getByText(/Paper, ink, and tournament green/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Aegean' }));
    expect(
      screen.getByText(/Whitewash and cobalt in bright coastal light/),
    ).toBeInTheDocument();
  });

  it('previews each style under its own tokens, including the default', () => {
    render(<BoardStylePicker />);

    for (const style of BOARD_STYLES) {
      expect(
        screen
          .getByRole('radio', { name: style.name })
          .closest('[data-board-style]'),
      ).toHaveAttribute('data-board-style', style.id);
    }
  });
});

describe('the Board under a style', () => {
  it('renders no style defs in the default style (default stays untouched)', () => {
    renderBoard();
    const svg = screen.getByLabelText('Backgammon board');
    expect(svg.querySelector('defs')).toBeNull();
  });

  it("renders the selected style's motif defs, and drops them on return", () => {
    renderBoard();
    const svg = screen.getByLabelText('Backgammon board');

    act(() => setBoardStyle('kyoto'));
    expect(svg.querySelector('#bs-kyoto-asanoha')).not.toBeNull();
    expect(svg.querySelector('#bs-kyoto-lacquer')).not.toBeNull();

    act(() => setBoardStyle('bosphorus'));
    expect(svg.querySelector('#bs-kyoto-asanoha')).toBeNull();
    expect(svg.querySelector('#bs-bosphorus-pearl')).not.toBeNull();

    act(() => setBoardStyle(DEFAULT_BOARD_STYLE));
    expect(svg.querySelector('defs')).toBeNull();
  });
});

describe('Board style application', () => {
  it('marks the document with the selected style', () => {
    setBoardStyle('aegean');
    expect(document.documentElement.getAttribute('data-board-style')).toBe(
      'aegean',
    );
  });

  it('leaves the document unmarked for the default style', () => {
    setBoardStyle('aegean');
    setBoardStyle(DEFAULT_BOARD_STYLE);
    expect(document.documentElement.hasAttribute('data-board-style')).toBe(
      false,
    );
  });
});
