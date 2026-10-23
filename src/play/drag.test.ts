import {
  DOUBLE_CLICK_MS,
  DRAG_THRESHOLD,
  type DragState,
  dragTransition,
  idleDrag,
} from './drag';

/** Press and release without travel: one click on `from` at time `at`. */
function click(state: DragState, from: number | 'bar', at: number) {
  ({ state } = dragTransition(state, { type: 'down', from, x: 5, y: 5, at }));
  return dragTransition(state, { type: 'up', x: 5, y: 5 });
}

describe('drag state machine', () => {
  it('treats press and release without travel as a click', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 24,
      x: 5,
      y: 5,
      at: 0,
    }));

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
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 24,
      x: 5,
      y: 5,
      at: 0,
    }));
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
      at: 0,
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
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 6,
      x: 0,
      y: 0,
      at: 0,
    }));
    ({ state } = dragTransition(state, { type: 'move', x: 50, y: 50 }));
    ({ state } = dragTransition(state, { type: 'move', x: 80, y: 90 }));

    expect(state).toMatchObject({ kind: 'dragging', from: 6, x: 80, y: 90 });
  });

  it('cancel aborts without any command', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 6,
      x: 0,
      y: 0,
      at: 0,
    }));
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

describe('double-click detection', () => {
  it('turns a second click on the same origin within the window into a dblclick', () => {
    const first = click(idleDrag(), 24, 0);
    expect(first.command).toEqual({ kind: 'click', from: 24 });

    const second = click(first.state, 24, DOUBLE_CLICK_MS - 1);
    expect(second.command).toEqual({ kind: 'dblclick', from: 24 });
    expect(second.state.kind).toBe('idle');
  });

  it('keeps two slow clicks as two clicks', () => {
    const first = click(idleDrag(), 24, 0);
    const second = click(first.state, 24, DOUBLE_CLICK_MS + 1);
    expect(second.command).toEqual({ kind: 'click', from: 24 });
  });

  it('keeps rapid clicks on different origins as plain clicks', () => {
    const first = click(idleDrag(), 24, 0);
    const second = click(first.state, 13, 50);
    expect(second.command).toEqual({ kind: 'click', from: 13 });
  });

  it('treats a third rapid click as a fresh click, not another dblclick', () => {
    const first = click(idleDrag(), 24, 0);
    const second = click(first.state, 24, 50);
    expect(second.command).toEqual({ kind: 'dblclick', from: 24 });

    const third = click(second.state, 24, 100);
    expect(third.command).toEqual({ kind: 'click', from: 24 });
  });

  it('still drags when the second press travels past the threshold', () => {
    const first = click(idleDrag(), 24, 0);
    let state = first.state;
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 24,
      x: 5,
      y: 5,
      at: 50,
    }));
    ({ state } = dragTransition(state, { type: 'move', x: 60, y: 200 }));
    expect(state.kind).toBe('dragging');

    const { command } = dragTransition(state, { type: 'up', x: 60, y: 200 });
    expect(command).toEqual({ kind: 'drop', from: 24, x: 60, y: 200 });
  });

  it('does not chain a dblclick off a drop', () => {
    let state = idleDrag();
    ({ state } = dragTransition(state, {
      type: 'down',
      from: 24,
      x: 5,
      y: 5,
      at: 0,
    }));
    ({ state } = dragTransition(state, { type: 'move', x: 60, y: 200 }));
    ({ state } = dragTransition(state, { type: 'up', x: 60, y: 200 }));

    const after = click(state, 24, 10);
    expect(after.command).toEqual({ kind: 'click', from: 24 });
  });
});
