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
  /** The room does not exist (404) or has expired. */
  | { kind: 'ended' }
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

export function useRemoteRoom(
  roomId: string | undefined,
  deps: RemoteDeps,
): RemoteRoomView | null {
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const [phase, setPhase] = useState<Phase | null>(null);
  const [joining, setJoining] = useState(false);
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
          if (generation.current === current) {
            setPhase({ kind: 'ended' });
          }
        },
      );
    }
    return () => {
      generation.current += 1;
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [roomId, connect]);

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
      // A failed join leaves the button there to try again.
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
    case 'seated':
      return {
        kind: 'seated',
        session: phase.session,
        side: phase.seat.side,
        connection: connection ?? phase.session.getConnection(),
        inviteLink: inviteLink(deps.origin, roomId),
        privateLink: privateLink(deps.origin, roomId, phase.seat),
      };
    default:
      return phase;
  }
}
