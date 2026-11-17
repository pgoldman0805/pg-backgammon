/** Tests for the room HTTP client against a recording fake fetch. */

import { describe, expect, it } from 'vitest';
import { createRemoteApi } from './api';

function fake(status: number, body: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

describe('createRoom', () => {
  it('posts the length and returns the body on 201', async () => {
    const body = { roomId: 'r1', side: 'white', seatToken: 't' };
    const { calls, fetchFn } = fake(201, body);
    const api = createRemoteApi(fetchFn, 'https://h.test');
    await expect(api.createRoom(5)).resolves.toEqual(body);
    expect(calls[0].url).toBe('https://h.test/api/rooms');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe(JSON.stringify({ length: 5 }));
    expect(new Headers(calls[0].init?.headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('throws on other statuses', async () => {
    const api = createRemoteApi(fake(500, {}).fetchFn);
    await expect(api.createRoom(5)).rejects.toThrow('create-failed:500');
  });
});

describe('getRoom', () => {
  it('returns the summary on 200 and null on 404', async () => {
    const summary = { roomId: 'r1' };
    const ok = fake(200, summary);
    await expect(createRemoteApi(ok.fetchFn).getRoom('r1')).resolves.toEqual(
      summary,
    );
    expect(ok.calls[0].url).toBe('/api/rooms/r1');
    await expect(
      createRemoteApi(fake(404, {}).fetchFn).getRoom('r1'),
    ).resolves.toBeNull();
  });

  it('throws on other statuses', async () => {
    await expect(
      createRemoteApi(fake(500, {}).fetchFn).getRoom('r1'),
    ).rejects.toThrow();
  });
});

describe('joinRoom', () => {
  it('maps 200, 409, 404 and failures', async () => {
    const body = { side: 'black', seatToken: 't' };
    const ok = fake(200, body);
    await expect(createRemoteApi(ok.fetchFn).joinRoom('r1')).resolves.toEqual(
      body,
    );
    expect(ok.calls[0].url).toBe('/api/rooms/r1/join');
    expect(ok.calls[0].init?.method).toBe('POST');
    await expect(
      createRemoteApi(fake(409, {}).fetchFn).joinRoom('r1'),
    ).resolves.toBe('full');
    await expect(
      createRemoteApi(fake(404, {}).fetchFn).joinRoom('r1'),
    ).resolves.toBeNull();
    await expect(
      createRemoteApi(fake(503, { error: 'busy' }).fetchFn).joinRoom('r1'),
    ).rejects.toThrow();
  });

  it('propagates network errors', async () => {
    const fetchFn = (async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    await expect(createRemoteApi(fetchFn).joinRoom('r1')).rejects.toThrow(
      'offline',
    );
  });
});
