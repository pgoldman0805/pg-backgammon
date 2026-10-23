import type { DiceSource, Die } from '../rules';

/** A dice source that yields exactly the scripted values, then throws. */
export function scriptedDice(...values: Die[]): DiceSource {
  const queue = [...values];
  return {
    rollDie(): Die {
      const die = queue.shift();
      if (die === undefined) {
        throw new Error('scripted dice exhausted');
      }
      return die;
    },
  };
}
