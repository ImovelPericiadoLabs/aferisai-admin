import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadExecutiveReports,
  toExecutiveReports,
  type LoadedReports,
  type ReportSection,
} from "./executive-api";
import type { ExecutiveReports } from "./executive-contract";
import { periodFor, type Period } from "./executive-model";

export type ExecutiveReportsState = {
  period: Period;
  data: ExecutiveReports | null;
  failed: ReportSection[];
  /** True until the first answer for the current window arrives. */
  loading: boolean;
  reload: () => void;
};

/** Loads the executive reports for the last `days` (Brasília) and keeps the screen stable while reloading. */
export function useExecutiveReports(
  days: number,
  compare: boolean,
  onUnauthorized: () => void,
  enabled = true,
): ExecutiveReportsState {
  const period = useMemo(() => periodFor(days), [days]);
  const [result, setResult] = useState<LoadedReports | null>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const id = ++latest.current;
    queueMicrotask(() => {
      void loadExecutiveReports(period, compare).then((loaded) => {
        if (id !== latest.current) return;
        if (loaded.unauthorized) onUnauthorized();
        else setResult(loaded);
      });
    });
  }, [period, compare, version, enabled, onUnauthorized]);

  const data = useMemo(
    () => (result ? toExecutiveReports(result.raw) : null),
    [result],
  );
  const reload = useCallback(() => {
    setResult(null);
    setVersion((value) => value + 1);
  }, []);

  return {
    period,
    data,
    failed: result?.failed ?? [],
    loading: result === null,
    reload,
  };
}
