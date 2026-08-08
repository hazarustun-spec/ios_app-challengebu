import { describe, expect, test } from 'bun:test';
import { sanitizeOtp } from '../../lib/otp-code';

const LEN = 6;

describe('sanitizeOtp', () => {
  test('keeps a full typed code intact', () => {
    expect(sanitizeOtp('424242', LEN)).toBe('424242');
  });

  test('keeps a partially typed code', () => {
    expect(sanitizeOtp('42', LEN)).toBe('42');
  });

  // The old per-cell inputs were maxLength={1} and kept only `slice(-1)`, so
  // pasting the review code left a single digit behind.
  test('accepts the whole code in one paste', () => {
    expect(sanitizeOtp('424242', LEN)).toHaveLength(LEN);
  });

  test('strips the separators a copied code carries', () => {
    expect(sanitizeOtp('42-42 42', LEN)).toBe('424242');
    expect(sanitizeOtp('42.42.42', LEN)).toBe('424242');
  });

  test('drops non-digits instead of storing them', () => {
    expect(sanitizeOtp('4a2b4c2d4e2f', LEN)).toBe('424242');
  });

  test('never grows past the expected length', () => {
    expect(sanitizeOtp('4242424242', LEN)).toBe('424242');
  });

  test('empties out when everything is erased', () => {
    expect(sanitizeOtp('', LEN)).toBe('');
  });
});
