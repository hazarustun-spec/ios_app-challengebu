export type ClassYearValue = 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora' | 'mezun';

const CLASS_YEAR_LABELS: Record<ClassYearValue, string> = {
  hazirlik: 'Hazırlık',
  '1': '1. sınıf',
  '2': '2. sınıf',
  '3': '3. sınıf',
  '4': '4. sınıf',
  yl: 'Yüksek Lisans',
  doktora: 'Doktora',
  mezun: 'Mezun',
};

export function formatClassYear(classYear: string | null | undefined): string | null {
  if (!classYear) return null;
  return CLASS_YEAR_LABELS[classYear as ClassYearValue] ?? classYear;
}
