import { useRef, useState, type ReactNode } from "react";

/**
 * Label with small actions on the same row. The actions sit beside the
 * <label>, never inside it: a button inside a label would become the control
 * the label points to.
 */
export function LabelRow({
  htmlFor,
  text,
  children,
}: {
  htmlFor: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <span className="sup-label-row">
      <label htmlFor={htmlFor}>{text}</label>
      <span className="sup-label-actions">{children}</span>
    </span>
  );
}

export function MiniButton({
  children,
  title,
  disabled,
  onClick,
}: {
  children: ReactNode;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="sup-mini"
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Hashes a file picked on this device. Nothing is uploaded. */
export function FilePickButton({
  disabled,
  accept,
  onHash,
  onError,
}: {
  disabled?: boolean;
  accept?: string;
  onHash: (bytes: ArrayBuffer, name: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <MiniButton
        title="Calcula o SHA-256 de um arquivo deste computador. O arquivo não é enviado."
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        Usar arquivo
      </MiniButton>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          file
            .arrayBuffer()
            .then((bytes) => onHash(bytes, file.name))
            .catch(() => onError("Não foi possível ler o arquivo."));
        }}
      />
    </>
  );
}

export function DeclarationPanel({
  text,
  fileName,
}: {
  text: string;
  fileName: string;
}) {
  const [copied, setCopied] = useState(false);

  function download() {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="sup-declaration" role="group" aria-label="Texto gerado">
      <p className="sup-muted">
        O SHA-256 acima é o deste texto, gerado pelo painel — não de um
        documento do provedor. Guarde o texto: quem o tiver consegue calcular o
        mesmo valor de novo. Se mudar a versão, o motivo ou as tarifas, gere
        outra vez.
      </p>
      <pre className="sup-declaration-text">{text}</pre>
      <div className="sup-declaration-actions">
        <MiniButton title="Copiar o texto" onClick={() => void copy()}>
          {copied ? "Copiado" : "Copiar texto"}
        </MiniButton>
        <MiniButton title="Baixar o texto como arquivo .txt" onClick={download}>
          Baixar .txt
        </MiniButton>
      </div>
    </div>
  );
}
