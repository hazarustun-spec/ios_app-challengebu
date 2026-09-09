// Guards the bug that made two phones show the same match with the scores
// swapped: the score screen assumed the signed-in player was always team A.
//
// Every case below is written from the TEAM-B player's point of view, because
// that is the half of every match the old code got wrong — and the half the
// operator, who plays on team A in the matches he creates, could not see.

import { describe, expect, test } from 'bun:test';
import { resolveMatchSides, toPerspective, toTeams } from '../match-sides';

const ALICE = 'alice-uuid';
const BOB = 'bob-uuid';
const CAROL = 'carol-uuid';

const singles = { team_a_player_ids: [ALICE], team_b_player_ids: [BOB] };
const doubles = {
  team_a_player_ids: [ALICE, 'ann-uuid'],
  team_b_player_ids: [BOB, 'ben-uuid'],
};

describe('resolveMatchSides', () => {
  test('a team-A player is on side a', () => {
    expect(resolveMatchSides(singles, ALICE)).toEqual({
      mine: 'a',
      theirs: 'b',
      resolved: true,
    });
  });

  test('a team-B player is on side b — not side a', () => {
    expect(resolveMatchSides(singles, BOB)).toEqual({
      mine: 'b',
      theirs: 'a',
      resolved: true,
    });
  });

  test('doubles partners resolve to their own team', () => {
    expect(resolveMatchSides(doubles, 'ben-uuid').mine).toBe('b');
    expect(resolveMatchSides(doubles, 'ann-uuid').mine).toBe('a');
  });

  test('a non-participant is reported unresolved', () => {
    const sides = resolveMatchSides(singles, CAROL);
    expect(sides.resolved).toBe(false);
  });

  test('a missing match or signed-out viewer is unresolved, never silently team A', () => {
    expect(resolveMatchSides(null, ALICE).resolved).toBe(false);
    expect(resolveMatchSides(singles, undefined).resolved).toBe(false);
    // The old code's fallback WAS team A, which is how a viewer with no user id
    // ended up scoring for the wrong side.
    expect(resolveMatchSides(null, null).mine).not.toBe('a');
  });
});

describe('toPerspective', () => {
  test('team-A player reads the team-A score as their own', () => {
    const sides = resolveMatchSides(singles, ALICE);
    expect(toPerspective(sides, 4, 2)).toEqual({ mine: 4, theirs: 2 });
  });

  test('team-B player reads the team-B score as their own', () => {
    const sides = resolveMatchSides(singles, BOB);
    // The reported bug in one line: Bob used to see 4 here.
    expect(toPerspective(sides, 4, 2)).toEqual({ mine: 2, theirs: 4 });
  });

  test('works for names as well as numbers', () => {
    const sides = resolveMatchSides(singles, BOB);
    expect(toPerspective(sides, 'Ali', 'Bora')).toEqual({ mine: 'Bora', theirs: 'Ali' });
  });
});

describe('toTeams', () => {
  test('a team-A player submitting 4-2 sends 4-2', () => {
    const sides = resolveMatchSides(singles, ALICE);
    expect(toTeams(sides, 4, 2)).toEqual({ a: 4, b: 2 });
  });

  test('a team-B player submitting "I won 4-2" sends 2-4', () => {
    const sides = resolveMatchSides(singles, BOB);
    expect(toTeams(sides, 4, 2)).toEqual({ a: 2, b: 4 });
  });

  test('both players describing the same match submit the SAME team score', () => {
    // Alice won 4-2. Each describes it from their own side; the two
    // submissions have to land on identical team values or the match never
    // settles — which is exactly what was happening.
    const alice = toTeams(resolveMatchSides(singles, ALICE), 4, 2);
    const bob = toTeams(resolveMatchSides(singles, BOB), 2, 4);
    expect(alice).toEqual(bob);
  });

  test('round-trips through toPerspective', () => {
    for (const who of [ALICE, BOB]) {
      const sides = resolveMatchSides(singles, who);
      const { mine, theirs } = toPerspective(sides, 7, 3);
      expect(toTeams(sides, mine, theirs)).toEqual({ a: 7, b: 3 });
    }
  });
});
