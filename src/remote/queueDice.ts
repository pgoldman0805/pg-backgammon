/**
 * A dice source fed from outside: the remote client pushes the dice the room
 * drew and replays the reducer against them, so both browsers apply the exact
 * same roll. Running dry means the client has drifted from the room.
 */

import type { DiceSource, Die } from '../rules';

export class QueueDiceUnderflow extends Error {
  constructor() {
    super('queue dice underflow');
    this.name = 'QueueDiceUnderflow';
  }
}

export function createQueueDice(): DiceSource & {
  push(dice: readonly Die[]): void;
  pending(): number;
  clear(): void;
} {
  let queue: Die[] = [];
  return {
    rollDie(): Die {
      const die = queue.shift();
      if (die === undefined) {
        throw new QueueDiceUnderflow();
      }
      return die;
    },
    push(dice) {
      queue.push(...dice);
    },
    pending: () => queue.length,
    clear() {
      queue = [];
    },
  };
}
