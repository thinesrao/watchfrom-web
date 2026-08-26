export interface DecadeRange {
  label: string;
  startYear: number;
  endYear: number;
}

export const DECADES: DecadeRange[] = [
  { label: "2020s", startYear: 2020, endYear: 2029 },
  { label: "2010s", startYear: 2010, endYear: 2019 },
  { label: "2000s", startYear: 2000, endYear: 2009 },
  { label: "1990s", startYear: 1990, endYear: 1999 },
  { label: "1980s", startYear: 1980, endYear: 1989 },
  { label: "Before 1980", startYear: 1900, endYear: 1979 },
];

export function dateRangeForDecade(decade: DecadeRange): { gte: string; lte: string } {
  return {
    gte: `${decade.startYear}-01-01`,
    lte: `${decade.endYear}-12-31`,
  };
}
