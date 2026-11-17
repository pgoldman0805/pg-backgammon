/**
 * The client side of one remote room's lifecycle, for the Play page: find
 * this device's seat (a private-link fragment first, then localStorage), and
 * with one hold a live session for as long as the page shows the room;
 * without one, ask the room whether there is a seat to take. The page only
 * consumes the resulting view.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { RemoteApi } from '../../remote/api';
import type { RoomSummary, Side } from '../../remote/protocol';
import {
  adoptSeatFromFragment,
  inviteLink,
  privateLink,
  readSeat,
  type StoredSeat,
  writeSeat,
} from '../../remote/seats';
import {
  type ConnectionState,
  createRemoteSession,
  type RemoteSession,
  type TransportFactory,
} from '../../remote/session';

export type RemoteRoomView =
  | { kind: 'loading' }
  | {
      kind: 'join';
      summary: RoomSummary;
      join: () => Promise<void>;
      joining: boolean;
    }
  | { kind: 'full' }
  /** The room does not exist (404) or has expired, or a stored seat's room
   * closed it terminally before any match arrived. */
  | { kind: 'ended' }
  /** The game service could not be reached; `retry` repeats the lookup. */
  | { kind: 'error'; retry: () => void }
  | {
      kind: 'seated';
      session: RemoteSession;
      side: Side;
      connection: ConnectionState;
      inviteLink: string;
      privateLink: string;
    };

export interface RemoteDeps {
  readonly api: RemoteApi;
  /** Passed straight to the session; tests hand in a loopback transport. */
  readonly transport?: TransportFactory;
  /** The origin the invite and private links are built on. */
  readonly origin: string;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'join'; summary: RoomSummary }
  | { kind: 'full' }
  | { kind: 'ended' }
  | { kind: 'error' }
  | { kind: 'seated'; session: RemoteSession; seat: StoredSeat };

const noSubscribe = () => () => {};
const noConnection = () => null;

function phaseForSummary(summary: RoomSummary | null): Phase {
  if (!summary || summary.status === 'expired') {
    return { kind: 'ended' };
  }
  if (summary.status === 'waiting' && !summary.seats.black) {
    return { kind: 'join', summary };
  }
  return { kind: 'full' };
}

/** The panel for a terminal close that leaves a seat with no room to play. */
function goneView(
  error: ConnectionState['error'],
): { kind: 'ended' } | { kind: 'full' } | null {
  if (error === 'expired' || error === 'bad-token') {
    return { kind: 'ended' };
  }
  return error === 'full' ? { kind: 'full' } : null;
}

export function useRemoteRoom(
  roomId: string | undefined,
  deps: RemoteDeps,
): RemoteRoomView | null {
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const [phase, setPhase] = useState<Phase | null>(null);
  const [joining, setJoining] = useState(false);
  /** Bumped by `retry` to repeat a lookup that failed on the network. */
  const [lookups, setLookups] = useState(0);
  /** The live session, owned here: disposed on unmount or a room change. */
  const sessionRef = useRef<RemoteSession | null>(null);
  /** Bumped per room, so a late reply for a previous room is dropped. */
  const generation = useRef(0);

  const connect = useCallback((room: string, seat: StoredSeat) => {
    const session = createRemoteSession({
      roomId: room,
      seatToken: seat.token,
      side: seat.side,
      transport: depsRef.current.transport,
    });
    sessionRef.current = session;
    setPhase({ kind: 'seated', session, seat });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `lookups` is the deliberate retry trigger after a network failure
  useEffect(() => {
    const current = ++generation.current;
    if (!roomId) {
      setPhase(null);
      return;
    }
    const seat =
      adoptSeatFromFragment(roomId, location.hash) ?? readSeat(roomId);
    if (seat) {
      connect(roomId, seat);
    } else {
      setPhase({ kind: 'loading' });
      depsRef.current.api.getRoom(roomId).then(
        (summary) => {
          if (generation.current === current) {
            setPhase(phaseForSummary(summary));
          }
        },
        () => {
          // A network failure, not a missing room: offer to try again.
          if (generation.current === current) {
            setPhase({ kind: 'error' });
          }
        },
      );
    }
    return () => {
      generation.current += 1;
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [roomId, connect, lookups]);

  const retry = useCallback(() => setLookups((n) => n + 1), []);

  const join = useCallback(async () => {
    if (!roomId) {
      return;
    }
    const current = generation.current;
    setJoining(true);
    try {
      const result = await depsRef.current.api.joinRoom(roomId);
      if (generation.current !== current) {
        return;
      }
      if (result === 'full') {
        setPhase({ kind: 'full' });
      } else if (result === null) {
        setPhase({ kind: 'ended' });
      } else {
        const seat: StoredSeat = { side: result.side, token: result.seatToken };
        writeSeat(roomId, seat);
        connect(roomId, seat);
      }
    } catch {
      // A network failure, not a missing room: offer to try again.
      if (generation.current === current) {
        setPhase({ kind: 'error' });
      }
    } finally {
      setJoining(false);
    }
  }, [roomId, connect]);

  const session = phase?.kind === 'seated' ? phase.session : null;
  const connection = useSyncExternalStore(
    session ? session.subscribeConnection : noSubscribe,
    session ? session.getConnection : noConnection,
  );

  if (!roomId || !phase) {
    return roomId ? { kind: 'loading' } : null;
  }
  switch (phase.kind) {
    case 'join':
      return { kind: 'join', summary: phase.summary, join, joining };
    case 'error':
      return { kind: 'error', retry };
    case 'seated': {
      const live = connection ?? phase.session.getConnection();
      // A seat whose room is gone (expired, deleted, or the seat no longer
      // valid) before any match arrived has nothing to show: end like a
      // lookup would rather than wait on a dead invite link.
      const gone = goneView(live.error);
      if (gone && !phase.session.getState().match) {
        return gone;
      }
      return {
        kind: 'seated',
        session: phase.session,
        side: phase.seat.side,
        connection: live,
        inviteLink: inviteLink(deps.origin, roomId),
        privateLink: privateLink(deps.origin, roomId, phase.seat),
      };
    }
    default:
      return phase;
  }
}
