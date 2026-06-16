import { describe, expect, it } from 'bun:test';
import {
  formatOpponentName,
  myPerspective,
  myTeam,
  opponentIds,
} from '../match-opponent';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ME = 'user-me';
const OPP = 'user-opp';
const PARTNER = 'user-partner';
const OPP2 = 'user-opp2';

function baseMatch(overrides: Partial<{
  team_a: string[];
  team_b: string[];
  score_a: number;
  score_b: number;
  winner: 'a' | 'b' | 'void' | null;
  before_a: number | null;
  after_a: number | null;
  before_b: number | null;
  after_b: number | null;
}> = {}) {
  return {
    team_a_player_ids: overrides.team_a ?? [ME],
    team_b_player_ids: overrides.team_b ?? [OPP],
    score_team_a: overrides.score_a ?? 6,
    score_team_b: overrides.score_b ?? 3,
    winner_team: overrides.winner !== undefined ? overrides.winner : 'a' as const,
    rating_before_team_a: overrides.before_a !== undefined ? overrides.before_a : 1200,
    rating_after_team_a: overrides.after_a !== undefined ? overrides.after_a : 1215,
    rating_before_team_b: overrides.before_b !== undefined ? overrides.before_b : 1200,
    rating_after_team_b: overrides.after_b !== undefined ? overrides.after_b : 1185,
  };
}

// ---------------------------------------------------------------------------
// myTeam
// ---------------------------------------------------------------------------

describe('myTeam', () => {
  it('returns "a" when myId is on team A', () => {
    expect(myTeam(baseMatch(), ME)).toBe('a');
  });

  it('returns "b" when myId is on team B', () => {
    expect(myTeam(baseMatch(), OPP)).toBe('b');
  });

  it('returns null when myId is not on either team', () => {
    expect(myTeam(baseMatch(), 'unknown-id')).toBeNull();
  });

  it('works for doubles — returns "a" for team-A partner', () => {
    const m = baseMatch({ team_a: [ME, PARTNER], team_b: [OPP, OPP2] });
    expect(myTeam(m, PARTNER)).toBe('a');
  });

  it('works for doubles — returns "b" for team-B player', () => {
    const m = baseMatch({ team_a: [ME, PARTNER], team_b: [OPP, OPP2] });
    expect(myTeam(m, OPP2)).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// opponentIds
// ---------------------------------------------------------------------------

describe('opponentIds', () => {
  it('returns team B ids when I am on team A (singles)', () => {
    expect(opponentIds(baseMatch(), ME)).toEqual([OPP]);
  });

  it('returns team A ids when I am on team B (singles)', () => {
    expect(opponentIds(baseMatch(), OPP)).toEqual([ME]);
  });

  it('returns both team-B ids when I am on team A (doubles)', () => {
    const m = baseMatch({ team_a: [ME, PARTNER], team_b: [OPP, OPP2] });
    expect(opponentIds(m, ME)).toEqual([OPP, OPP2]);
  });

  it('returns team-B ids as fallback when myId is not found', () => {
    const m = baseMatch();
    expect(opponentIds(m, 'nobody')).toEqual([OPP]);
  });
});

// ---------------------------------------------------------------------------
// myPerspective
// ---------------------------------------------------------------------------

describe('myPerspective', () => {
  it('win + correct score orientation when I am team A and winner is A', () => {
    const p = myPerspective(baseMatch({ score_a: 6, score_b: 3, winner: 'a' }), ME);
    expect(p.won).toBe(true);
    expect(p.myScore).toBe(6);
    expect(p.oppScore).toBe(3);
  });

  it('loss when I am team A and winner is B', () => {
    const p = myPerspective(baseMatch({ score_a: 2, score_b: 6, winner: 'b' }), ME);
    expect(p.won).toBe(false);
    expect(p.myScore).toBe(2);
    expect(p.oppScore).toBe(6);
  });

  it('win + inverted score when I am team B and winner is B', () => {
    const p = myPerspective(
      baseMatch({ score_a: 3, score_b: 6, winner: 'b', team_a: [OPP], team_b: [ME] }),
      ME,
    );
    expect(p.won).toBe(true);
    expect(p.myScore).toBe(6);
    expect(p.oppScore).toBe(3);
  });

  it('won = null when winner_team is null (match pending)', () => {
    const p = myPerspective(baseMatch({ winner: null }), ME);
    expect(p.won).toBeNull();
  });

  it('won = null when winner_team is "void"', () => {
    const p = myPerspective(baseMatch({ winner: 'void' }), ME);
    expect(p.won).toBeNull();
  });

  it('positive eloDelta when team A rating went up', () => {
    const p = myPerspective(
      baseMatch({ before_a: 1200, after_a: 1215 }),
      ME,
    );
    expect(p.eloDelta).toBe(15);
  });

  it('negative eloDelta when team A rating went down', () => {
    const p = myPerspective(
      baseMatch({ before_a: 1200, after_a: 1180 }),
      ME,
    );
    expect(p.eloDelta).toBe(-20);
  });

  it('eloDelta is null when rating_after is null', () => {
    const p = myPerspective(
      baseMatch({ before_a: 1200, after_a: null }),
      ME,
    );
    expect(p.eloDelta).toBeNull();
  });

  it('eloDelta is null when rating_before is null', () => {
    const p = myPerspective(
      baseMatch({ before_a: null, after_a: 1215 }),
      ME,
    );
    expect(p.eloDelta).toBeNull();
  });

  it('uses team A as fallback and returns a result when myId not found', () => {
    const p = myPerspective(baseMatch(), 'nobody');
    // Should not throw; returns team A perspective by fallback
    expect(p.myScore).toBe(6);
    expect(p.oppScore).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// formatOpponentName
// ---------------------------------------------------------------------------

describe('formatOpponentName', () => {
  it('returns "Bilinmeyen oyuncu" for empty array', () => {
    expect(formatOpponentName([])).toBe('Bilinmeyen oyuncu');
  });

  it('formats singles as "First Last"', () => {
    expect(formatOpponentName([{ first_name: 'Berk', last_name: 'Aydın' }])).toBe('Berk Aydın');
  });

  it('formats doubles as "First & First"', () => {
    expect(
      formatOpponentName([
        { first_name: 'Ali', last_name: 'Veli' },
        { first_name: 'Can', last_name: 'Öz' },
      ]),
    ).toBe('Ali & Can');
  });
});
