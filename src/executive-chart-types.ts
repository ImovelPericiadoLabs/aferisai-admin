export type TrendPoint = { date: string; value: number };

export type MultiSeries = {
  key: string;
  label: string;
  color: string;
  current: TrendPoint[];
  previous?: TrendPoint[];
};
