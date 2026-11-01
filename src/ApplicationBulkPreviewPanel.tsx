import type { ApplicationBulkPreview } from "./api";
import {
  permissionTransition,
  previewHasChange,
  reasonLabel,
  statusLabel,
} from "./application-directory-model";

export function ApplicationBulkPreviewPanel({
  preview,
  busy,
  onRevise,
  onApply,
}: {
  preview: ApplicationBulkPreview;
  busy: boolean;
  onRevise: () => void;
  onApply: () => void;
}) {
  return (
    <section className="card appdir-block" aria-live="polite">
      <h4>Confira antes de aplicar</h4>
      <p className="form-hint">
        {preview.selected_count} aplicações selecionadas ·{" "}
        {preview.affected_count} com mudanças ·{" "}
        {preview.items.filter((item) => !item.can_apply).length} exigem atenção
        ·{" "}
        {
          preview.items.filter(
            (item) => item.can_apply && !previewHasChange(item),
          ).length
        }{" "}
        sem alteração · prévia válida até{" "}
        {new Date(preview.expires_at).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <div className="data-table-wrap">
        <table className="data-table" aria-label="Prévia">
          <thead>
            <tr>
              <th scope="col">Aplicação</th>
              <th scope="col">Estado</th>
              <th scope="col">Permissões</th>
              <th scope="col">Situação</th>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((item) => (
              <tr key={item.application_id}>
                <td data-label="Aplicação">
                  <strong>{item.name}</strong>
                </td>
                <td data-label="Estado">
                  {item.current_status === item.next_status
                    ? `Mantém ${statusLabel(item.current_status).toLowerCase()}`
                    : `${statusLabel(item.current_status)} → ${statusLabel(item.next_status)}`}
                </td>
                <td data-label="Permissões">
                  {permissionTransition(
                    item.current_permissions,
                    item.next_permissions,
                  )}
                </td>
                <td data-label="Situação">
                  <span
                    className={`badge ${item.can_apply ? (previewHasChange(item) ? "badge-success" : "badge-neutral") : "badge-warning"}`}
                  >
                    {item.can_apply
                      ? previewHasChange(item)
                        ? "Pode aplicar"
                        : "Sem alteração"
                      : (reasonLabel(item.reason) ?? "Não pode aplicar")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="appdir-actions">
        <button
          type="button"
          className="btn btn-ghost btn-md"
          onClick={() => onRevise()}
        >
          Revisar campos
        </button>
        <button
          type="button"
          className="btn btn-primary btn-md"
          disabled={busy || preview.affected_count === 0}
          onClick={() => onApply()}
        >
          {busy ? "Aplicando…" : "Confirmar alterações"}
        </button>
      </div>
    </section>
  );
}
