/**
 * "Your online games": every remote room this device holds a seat in, read
 * from the stored seats and checked against the room service, with whose move
 * it is and a way out of each one. Cancelling asks first, ends the room for
 * both players on the server, then forgets the seat here; a game that has
 * already ended can simply be removed from the list.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RemoteApi } from '../../remote/api';
import type { RoomSummary, Side } from '../../remote/protocol';
import { clearSeat, listSeats, type StoredSeat } from '../../remote/seats';

type Checked =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'gone' }
  | { kind: 'room'; summary: RoomSummary };

interface Game {
  readonly roomId: string;
  readonly seat: StoredSeat;
}

const otherSide = (side: Side): Side => (side === 'white' ? 'black' : 'white');

function opponentName(summary: RoomSummary, mine: Side): string | null {
  return summary.names?.[otherSide(mine)] ?? null;
}

/** The one-line state of a game, and whether it is still live. */
export function describeGame(
  checked: Checked,
  mine: Side,
): { text: string; live: boolean; yours: boolean } {
  if (checked.kind === 'loading') {
    return { text: 'Checking…', live: true, yours: false };
  }
  if (checked.kind === 'error') {
    return { text: "Couldn't check this game", live: true, yours: false };
  }
  if (checked.kind === 'gone' || checked.summary.status === 'expired') {
    return { text: 'This game has ended', live: false, yours: false };
  }
  const { summary } = checked;
  const opponent = opponentName(summary, mine) ?? 'Your opponent';
  if (summary.status === 'finished') {
    const text = summary.cancelledBy
      ? summary.cancelledBy === mine
        ? 'You cancelled the game'
        : `${opponent} cancelled the game`
      : summary.forfeitBy
        ? summary.forfeitBy === mine
          ? 'You ran out of time'
          : `${opponent} ran out of time`
        : 'Game finished';
    return { text, live: false, yours: false };
  }
  if (summary.status === 'waiting') {
    return {
      text: 'Waiting for an opponent to join',
      live: true,
      yours: false,
    };
  }
  if (summary.toMove === mine || summary.toMove === 'either') {
    return { text: 'Your turn', live: true, yours: true };
  }
  return {
    text: `Waiting for ${opponentName(summary, mine) ?? (mine === 'white' ? 'Black' : 'White')}`,
    live: true,
    yours: false,
  };
}

export function OnlineGames({ api }: { api: RemoteApi }) {
  const [games, setGames] = useState<Game[]>(() => listSeats());
  const [checked, setChecked] = useState<Record<string, Checked>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const check = useCallback(
    (list: readonly Game[]) => {
      for (const { roomId } of list) {
        api.getRoom(roomId).then(
          (summary) =>
            setChecked((prev) => ({
              ...prev,
              [roomId]: summary ? { kind: 'room', summary } : { kind: 'gone' },
            })),
          () =>
            setChecked((prev) => ({ ...prev, [roomId]: { kind: 'error' } })),
        );
      }
    },
    [api],
  );

  // Check on arrival and again whenever the tab comes back into view, so a
  // move made while away shows up without a reload.
  // biome-ignore lint/correctness/useExhaustiveDependencies: games is read once here; later removals must not retrigger a fetch
  useEffect(() => {
    check(games);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        check(listSeats());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  const forget = (roomId: string) => {
    clearSeat(roomId);
    setGames((prev) => prev.filter((game) => game.roomId !== roomId));
    setConfirming(null);
  };

  const cancel = async (game: Game) => {
    setBusy(game.roomId);
    setFailed(null);
    try {
      await api.cancelRoom(game.roomId, game.seat.token);
      forget(game.roomId);
    } catch {
      setFailed(game.roomId);
    } finally {
      setBusy(null);
    }
  };

  if (games.length === 0) {
    return null;
  }

  const rows = games
    .map((game) => {
      const state = checked[game.roomId] ?? { kind: 'loading' as const };
      return { game, state, ...describeGame(state, game.seat.side) };
    })
    // Your turn first, then live games, then finished ones.
    .sort(
      (a, b) =>
        Number(b.yours) - Number(a.yours) || Number(b.live) - Number(a.live),
    );

  return (
    <section className="online-games" aria-labelledby="online-games-title">
      <p className="online-games-title" id="online-games-title">
        Your online games
      </p>
      <ul className="online-games-list" aria-label="Your online games">
        {rows.map(({ game, state, text, live, yours }) => (
          <li key={game.roomId} className="online-game">
            <div className="online-game-info">
              <span className="online-game-match">
                {state.kind === 'room'
                  ? `${state.summary.config.length}-point match vs ${
                      opponentName(state.summary, game.seat.side) ?? 'a friend'
                    }`
                  : 'Online match'}
              </span>
              <span
                className={`online-game-status${yours ? ' online-game-status--yours' : ''}`}
              >
                {text}
              </span>
            </div>
            <div className="online-game-actions">
              {state.kind !== 'gone' && (
                <Link
                  className="play-button play-button--quiet"
                  to={`/play/${game.roomId}`}
                >
                  Open
                </Link>
              )}
              {live && confirming !== game.roomId && (
                <button
                  type="button"
                  className="play-button play-button--quiet"
                  onClick={() => {
                    setFailed(null);
                    setConfirming(game.roomId);
                  }}
                >
                  Cancel game
                </button>
              )}
              {live && confirming === game.roomId && (
                <>
                  <span className="online-game-confirm">Cancel this game?</span>
                  <button
                    type="button"
                    className="play-button play-button--quiet"
                    disabled={busy === game.roomId}
                    onClick={() => {
                      void cancel(game);
                    }}
                  >
                    Yes, cancel it
                  </button>
                  <button
                    type="button"
                    className="play-button play-button--quiet"
                    onClick={() => setConfirming(null)}
                  >
                    Keep playing
                  </button>
                </>
              )}
              {!live && (
                <button
                  type="button"
                  className="play-button play-button--quiet"
                  onClick={() => forget(game.roomId)}
                >
                  Remove
                </button>
              )}
            </div>
            {failed === game.roomId && (
              <p className="dialog-note" role="alert">
                Couldn't cancel the game. Check your connection and try again.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
