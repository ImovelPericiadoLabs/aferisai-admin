import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardMetrics, type DashboardMetrics } from "./api";
import type { DashboardDestination, DashboardRole } from "./dashboard-model";

export type DashboardPageProps = {
  role: DashboardRole;
  navigate: (page: DashboardDestination) => void;
};

type DashboardState = {
  data: DashboardMetrics | null;
  fetchedAt: Date | null;
  loading: boolean;
  error: boolean;
};

export function useDashboardData() {
  const requestNumber = useRef(0);
  const [state, setState] = useState<DashboardState>({
    data: null,
    fetchedAt: null,
    loading: true,
    error: false,
  });

  const refresh = useCallback(() => {
    const currentRequest = ++requestNumber.current;
    setState((previous) => ({ ...previous, loading: true, error: false }));
    void getDashboardMetrics()
      .then((data) => {
        if (currentRequest === requestNumber.current)
          setState({
            data,
            fetchedAt: new Date(),
            loading: false,
            error: false,
          });
      })
      .catch(() => {
        if (currentRequest === requestNumber.current)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: true,
          }));
      });
  }, []);

  useEffect(() => {
    const currentRequest = ++requestNumber.current;
    void getDashboardMetrics()
      .then((data) => {
        if (currentRequest === requestNumber.current)
          setState({
            data,
            fetchedAt: new Date(),
            loading: false,
            error: false,
          });
      })
      .catch(() => {
        if (currentRequest === requestNumber.current)
          setState((previous) => ({
            ...previous,
            loading: false,
            error: true,
          }));
      });
    return () => {
      requestNumber.current += 1;
    };
  }, []);
  return { ...state, refresh };
}
