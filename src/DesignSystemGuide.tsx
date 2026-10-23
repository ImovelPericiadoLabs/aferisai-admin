import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { ConfirmDialog } from "./ConfirmDialog";
import { EntityPicker } from "./EntityPicker";
import { FileDropzone } from "./FileDropzone";
import { FilePreview } from "./FilePreview";
import { Checkbox, Disclosure, RadioGroup, Slider, Switch } from "./controls";
import { LOGO_RULE, SERVICE_ACCOUNT_RULE, type FileRule } from "./file-rules";
import type { PickerResult } from "./picker-model";
import "./design-guide.css";

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

const people = [
  "Cartório Alfa",
  "Imobiliária Beta",
  "Banco Gama",
  "Escritório Delta",
];

async function searchSamples(query: string): Promise<PickerResult> {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  return {
    options: people
      .filter(
        (name) => !needle || name.toLocaleLowerCase("pt-BR").includes(needle),
      )
      .map((name) => ({ id: name, label: name })),
  };
}

function sample(name: string, type: string, body: string): File {
  return new File([body], name, { type });
}

export function DesignSystemGuide() {
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("a");
  const [on, setOn] = useState(false);
  const [zoom, setZoom] = useState(40);
  const [picked, setPicked] = useState("");
  const [confirm, setConfirm] = useState(false);
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
    <section className="page guide" aria-labelledby="guide-title">
      <header className="page-header">
        <div>
          <h1 className="page-title" id="guide-title">
            Guia do design system
          </h1>
          <p className="page-subtitle">
            Referência viva dos componentes do painel. Visível apenas para
            administradores.
          </p>
        </div>
      </header>

      <div className="guide-section card">
        <h2>Botões e badges</h2>
        <p>Ações usam verbos; estados usam badges com tom semântico.</p>
        <div className="guide-inline">
          <button className="btn btn-primary" type="button">
            Primário
          </button>
          <button className="btn btn-secondary" type="button">
            Secundário
          </button>
          <button className="btn btn-ghost" type="button">
            Discreto
          </button>
          <button className="btn btn-danger" type="button">
            Perigoso
          </button>
          <button className="btn btn-secondary" type="button" disabled>
            Desabilitado
          </button>
        </div>
        <div className="guide-inline">
          <span className="badge badge-success">Ativo</span>
          <span className="badge badge-warning">Atenção</span>
          <span className="badge badge-danger">Erro</span>
          <span className="badge badge-info">Info</span>
          <span className="badge badge-neutral">Rascunho</span>
        </div>
      </div>

      <div className="guide-section card">
        <h2>Campos</h2>
        <p>
          Rótulo sempre visível; dica abaixo; seleção por busca no lugar de
          identificadores.
        </p>
        <div className="guide-grid">
          <div className="form-field">
            <label className="form-field-label" htmlFor="g-input">
              Texto
            </label>
            <input id="g-input" className="input" placeholder="Digite aqui" />
            <span className="form-hint">Dica de preenchimento.</span>
          </div>
          <div className="form-field">
            <label className="form-field-label" htmlFor="g-select">
              Seleção
            </label>
            <select id="g-select" className="input" defaultValue="a">
              <option value="a">Opção A</option>
              <option value="b">Opção B</option>
            </select>
          </div>
          <div className="form-field guide-wide">
            <label className="form-field-label" htmlFor="g-area">
              Texto longo
            </label>
            <textarea id="g-area" className="input" rows={3} />
          </div>
          <EntityPicker
            id="g-picker"
            label="Parceiro"
            value={picked}
            search={searchSamples}
            placeholder="Buscar parceiro"
            onChange={(id) => setPicked(id)}
          />
        </div>
      </div>

      <div className="guide-section card">
        <h2>Controles</h2>
        <p>
          Caixa, opções, interruptor, bloco recolhível e controle deslizante.
        </p>
        <div className="guide-grid">
          <div className="guide-stack">
            <Checkbox
              id="g-check"
              label="Receber avisos"
              description="Uma por dia."
              checked={checked}
              onChange={setChecked}
            />
            <Checkbox
              id="g-check-i"
              label="Parcial"
              checked={false}
              indeterminate
              onChange={() => undefined}
            />
            <Checkbox
              id="g-check-d"
              label="Desabilitado"
              checked
              disabled
              onChange={() => undefined}
            />
          </div>
          <RadioGroup
            name="g-radio"
            legend="Frequência"
            value={radio}
            onChange={setRadio}
            options={[
              { value: "a", label: "Diária" },
              { value: "b", label: "Semanal", description: "Segundas-feiras." },
              { value: "c", label: "Mensal", disabled: true },
            ]}
          />
          <div className="guide-stack">
            <Switch
              id="g-switch"
              label="Modo ativo"
              description="Liga e desliga na hora."
              checked={on}
              onChange={setOn}
            />
            <Slider
              id="g-slider"
              label="Zoom"
              value={zoom}
              min={0}
              max={100}
              onChange={setZoom}
              format={(v) => `${v}%`}
            />
          </div>
          <Disclosure title="Detalhes avançados">
            <p className="form-hint">Conteúdo recolhido por padrão.</p>
          </Disclosure>
        </div>
      </div>

      <div className="guide-section card">
        <h2>Envio de arquivos</h2>
        <p>
          Estados da área de envio e prévia por tipo. A chave privada de contas
          de serviço nunca é exibida.
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

      <div className="guide-section card">
        <h2>Código</h2>
        <p>
          Trechos técnicos usam <code>CodeBlock</code>: fundo escuro, cores por
          tipo de token, rolagem lateral e botão de copiar. Identificadores
          curtos no texto usam <code>code</code>.
        </p>
        <div className="guide-code">
          <CodeBlock
            language="json"
            label="Corpo (JSON)"
            code={
              '{\n  "id": "0192a8c0-0000-7000-8000-000000000001",\n  "event": "analysis.completed",\n  "version": 1,\n  "connection_id": null\n}'
            }
          />
          <CodeBlock
            language="shell"
            label="cURL"
            code={
              "curl -X POST 'https://api.exemplo.com.br/webhooks/aferis' \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{\"event\":\"webhook.test\"}'"
            }
          />
          <CodeBlock
            language="js"
            code={
              "// Compare em tempo constante\nconst ok = timingSafeEqual(a, b);"
            }
          />
          <CodeBlock
            language="python"
            code={
              "def assinatura_valida(corpo: bytes) -> bool:\n    # confira o carimbo antes\n    return True"
            }
          />
          <CodeBlock
            language="http"
            label="Requisição"
            code={
              "POST /webhooks/aferis HTTP/1.1\nContent-Type: application/json\nX-Aferis-Key-Version: 1"
            }
          />
          <CodeBlock
            language="text"
            label="Prévia do texto"
            code={"Texto simples, sem cores.\nUsado na prévia de arquivos."}
          />
        </div>
      </div>

      <div className="guide-section card">
        <h2>Estados e confirmação</h2>
        <p>Vazio, erro, carregando, avisos e o diálogo de confirmação.</p>
        <div className="guide-grid">
          <div className="empty-state" role="status">
            <strong>Nada por aqui</strong>
            <span>Explique o que fazer em seguida.</span>
          </div>
          <div className="alert alert-danger" role="alert">
            Não foi possível carregar.
          </div>
          <div className="alert alert-success" role="status">
            Alterações salvas.
          </div>
          <div className="alert" role="note">
            Informação útil e neutra.
          </div>
          <div className="guide-stack" aria-hidden="true">
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          <div>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => setConfirm(true)}
            >
              Abrir confirmação
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Remover item de exemplo?"
        description="Esta ação é apenas uma demonstração."
        reason={{ label: "Motivo", min: 10, max: 500 }}
        confirmLabel="Remover"
        tone="danger"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
}
