import { useEffect, useMemo, useState } from "react";
import { FileDropzone } from "./FileDropzone";
import { FilePreview } from "./FilePreview";
import { LOGO_RULE, SERVICE_ACCOUNT_RULE, type FileRule } from "./file-rules";

const ANY_RULE: FileRule = {
  kinds: ["image", "pdf", "json", "text"],
  mimeTypes: [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/json",
    "text/plain",
  ],
  extensions: ["png", "jpg", "jpeg", "pdf", "json", "txt"],
  maxBytes: 5 * 1024 * 1024,
};

function sample(name: string, type: string, body: string): File {
  return new File([body], name, { type });
}

export function DesignGuideFiles() {
  const [file, setFile] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [account, setAccount] = useState<File | null>(null);

  const fake = useMemo(
    () => sample("relatorio.txt", "text/plain", "Linha 1\nLinha 2"),
    [],
  );
  const [progress, setProgress] = useState(0.45);
  useEffect(() => {
    const timer = window.setInterval(
      () => setProgress((value) => (value >= 1 ? 0.1 : value + 0.15)),
      900,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="guide-section card">
      <h2>Envio de arquivos</h2>
      <p>
        Estados da área de envio e prévia por tipo. A chave privada de contas de
        serviço nunca é exibida.
      </p>
      <div className="guide-grid">
        <div>
          <p className="guide-label">Repouso</p>
          <FileDropzone
            id="g-dz-idle"
            label="Documento"
            rule={ANY_RULE}
            file={file}
            onFile={setFile}
          />
          {file && <FilePreview file={file} />}
        </div>
        <div>
          <p className="guide-label">Enviando</p>
          <FileDropzone
            id="g-dz-up"
            label="Documento"
            rule={ANY_RULE}
            file={fake}
            status="uploading"
            progress={progress}
            onFile={() => undefined}
          />
        </div>
        <div>
          <p className="guide-label">Concluído</p>
          <FileDropzone
            id="g-dz-done"
            label="Documento"
            rule={ANY_RULE}
            file={fake}
            status="done"
            onFile={() => undefined}
          />
        </div>
        <div>
          <p className="guide-label">Erro</p>
          <FileDropzone
            id="g-dz-err"
            label="Documento"
            rule={ANY_RULE}
            file={fake}
            status="error"
            errorMessage="O servidor recusou o arquivo."
            onFile={() => undefined}
          />
        </div>
        <div>
          <p className="guide-label">Logo (PNG ou JPEG)</p>
          <FileDropzone
            id="g-dz-logo"
            label="Logo"
            rule={LOGO_RULE}
            file={logo}
            onFile={setLogo}
          />
          {logo && <FilePreview file={logo} />}
        </div>
        <div>
          <p className="guide-label">Conta de serviço (JSON)</p>
          <FileDropzone
            id="g-dz-sa"
            label="Arquivo JSON"
            rule={SERVICE_ACCOUNT_RULE}
            file={account}
            onFile={setAccount}
          />
          {account && <FilePreview file={account} />}
        </div>
      </div>
    </div>
  );
}
