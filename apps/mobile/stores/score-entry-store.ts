import { create } from 'zustand';

export type ElWinner = 'a' | 'b';

export interface BuKlasikDraft {
  els: { el: number; winner: ElWinner }[];
}

export interface HizliTiebreakDraft {
  points: { a: number; b: number };
}

export interface ProSet8Draft {
  games: { a: number; b: number };
  tiebreakScore?: { a: number; b: number };
}

export interface ThreeSetKlasikDraft {
  sets: { set: number; a: number; b: number }[];
}

export type DraftByFormat = {
  bu_klasik: BuKlasikDraft;
  hizli_tiebreak: HizliTiebreakDraft;
  pro_set_8: ProSet8Draft;
  '3set_klasik': ThreeSetKlasikDraft;
};

interface State {
  drafts: Record<string, BuKlasikDraft | HizliTiebreakDraft | ProSet8Draft | ThreeSetKlasikDraft>;
  setBuKlasik: (matchId: string, draft: BuKlasikDraft) => void;
  setHizliTiebreak: (matchId: string, draft: HizliTiebreakDraft) => void;
  setProSet8: (matchId: string, draft: ProSet8Draft) => void;
  setThreeSetKlasik: (matchId: string, draft: ThreeSetKlasikDraft) => void;
  clear: (matchId: string) => void;
  getBuKlasik: (matchId: string) => BuKlasikDraft;
  getHizliTiebreak: (matchId: string) => HizliTiebreakDraft;
  getProSet8: (matchId: string) => ProSet8Draft;
  getThreeSetKlasik: (matchId: string) => ThreeSetKlasikDraft;
}

const initialBuKlasik: BuKlasikDraft = { els: [] };
const initialTiebreak: HizliTiebreakDraft = { points: { a: 0, b: 0 } };
const initialProSet: ProSet8Draft = { games: { a: 0, b: 0 } };
const initialThreeSet: ThreeSetKlasikDraft = { sets: [] };

export const useScoreEntryStore = create<State>((set, get) => ({
  drafts: {},
  setBuKlasik: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  setHizliTiebreak: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  setProSet8: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  setThreeSetKlasik: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  clear: (matchId) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[matchId];
      return { drafts: next };
    }),
  getBuKlasik: (matchId) => (get().drafts[matchId] as BuKlasikDraft | undefined) ?? initialBuKlasik,
  getHizliTiebreak: (matchId) => (get().drafts[matchId] as HizliTiebreakDraft | undefined) ?? initialTiebreak,
  getProSet8: (matchId) => (get().drafts[matchId] as ProSet8Draft | undefined) ?? initialProSet,
  getThreeSetKlasik: (matchId) => (get().drafts[matchId] as ThreeSetKlasikDraft | undefined) ?? initialThreeSet,
}));
