// Guard against the NativeWind interop bug that silently deleted styles.
//
// `babel.config.js` sets `jsxImportSource: 'nativewind'`, so every JSX element
// in this app is routed through NativeWind's `wrapJSX` → `interop()`. That
// helper *spreads* the `style` prop to merge className-derived styles into it.
// Spreading a function yields `{}` — so React Native's perfectly legal
// function form,
//
//     <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
//
// resolves to an empty object and every rule in it is dropped. No warning, no
// error: the component just renders unstyled. This produced two separate live
// bugs (off-centre avatar names, a "Reddedildi" chip running off-screen) that
// looked unrelated until the shared cause turned up, plus four more latent
// occurrences found in the sweep (b39e7fb).
//
// The fix in every case is a plain object plus `active:` utilities on the
// className for press feedback. This test stops the pattern coming back.
//
// Biome can't express this: custom rules (GritQL plugins) landed in Biome 2,
// and this repo is on 1.9.4. A source scan in the existing `bun test` run is
// the cheapest gate that actually runs in CI.

import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_ROOT = join(import.meta.dir, '..', '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'stores'];

// `style={(` catches the arrow form regardless of the destructured argument
// name (`pressed`, `focused`, or a bare `state`), including the multi-line
// layout Biome's 100-column formatter produces.
const FUNCTION_STYLE = /style=\{\s*\(/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('NativeWind interop safety', () => {
  it('has no function-form style props', () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      const full = join(APP_ROOT, dir);
      let files: string[];
      try {
        files = walk(full);
      } catch {
        continue; // directory may not exist in every checkout
      }
      for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (FUNCTION_STYLE.test(line)) {
            offenders.push(`${relative(APP_ROOT, file)}:${i + 1}: ${line.trim()}`);
          }
        });
      }
    }

    expect(
      offenders,
      offenders.length === 0
        ? ''
        : [
            "Function-form `style` props found. NativeWind's interop spreads the",
            'style prop, and spreading a function yields {} — every rule is dropped',
            'silently. Use a plain object and move press feedback to `active:` on',
            'the className:',
            '',
            ...offenders,
          ].join('\n'),
    ).toEqual([]);
  });
});
