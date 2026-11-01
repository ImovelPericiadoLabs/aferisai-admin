import type { AnalysisProviderKind } from "./api";
import { FileDropzone } from "./FileDropzone";
import { FilePreview } from "./FilePreview";
import { SERVICE_ACCOUNT_RULE } from "./file-rules";

export function AnalysisProviderCredentialFieldset({
  kind,
  credential,
  credentialFile,
  busy,
  onCredential,
  onFile,
}: {
  kind: AnalysisProviderKind;
  credential: string;
  credentialFile: File | null;
  busy: boolean;
  onCredential: (value: string) => void;
  onFile: (file: File | null) => void;
}) {
  return (
    <fieldset className="form-section">
      <legend className="form-section-title">Credencial</legend>
      {kind === "vertex_service_account" ? (
        <div className="form-field">
          <FileDropzone
            id="prov-file"
            label="Arquivo JSON da conta de serviço"
            rule={SERVICE_ACCOUNT_RULE}
            file={credentialFile}
            onFile={onFile}
            disabled={busy}
            hint="JSON"
          />
          {credentialFile && <FilePreview file={credentialFile} />}
        </div>
      ) : (
        <div className="form-field">
          <label className="form-field-label" htmlFor="prov-secret">
            Chave ou token
          </label>
          <input
            id="prov-secret"
            className="input"
            type="password"
            value={credential}
            required
            onChange={(event) => onCredential(event.target.value)}
          />
        </div>
      )}
      <span className="form-hint">
        O segredo é enviado uma vez e não aparece depois. Não o inclua no nome,
        no modelo nem no motivo.
      </span>
    </fieldset>
  );
}
