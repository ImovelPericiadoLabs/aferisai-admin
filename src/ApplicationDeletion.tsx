import { useRef, useState } from "react";
import { ApiError, deleteTeamApplication } from "./api";
import { deletionBlockMessage } from "./application-deletion";
import { ConfirmDialog } from "./ConfirmDialog";
import "./application-deletion.css";

export function ApplicationDeletion({
  applicationId,
  applicationName,
  csrfToken,
  onDeleted,
  onUnauthorized,
}: {
  applicationId: string;
  applicationName: string;
  csrfToken: string;
  onDeleted: (applicationId: string) => void;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError("");
    trigger.current?.focus();
  }

  async function confirm(reason: string) {
    setBusy(true);
    setError("");
    try {
      await deleteTeamApplication(applicationId, reason, csrfToken);
      setBusy(false);
      setOpen(false);
      setTyped("");
      onDeleted(applicationId);
    } catch (cause) {
      setBusy(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else setError(deletionBlockMessage(cause));
    }
  }

  const matches = typed.trim() === applicationName.trim();

  return (
    <section
      className="appdel"
      aria-labelledby={`appdel-title-${applicationId}`}
    >
      <div>
        <h3 className="appdel-title" id={`appdel-title-${applicationId}`}>
          Excluir aplicação
        </h3>
        <p className="appdel-text">
          Desativa a aplicação de forma definitiva: ela sai das listas, deixa de
          autenticar e de gerar entregas novas. Não há como restaurá-la nem
          recriá-la com o mesmo identificador. O histórico de pedidos,
          credenciais, conexões e eventos é mantido para conciliação e
          auditoria.
        </p>
      </div>
      <button
        ref={trigger}
        type="button"
        className="btn btn-ghost-danger btn-md"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Excluir aplicação…
      </button>

      <ConfirmDialog
        open={open}
        tone="danger"
        title="Excluir esta aplicação?"
        description="Esta ação é definitiva. Compras, análises e entregas já iniciadas continuam no histórico: a exclusão não cancela nem estorna nada, e uma entrega externa já em andamento pode terminar."
        details={[
          { label: "Aplicação", value: applicationName },
          { label: "Identificador", value: applicationId },
        ]}
        reason={{
          label: "Motivo (fica na trilha de auditoria)",
          min: 10,
          max: 500,
        }}
        confirmDisabled={!matches}
        confirmLabel="Excluir definitivamente"
        busy={busy}
        onConfirm={(reason) => void confirm(reason)}
        onCancel={close}
      >
        <div className="form-field appdel-confirm">
          <label className="form-field-label" htmlFor="appdel-name">
            Digite o nome da aplicação para confirmar
          </label>
          <input
            id="appdel-name"
            className="input"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            disabled={busy}
            aria-invalid={typed !== "" && !matches ? true : undefined}
            onChange={(event) => setTyped(event.target.value)}
          />
          <span className="form-hint">{applicationName}</span>
        </div>
        {error && (
          <p className="alert alert-danger" role="alert">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
