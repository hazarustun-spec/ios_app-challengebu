// Cancel-eligibility rule tests.
//
// This predicate mirrors the RLS policy in
// `20260619000004_match_request_creator_delete.sql`:
//   using (auth.uid() = creator_id and status = 'pending')
// Keeping the client rule in a pure module means the UI never offers a
// cancel button for a row the database would refuse to delete.

import { describe, expect, test } from 'bun:test';
import { canCancelSentOffer } from '../match-request-rules';

const ME = 'user-me';

describe('canCancelSentOffer', () => {
  test('allows cancelling my own pending request', () => {
    expect(canCancelSentOffer({ creator_id: ME, status: 'pending' }, ME)).toBe(true);
  });

  test('refuses once the request is accepted', () => {
    expect(canCancelSentOffer({ creator_id: ME, status: 'accepted' }, ME)).toBe(false);
  });

  test('refuses rejected, expired and completed requests', () => {
    for (const status of ['rejected', 'expired', 'completed']) {
      expect(canCancelSentOffer({ creator_id: ME, status }, ME)).toBe(false);
    }
  });

  test('refuses a pending request created by someone else', () => {
    expect(canCancelSentOffer({ creator_id: 'user-other', status: 'pending' }, ME)).toBe(false);
  });

  test('refuses when the current user is unknown', () => {
    expect(canCancelSentOffer({ creator_id: ME, status: 'pending' }, undefined)).toBe(false);
  });
});
