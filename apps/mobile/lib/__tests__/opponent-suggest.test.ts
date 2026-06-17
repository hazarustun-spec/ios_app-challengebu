import { describe, expect, test } from 'bun:test';
import { scoreCandidates, type Candidate, type Me } from '../opponent-suggest';

const me: Me = {
  userId: 'me',
  rating: 1500,
  availability: ['mon-eve', 'wed-eve'],
  blocked: new Set(['x']),
};

const base = (over: Partial<Candidate>): Candidate => ({
  userId: 'c',
  name: 'C',
  rating: 1500,
  availability: [],
  playedDaysAgo: null,
  ...over,
});

describe('scoreCandidates', () => {
  test('closer ELO scores higher', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'far', rating: 1800 }),
      base({ userId: 'near', rating: 1510 }),
    ]);
    expect(out[0].userId).toBe('near');
  });

  test('availability overlap boosts', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'none', availability: ['fri-am'] }),
      base({ userId: 'overlap', availability: ['mon-eve'] }),
    ]);
    expect(out[0].userId).toBe('overlap');
  });

  test('recently played is penalized vs never played', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'recent', playedDaysAgo: 2 }),
      base({ userId: 'fresh', playedDaysAgo: null }),
    ]);
    expect(out[0].userId).toBe('fresh');
  });

  test('excludes self and blocked', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'me' }),
      base({ userId: 'x' }),
      base({ userId: 'ok' }),
    ]);
    expect(out.map((c) => c.userId)).toEqual(['ok']);
  });

  test('attaches a numeric score and sorts descending', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'a', rating: 1505 }),
      base({ userId: 'b', rating: 1700 }),
    ]);
    expect(typeof out[0].score).toBe('number');
    expect(out[0].score).toBeGreaterThanOrEqual(out[1].score);
  });
});
