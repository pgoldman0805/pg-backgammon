/** Tests for the display-name rules shared by the room and the client. */

import { sanitizeName } from './names';
import { MAX_NAME_LENGTH } from './protocol';

describe('sanitizeName', () => {
  it.each([
    ['Alice', 'Alice'],
    ['  Alice  ', 'Alice'],
    ['Alice   B', 'Alice B'],
    ['Al\u0000ice\n', 'Alice'],
  ])('cleans %j to %j', (raw, expected) => {
    expect(sanitizeName(raw)).toBe(expected);
  });

  it.each([[''], ['   '], [42], [null], [undefined], [{}]])(
    'rejects %j',
    (raw) => {
      expect(sanitizeName(raw)).toBeNull();
    },
  );

  it('truncates to the maximum length', () => {
    expect(sanitizeName('x'.repeat(MAX_NAME_LENGTH + 10))).toBe(
      'x'.repeat(MAX_NAME_LENGTH),
    );
  });
});
