import { useCallback, useState } from "react";
import {
  ApiError,
  claimPaymentException,
  confirmPaymentException,
  executePaymentException,
  proposePaymentException,
  reassignPaymentException,
  type PaymentExceptionCase,
} from "./api";
import type { ExecuteAction } from "./exception-panel-model";
import { errorMessage } from "./financial-exceptions-format";

/**
 * Everything a person can do to one financial case (take it, propose, confirm, hand over, execute),
 * with the busy flag and the messages. Shared by the Exceções screen and the Tarefas inbox, so a case
 * behaves the same wherever it is opened.
 */
export function useExceptionActions({
  csrf,
  item,
  onUnauthorized,
  onChanged,
  onFinished,
}: {
  csrf: string;
  item: PaymentExceptionCase | null;
  onUnauthorized: () => void;
  /** Runs after every action, whether it worked or not, to refresh the data. */
  onChanged: () => Promise<unknown>;
  /** Runs when the solution ended the case. */
  onFinished: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reset = useCallback(() => {
    setError("");
    setNotice("");
  }, []);

  async function run(
    work: () => Promise<unknown>,
    success: string,
    fallback: string,
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await work();
      await onChanged();
      setNotice(typeof result === "string" ? result : success);
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        onUnauthorized();
        return false;
      }
      setError(errorMessage(cause, fallback));
      await onChanged();
      return false;
    } finally {
      setBusy(false);
    }
  }

  const claim = () =>
    item &&
    void run(
      () => claimPaymentException(item.id, csrf),
      "Caso atribuído à sua conta.",
      "Não foi possível assumir o caso.",
    );

  const propose = (resolution: "correct" | "refund", reason: string) =>
    item
      ? run(
          () => proposePaymentException(item.id, resolution, reason, csrf),
          "Proposta registrada. Aguarda decisão financeira.",
          "Não foi possível registrar a proposta.",
        )
      : Promise.resolve(false);

  const confirm = (reason: string) =>
    item && item.latest_proposal_id
      ? run(
          () =>
            confirmPaymentException(
              item.id,
              item.latest_proposal_id as string,
              reason,
              csrf,
            ),
          "Decisão financeira registrada. Execute a solução.",
          "Não foi possível registrar a decisão.",
        )
      : Promise.resolve(false);

  const reassign = (
    target: "manager" | "financial",
    newMemberId: string,
    reason: string,
  ) =>
    item
      ? run(
          () =>
            reassignPaymentException(
              item.id,
              target,
              newMemberId,
              reason,
              csrf,
            ),
          "Responsável alterado. O motivo foi registrado no histórico.",
          "Não foi possível reatribuir o caso.",
        )
      : Promise.resolve(false);

  const execute = (action: ExecuteAction) =>
    item &&
    void run(
      async () => {
        const result = await executePaymentException(item.id, action, csrf);
        if ("queued_items" in result) {
          return `${result.queued_items} documento(s) recolocado(s) na fila de entrega.`;
        }
        if (result.status === "done") onFinished();
        return result.status === "done"
          ? "Solução concluída."
          : "Tentativa registrada. Consulte a conciliação para confirmar o resultado.";
      },
      "",
      "Não foi possível executar a solução.",
    );

  return {
    busy,
    error,
    notice,
    reset,
    claim,
    propose,
    confirm,
    reassign,
    execute,
  };
}
