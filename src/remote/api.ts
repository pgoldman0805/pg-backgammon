/** HTTP client for the three room endpoints served by the worker. */

import type {
  CreateRoomResponse,
  JoinRoomResponse,
  RoomSummary,
} from './protocol';

export interface RemoteApi {
  /** `moveSeconds` is the per-turn clock in seconds, 0 for none; omitted sends no clock setting. */
  createRoom(length: number, moveSeconds?: number): Promise<CreateRoomResponse>;
  /** Null when the room does not exist. */
  getRoom(roomId: string): Promise<RoomSummary | null>;
  /** `'full'` when both seats are taken, null when the room does not exist. */
  joinRoom(roomId: string): Promise<JoinRoomResponse | 'full' | null>;
  /**
   * End a game from this seat. `'gone'` when the room no longer exists or
   * already finished, `'forbidden'` when the token holds no seat.
   */
  cancelRoom(
    roomId: string,
    seatToken: string,
  ): Promise<'cancelled' | 'gone' | 'forbidden'>;
}

export function createRemoteApi(
  fetchFn: typeof fetch = (...args) => fetch(...args),
  baseUrl = '',
): RemoteApi {
  const url = (path: string) => `${baseUrl}/api/rooms${path}`;
  return {
    async createRoom(length, moveSeconds) {
      const res = await fetchFn(url(''), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          moveSeconds === undefined ? { length } : { length, moveSeconds },
        ),
      });
      if (res.status !== 201) {
        throw new Error(`create-failed:${res.status}`);
      }
      return (await res.json()) as CreateRoomResponse;
    },
    async getRoom(roomId) {
      const res = await fetchFn(url(`/${roomId}`));
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200) {
        throw new Error(`get-failed:${res.status}`);
      }
      return (await res.json()) as RoomSummary;
    },
    async joinRoom(roomId) {
      const res = await fetchFn(url(`/${roomId}/join`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (res.status === 409) {
        return 'full';
      }
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200) {
        throw new Error(`join-failed:${res.status}`);
      }
      return (await res.json()) as JoinRoomResponse;
    },
    async cancelRoom(roomId, seatToken) {
      const res = await fetchFn(url(`/${roomId}/cancel`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seatToken }),
      });
      if (res.status === 200) {
        return 'cancelled';
      }
      if (res.status === 403) {
        return 'forbidden';
      }
      if (res.status === 404 || res.status === 409) {
        return 'gone';
      }
      throw new Error(`cancel-failed:${res.status}`);
    },
  };
}
