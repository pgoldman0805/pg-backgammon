/** Public surface of the remote-play client modules. */

export { createRemoteApi, type RemoteApi } from './api';
export * from './protocol';
export { createQueueDice, QueueDiceUnderflow } from './queueDice';
export {
  adoptSeatFromFragment,
  clearSeat,
  inviteLink,
  privateLink,
  readSeat,
  SEAT_KEY_PREFIX,
  type StoredSeat,
  writeSeat,
} from './seats';
export {
  type ConnectionState,
  createRemoteSession,
  type RemoteSession,
  type RemoteSessionOptions,
  socketUrl,
  type Transport,
  type TransportFactory,
} from './session';
