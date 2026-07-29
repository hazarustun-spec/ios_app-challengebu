// Format-rules gate tests.
//
// Ranking matches require the player to read the format rules before the
// challenge can be sent. Friendly matches never do. Acknowledgement is
// per-format: switching format after reading re-arms the gate.

import { describe, expect, test } from 'bun:test';
import { rulesGateState } from '../rules-gate';

describe('rulesGateState', () => {
  test('friendly matches never require the rules', () => {
    expect(rulesGateState('friendly', 'klasik', null)).toBe('not-required');
  });

  test('friendly stays not-required even after an acknowledgement', () => {
    expect(rulesGateState('friendly', 'klasik', 'klasik')).toBe('not-required');
  });

  test('ranking match with no acknowledgement is unread', () => {
    expect(rulesGateState('ranking', 'klasik', null)).toBe('unread');
  });

  test('ranking match acknowledged for the selected format is read', () => {
    expect(rulesGateState('ranking', 'klasik', 'klasik')).toBe('read');
  });

  test('changing format after reading re-arms the gate', () => {
    expect(rulesGateState('ranking', 'kisa', 'klasik')).toBe('unread');
  });
});
