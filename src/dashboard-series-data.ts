import { useEffect, useRef, useState } from "react";
import { getDashboardSeries, type DashboardSeriesResponse } from "./api";

export type DashboardRange = { start: string; end: string };

export function utcPreset(days: number): DashboardRange {
  const today = new Date();
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function useDashboardSeries(range: DashboardRange, compare: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data: DashboardSeriesResponse | null;
    error: boolean;
  }>({ key: "", data: null, error: false });
  const requestNumber = useRef(0);
  const key = `${range.start}|${range.end}|${compare}|${attempt}`;
  useEffect(() => {
    const currentRequest = ++requestNumber.current;
    void getDashboardSeries(range.start, range.end, compare)
      .then((data) => {
        if (currentRequest === requestNumber.current)
          setState({ key, data, error: false });
      })
      .catch(() => {
        if (currentRequest === requestNumber.current)
          setState({ key, data: null, error: true });
      });
    return () => {
      requestNumber.current += 1;
    };
  }, [range.start, range.end, compare, key]);
  return {
    data: state.key === key ? state.data : null,
    loading: state.key !== key,
    error: state.key === key && state.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
