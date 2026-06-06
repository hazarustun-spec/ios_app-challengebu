import { describe, expect, test } from 'bun:test';
import {
  matchResultSchema,
  buKlasikScoreDetail,
  threeSetScoreDetail,
} from '../../src/schemas/match-result.js';

describe('buKlasikScoreDetail', () => {
  test('accepts valid el sequence', () => {
    const result = buKlasikScoreDetail.safeParse({
      els: [
        { el: 1, winner: 'a' },
        { el: 2, winner: 'a' },
        { el: 3, winner: 'b' },
        { el: 4, winner: 'a' },
        { el: 5, winner: 'a' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('rejects empty els', () => {
    const result = buKlasikScoreDetail.safeParse({ els: [] });
    expect(result.success).toBe(false);
  });

  test('rejects non-sequential el numbers', () => {
    const result = buKlasikScoreDetail.safeParse({
      els: [
        { el: 1, winner: 'a' },
        { el: 3, winner: 'b' },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('rejects more than 7 els', () => {
    const result = buKlasikScoreDetail.safeParse({
      els: Array.from({ length: 8 }, (_, i) => ({ el: i + 1, winner: 'a' as const })),
    });
    expect(result.success).toBe(false);
  });
});

describe('threeSetScoreDetail', () => {
  test('accepts valid 2-set match', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [
        { set: 1, a: 6, b: 4 },
        { set: 2, a: 6, b: 3 },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('accepts valid 3-set match', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [
        { set: 1, a: 6, b: 4 },
        { set: 2, a: 3, b: 6 },
        { set: 3, a: 7, b: 5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('rejects 4-set match', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [
        { set: 1, a: 6, b: 4 },
        { set: 2, a: 6, b: 4 },
        { set: 3, a: 6, b: 4 },
        { set: 4, a: 6, b: 4 },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('rejects negative game count', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [{ set: 1, a: 6, b: -1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('matchResultSchema', () => {
  test('accepts bu_klasik result', () => {
    const result = matchResultSchema.safeParse({
      matchId: '00000000-0000-0000-0000-000000000001',
      format: 'bu_klasik',
      scoreTeamA: 4,
      scoreTeamB: 2,
      winnerTeam: 'a',
      scoreDetails: {
        els: [
          { el: 1, winner: 'a' },
          { el: 2, winner: 'a' },
          { el: 3, winner: 'b' },
          { el: 4, winner: 'b' },
          { el: 5, winner: 'a' },
          { el: 6, winner: 'a' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  test('rejects winner team mismatch with scores', () => {
    const result = matchResultSchema.safeParse({
      matchId: '00000000-0000-0000-0000-000000000001',
      format: 'bu_klasik',
      scoreTeamA: 2,
      scoreTeamB: 4,
      winnerTeam: 'a', // wrong: A has fewer
      scoreDetails: {
        els: [
          { el: 1, winner: 'b' },
          { el: 2, winner: 'b' },
          { el: 3, winner: 'a' },
          { el: 4, winner: 'b' },
          { el: 5, winner: 'a' },
          { el: 6, winner: 'b' },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  test('accepts voided result (3-3 in bu_klasik)', () => {
    const result = matchResultSchema.safeParse({
      matchId: '00000000-0000-0000-0000-000000000001',
      format: 'bu_klasik',
      scoreTeamA: 3,
      scoreTeamB: 3,
      winnerTeam: 'void',
      scoreDetails: {
        els: [
          { el: 1, winner: 'a' },
          { el: 2, winner: 'b' },
          { el: 3, winner: 'a' },
          { el: 4, winner: 'b' },
          { el: 5, winner: 'a' },
          { el: 6, winner: 'b' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});
