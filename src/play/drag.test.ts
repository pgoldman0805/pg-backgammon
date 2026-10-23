import { DRAG_THRESHOLD, dragTransition, idleDrag } from './drag';

describe('drag state machine', () => {
  it('treats press and release without travel as a click', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, { type: 'down', from: 24, x: 5, y: 5 }));

    const { state: after, command } = dragTransition(state, {
      type: 'up',
      x: 5,
      y: 5,
    });

    expect(command).toEqual({ kind: 'click', from: 24 });
    expect(after.kind).toBe('idle');
  });

  it('tolerates jitter below the threshold as a click', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, { type: 'down', from: 24, x: 5, y: 5 }));
    ({ state } = dragTransition(state, {
      type: 'move',
      x: 5 + DRAG_THRESHOLD - 1,
      y: 5,
    }));

    const { command } = dragTransition(state, {
      type: 'up',
      x: 5 + DRAG_THRESHOLD - 1,
      y: 5,
    });

    expect(command).toEqual({ kind: 'click', from: 24 });
  });

  it('becomes a drag past the threshold and drops at the release point', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 'bar',
      x: 10,
      y: 10,
    }));
    ({ state } = dragTransition(state, { type: 'move', x: 60, y: 200 }));

    expect(state.kind).toBe('dragging');

    const { state: after, command } = dragTransition(state, {
      type: 'up',
      x: 300,
      y: 400,
    });

    expect(command).toEqual({ kind: 'drop', from: 'bar', x: 300, y: 400 });
    expect(after.kind).toBe('idle');
  });

  it('keeps following the pointer while dragging', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, { type: 'down', from: 6, x: 0, y: 0 }));
    ({ state } = dragTransition(state, { type: 'move', x: 50, y: 50 }));
    ({ state } = dragTransition(state, { type: 'move', x: 80, y: 90 }));

    expect(state).toMatchObject({ kind: 'dragging', from: 6, x: 80, y: 90 });
  });

  it('cancel aborts without any command', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, { type: 'down', from: 6, x: 0, y: 0 }));
    ({ state } = dragTransition(state, { type: 'move', x: 50, y: 50 }));

    const { state: after, command } = dragTransition(state, {
      type: 'cancel',
    });

    expect(command).toBeUndefined();
    expect(after.kind).toBe('idle');
  });

  it('ignores stray moves and releases while idle', () => {
    const idle = idleDrag();
    expect(dragTransition(idle, { type: 'move', x: 1, y: 1 }).state).toBe(idle);
    expect(dragTransition(idle, { type: 'up', x: 1, y: 1 }).command).toBe(
      undefined,
    );
  });
});
