import { beforeEach, describe, expect, test } from 'bun:test';
import { useScoreEntryStore } from '../../stores/score-entry-store';

describe('score-entry-store', () => {
  beforeEach(() => {
    useScoreEntryStore.setState({ drafts: {} });
  });

  test('bu_klasik draft starts empty', () => {
    const d = useScoreEntryStore.getState().getBuKlasik('m1');
    expect(d.els).toEqual([]);
  });

  test('setBuKlasik persists by match id', () => {
    useScoreEntryStore.getState().setBuKlasik('m1', { els: [{ el: 1, winner: 'a' }] });
    expect(useScoreEntryStore.getState().getBuKlasik('m1').els).toEqual([{ el: 1, winner: 'a' }]);
    expect(useScoreEntryStore.getState().getBuKlasik('m2').els).toEqual([]);
  });

  test('hizli_tiebreak default points 0-0', () => {
    const d = useScoreEntryStore.getState().getHizliTiebreak('m1');
    expect(d.points).toEqual({ a: 0, b: 0 });
  });

  test('clear removes specific match draft only', () => {
    useScoreEntryStore.getState().setBuKlasik('m1', { els: [{ el: 1, winner: 'a' }] });
    useScoreEntryStore.getState().setBuKlasik('m2', { els: [{ el: 1, winner: 'b' }] });
    useScoreEntryStore.getState().clear('m1');
    expect(useScoreEntryStore.getState().getBuKlasik('m1').els).toEqual([]);
    expect(useScoreEntryStore.getState().getBuKlasik('m2').els).toEqual([{ el: 1, winner: 'b' }]);
  });
});
