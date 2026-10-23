import { useMemo, useState } from "react";
import { ApiError, registerOrganizationPermission } from "./api";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  registrableCodes,
  registrationErrorMessage,
} from "./permission-registration-model";
import type { ToastKind } from "./useToast";

export function PermissionRegistration({
  organizationId,
  csrfToken,
  registered,
  onRegistered,
  onUnauthorized,
  onToast,
}: {
  organizationId: string;
  csrfToken: string;
  registered: string[];
  onRegistered: () => Promise<void>;
  onUnauthorized: () => void;
  onToast: (message: string, kind: ToastKind) => void;
}) {
  const options = useMemo(() => registrableCodes(registered), [registered]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  if (options.length === 0) return null;
  const selected = options.find((item) => item.code === code);

  function start() {
    setCode(options[0].code);
    setDescription(options[0].description);
    setOpen(true);
  }

  async function register() {
    if (!selected) return;
    setBusy(true);
    try {
      await registerOrganizationPermission(
        organizationId,
        selected.code,
        description.trim(),
        csrfToken,
      );
      setOpen(false);
      onToast(
        "Ação cadastrada no catálogo. Ela ainda não foi concedida a nenhuma aplicação.",
        "success",
      );
      await onRegistered();
    } catch (cause) {
      setOpen(false);
      if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
      else
        onToast(
          cause instanceof ApiError
            ? registrationErrorMessage(cause.status, cause.detail)
            : "Não foi possível cadastrar a ação.",
          "error",
        );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-haspopup="dialog"
        onClick={start}
      >
        Cadastrar ação
      </button>
      <ConfirmDialog
        open={open}
        title="Cadastrar ação no catálogo?"
        description="A ação passa a poder ser concedida às aplicações desta parceria. Cadastrar não concede nada a ninguém."
        confirmLabel="Cadastrar ação"
        confirmDisabled={!selected || description.trim().length < 3}
        busy={busy}
        onConfirm={() => void register()}
        onCancel={() => setOpen(false)}
      >
        <div className="perm-reg">
          <label className="form-field-label" htmlFor="perm-reg-code">
            Ação
          </label>
          <select
            id="perm-reg-code"
            className="input"
            value={code}
            disabled={busy}
            onChange={(event) => {
              setCode(event.target.value);
              setDescription(
                options.find((item) => item.code === event.target.value)
                  ?.description ?? "",
              );
            }}
          >
            {options.map((item) => (
              <option key={item.code} value={item.code}>
                {item.title} ({item.code})
              </option>
            ))}
          </select>
          <label className="form-field-label" htmlFor="perm-reg-description">
            Descrição
          </label>
          <input
            id="perm-reg-description"
            className="input"
            autoComplete="off"
            maxLength={300}
            value={description}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
