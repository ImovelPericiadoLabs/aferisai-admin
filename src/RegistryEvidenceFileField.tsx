import { FilePickButton } from "./EvidenceTools";
import { sha256Hex } from "./evidence-model";

export function EvidenceFileField({
  label,
  value,
  disabled,
  accept,
  onChange,
  onError,
}: {
  label: string;
  value: string;
  disabled: boolean;
  accept?: string;
  onChange: (hash: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="sup-field">
      <label>
        {label}
        <input
          className="input"
          value={value}
          readOnly
          disabled={disabled}
          aria-label={`Resumo SHA-256 de ${label}`}
        />
      </label>
      <FilePickButton
        disabled={disabled}
        accept={accept}
        onHash={async (bytes) => onChange(await sha256Hex(bytes))}
        onError={onError}
      />
      <small>
        O painel calcula o resumo; o arquivo permanece no seu dispositivo.
      </small>
    </div>
  );
}
