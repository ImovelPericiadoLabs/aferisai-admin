import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  listAnalysisAttention,
  listOnrPreviewAttempts,
  listPaymentExceptions,
  listPendingSourceClassifications,
  listUncertainSubmissions,
  type TeamMember,
} from "./api";
import { useTeamNames } from "./useTeamNames";
import {
  analysisTask,
  caseTask,
  previewTask,
  sendTask,
  sortTasks,
  sourceTask,
  type Task,
} from "./work-queue-model";

type Role = TeamMember["role"];

/** Loads every queue the person may work on and merges them into one list; a queue that fails is named, not hidden. */
export function useWorkQueue({
  role,
  memberId,
  onUnauthorized,
}: {
  role: Role;
  memberId: string;
  onUnauthorized: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const names = useTeamNames(role);
  const person = useCallback(
    (id: string | null) =>
      !id
        ? "Sem responsável"
        : id === memberId
          ? "Você"
          : (names[id] ?? "Outra pessoa"),
    [memberId, names],
  );
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => {
    unauthorized.current = onUnauthorized;
  });

  const load = useCallback(async () => {
    const canReview = role === "administrator" || role === "manager";
    const now = Date.now();
    const sources: { name: string; run: () => Promise<Task[]> }[] = [
      {
        name: "Casos pagos sem entrega",
        run: async () =>
          (await listPaymentExceptions(undefined, "open")).items.map((item) =>
            caseTask(item, role, memberId, person, now),
          ),
      },
    ];
    if (canReview)
      sources.push(
        {
          name: "Envios ao fornecedor",
          run: async () =>
            (await listUncertainSubmissions(undefined, "active")).items
              .map(sendTask)
              .filter((task): task is Task => task !== null),
        },
        {
          name: "Prévias do ONR",
          run: async () =>
            (await listOnrPreviewAttempts()).items.map(previewTask),
        },
        {
          name: "Análises",
          run: async () =>
            (await listAnalysisAttention()).items.map(analysisTask),
        },
        {
          name: "Arquivos dos clientes",
          run: async () =>
            (await listPendingSourceClassifications()).items.map((item) =>
              sourceTask(item, now),
            ),
        },
      );
    const results = await Promise.allSettled(
      sources.map((source) => source.run()),
    );
    const next: Task[] = [];
    const problems: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") next.push(...result.value);
      else if (
        result.reason instanceof ApiError &&
        result.reason.status === 401
      )
        unauthorized.current();
      else problems.push(sources[index].name);
    });
    setTasks(sortTasks(next));
    setFailed(problems);
    setLoadedAt(now);
    setLoading(false);
  }, [memberId, person, role]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  return useMemo(
    () => ({ tasks, loading, failed, loadedAt, reload: load }),
    [tasks, loading, failed, loadedAt, load],
  );
}
