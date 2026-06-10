import { describe, expect, test } from 'bun:test';
import { tokens, colors } from '../tokens';

describe('design tokens', () => {
  test('snapshot — guards accidental changes', () => {
    expect(tokens).toMatchSnapshot();
  });

  test('all colors are valid hex format', () => {
    for (const [, value] of Object.entries(colors)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('typography scale has all required variants', () => {
    const expectedVariants = ['display', 'h1', 'h2', 'h3', 'bodyLg', 'body', 'caption', 'label', 'num'];
    for (const v of expectedVariants) {
      expect(tokens.typography).toHaveProperty(v);
    }
  });

  test('spacing scale uses 4-based progression', () => {
    expect(tokens.spacing[1]).toBe(4);
    expect(tokens.spacing[2]).toBe(8);
    expect(tokens.spacing[8]).toBe(40);
  });
});
