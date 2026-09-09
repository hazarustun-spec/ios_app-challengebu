// Which fixed team side is the signed-in player on, and what does that make
// "mine" and "theirs"?
//
// This is one function because it being inline is what let it be wrong. The
// score screen wrote its own version of this — badly: it hard-coded "me" to
// side 'a' rather than looking the player up — and the dispute screen and the
// Live Activity each had their own copy. A team-A player is on side 'a', so the
// wrong version looked right on the operator's own phone; on a team-B player's
// phone the display, the score buttons and the submitted result were all
// mirrored, and the two phones never agreed on the match.
//
// Anything that turns a per-team value into a per-person one goes through here.

export interface MatchSides {
  /** The team side the signed-in player actually plays on. */
  mine: 'a' | 'b';
  /** The other side. */
  theirs: 'a' | 'b';
  /**
   * False when the player could not be found on either team — a spectator, an
   * admin, or a match row that has not loaded yet. `mine` still holds a usable
   * value so callers can render, but nothing should be WRITTEN under this
   * assumption; a screen should wait for the match instead.
   */
  resolved: boolean;
}

export interface TeamMembership {
  team_a_player_ids?: string[] | null;
  team_b_player_ids?: string[] | null;
}

export function resolveMatchSides(
  match: TeamMembership | null | undefined,
  userId: string | null | undefined,
): MatchSides {
  const inA = Boolean(userId && match?.team_a_player_ids?.includes(userId));
  const inB = Boolean(userId && match?.team_b_player_ids?.includes(userId));

  // Membership decides it. Falling back to 'b' rather than 'a' is deliberate:
  // an unresolved viewer must not silently inherit team A, which is exactly the
  // assumption the old code baked in.
  const mine: 'a' | 'b' = inA ? 'a' : 'b';
  return { mine, theirs: mine === 'a' ? 'b' : 'a', resolved: inA || inB };
}

/**
 * Split an absolute (team A, team B) pair into (mine, theirs).
 *
 * Use for anything the server holds per team — a live score, a submitted
 * result, a claimed score in a dispute.
 */
export function toPerspective<T>(sides: MatchSides, a: T, b: T): { mine: T; theirs: T } {
  return sides.mine === 'a' ? { mine: a, theirs: b } : { mine: b, theirs: a };
}

/**
 * The inverse: put a (mine, theirs) pair back onto the fixed team sides before
 * sending it to the server. `finish()` on the score screen used to do this by
 * hand, in the wrong direction, which is why the two players' submissions never
 * matched.
 */
export function toTeams<T>(sides: MatchSides, mine: T, theirs: T): { a: T; b: T } {
  return sides.mine === 'a' ? { a: mine, b: theirs } : { a: theirs, b: mine };
}
