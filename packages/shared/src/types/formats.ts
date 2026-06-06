export const ALL_FORMATS = ['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik'] as const;

export type MatchFormat = (typeof ALL_FORMATS)[number];

export interface FormatRule {
  readonly displayName: string;
  readonly approximateDuration: number;
  readonly targetUnits: number;
  readonly unitName: 'el' | 'game' | 'set' | 'point';
  readonly canVoidAtTie: boolean;
  readonly description: string;
}

export const FORMAT_RULES: Record<MatchFormat, FormatRule> = {
  bu_klasik: {
    displayName: 'BÜ Klasik',
    approximateDuration: 60,
    targetUnits: 4,
    unitName: 'el',
    canVoidAtTie: true,
    description:
      '4 el alan kazanır. Sayılar 15/30/40/avantaj. 3-3 olursa Maçı Bitir → maç yapılmamış sayılır.',
  },
  hizli_tiebreak: {
    displayName: 'Hızlı Tiebreak',
    approximateDuration: 20,
    targetUnits: 10,
    unitName: 'point',
    canVoidAtTie: false,
    description: 'Sadece 10 sayılık match tiebreak. 2 sayı farkla bitirilir.',
  },
  pro_set_8: {
    displayName: 'Pro Set 8',
    approximateDuration: 75,
    targetUnits: 8,
    unitName: 'game',
    canVoidAtTie: false,
    description: 'İlk 8 game alan kazanır. 6-6 olursa tiebreak.',
  },
  '3set_klasik': {
    displayName: '3 Set Klasik',
    approximateDuration: 120,
    targetUnits: 2,
    unitName: 'set',
    canVoidAtTie: false,
    description: 'ATP standardı. 2 set alan kazanır. 6-6 olursa tiebreak.',
  },
};
