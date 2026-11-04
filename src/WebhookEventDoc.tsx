import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { DocTabs } from "./DocTabs";
import {
  curlFor,
  envelopeFields,
  nodeVerifySnippet,
  pythonVerifySnippet,
  SAMPLE_SECRET,
  type EventDefinition,
  type SignedExample,
} from "./webhook-payloads";

const views = [
  { id: "request", label: "Requisição" },
  { id: "fields", label: "Campos" },
  { id: "verify", label: "Validar assinatura" },
  { id: "local", label: "Testar localmente" },
] as const;
type View = (typeof views)[number]["id"];

const languages = [
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
] as const;
type Language = (typeof languages)[number]["id"];

const HEADER_NOTES: { name: string; note: string }[] = [
  {
    name: "X-Aferis-Event-Id",
    note: "Identifica o envio. Use para ignorar repetições.",
  },
  {
    name: "X-Aferis-Timestamp",
    note: "Momento do envio. Entra no cálculo da assinatura.",
  },
  {
    name: "X-Aferis-Key-Version",
    note: "Versão da chave que assinou. Muda durante uma rotação de chave.",
  },
  {
    name: "X-Aferis-Signature",
    note: "sha256= seguido do HMAC-SHA256 em hexadecimal.",
  },
];

function CopyName({ value }: { value: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1600);
  }
  return (
    <button type="button" className="wpd-copy" onClick={() => void copy()}>
      {state === "done"
        ? "Copiado"
        : state === "failed"
          ? "Não foi possível copiar"
          : "Copiar nome"}
    </button>
  );
}

export function WebhookEventDoc({
  event,
  example,
  target,
  requestPath,
  catalogNote,
}: {
  event: EventDefinition;
  example: SignedExample | null;
  target: string;
  requestPath: string;
  catalogNote: string;
}) {
  const [view, setView] = useState<View>("request");
  const [language, setLanguage] = useState<Language>("node");
  const panel = (id: View) => ({
    role: "tabpanel" as const,
    id: `wpd-panel-${id}`,
    "aria-labelledby": `wpd-tab-${id}`,
    hidden: view !== id,
    tabIndex: 0,
    className: "wpd-panel",
  });

  return (
    <article className="wpd" aria-labelledby="wpd-title">
      <header className="wpd-head">
        <h4 className="wpd-title" id="wpd-title">
          {event.title}
        </h4>
        <div className="wpd-name">
          <code>{event.type}</code>
          <CopyName value={event.type} />
        </div>
        <p className="wpd-desc">{event.description}</p>
        <ul className="wpd-facts" aria-label="Características do evento">
          <li>
            <span
              className={`badge ${event.subscribable ? "badge-neutral" : "badge-warning"}`}
            >
              {event.subscribable ? "Pode ser selecionado" : "Somente teste"}
            </span>
          </li>
          <li>
            <span className="badge badge-neutral">
              {event.hasConnection ? "Inclui a conexão" : "Sem conexão"}
            </span>
          </li>
          <li>
            <span className="badge badge-neutral">Formato v1</span>
          </li>
          {event.status === "proposed" && (
            <li>
              <span className="badge badge-info">Proposta</span>
            </li>
          )}
        </ul>
      </header>

      {catalogNote && (
        <p className="wpd-note" role="status">
          {catalogNote}
        </p>
      )}
      {event.status === "proposed" && (
        <div className="alert alert-warning" role="note">
          Este evento ainda não existe no backend. O formato mostrado é uma
          proposta e pode mudar.
        </div>
      )}

      <DocTabs
        label="Visão do evento"
        items={views}
        value={view}
        onChange={setView}
        idPrefix="wpd"
      />

      <div {...panel("request")}>
        {example ? (
          <>
            <CodeBlock
              language="http"
              label="Requisição"
              code={`POST ${requestPath} HTTP/1.1\n${Object.entries(
                example.headers,
              )
                .map(([name, value]) => `${name}: ${value}`)
                .join("\n")}`}
            />
            <dl className="wpd-headers">
              {HEADER_NOTES.map((item) => (
                <div key={item.name}>
                  <dt>
                    <code>{item.name}</code>
                  </dt>
                  <dd>{item.note}</dd>
                </div>
              ))}
            </dl>
            <CodeBlock
              language="json"
              label="Corpo (JSON)"
              copyLabel="Copiar JSON"
              code={example.pretty}
            />
            <details className="wpd-exact">
              <summary>Bytes exatos assinados</summary>
              <p>
                A assinatura cobre o carimbo de tempo, um ponto e este corpo
                compacto, com chaves ordenadas e caracteres não ASCII escapados.
                Não reserialize o JSON antes de validar.
              </p>
              <CodeBlock
                language="json"
                label="Corpo assinado"
                code={example.body}
                maxHeight={240}
              />
            </details>
          </>
        ) : (
          <p className="form-hint" role="status">
            Gerando o exemplo assinado…
          </p>
        )}
      </div>

      <div {...panel("fields")}>
        <div className="data-table-wrap">
          <table className="data-table wpd-table" aria-label="Campos do evento">
            <thead>
              <tr>
                <th scope="col">Campo</th>
                <th scope="col">Tipo</th>
                <th scope="col">Presença</th>
                <th scope="col">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[...envelopeFields, ...event.fields].map((field) => (
                <tr key={field.name}>
                  <td data-label="Campo">
                    <code>{field.name}</code>
                  </td>
                  <td data-label="Tipo">{field.type}</td>
                  <td data-label="Presença">
                    {field.required === false ? "Opcional" : "Sempre"}
                  </td>
                  <td data-label="Descrição">{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {event.fields.length === 0 && (
          <p className="form-hint">
            Este evento não traz campos próprios: o objeto <code>data</code> vem
            vazio.
          </p>
        )}
      </div>

      <div {...panel("verify")}>
        {example && (
          <>
            <ol className="wpd-steps">
              <li>
                Junte o cabeçalho <code>X-Aferis-Timestamp</code>, um ponto e os
                bytes exatos recebidos.
              </li>
              <li>
                Calcule o HMAC-SHA256 desse texto com a sua chave e escreva o
                resultado em hexadecimal, com o prefixo <code>sha256=</code>.
              </li>
              <li>
                Compare com <code>X-Aferis-Signature</code> em tempo constante.
                Durante uma rotação de chave, <code>X-Aferis-Key-Version</code>{" "}
                indica qual chave assinou.
              </li>
            </ol>
            <DocTabs
              label="Linguagem"
              items={languages}
              value={language}
              onChange={setLanguage}
              idPrefix="wpd-lang"
              size="sm"
            />
            <div
              role="tabpanel"
              id={`wpd-lang-panel-${language}`}
              aria-labelledby={`wpd-lang-tab-${language}`}
            >
              <CodeBlock
                language={language === "node" ? "js" : "python"}
                code={
                  language === "node" ? nodeVerifySnippet : pythonVerifySnippet
                }
              />
            </div>
            <div className="wpd-vector" role="note">
              <strong>Vetor de teste</strong>
              <p>
                Use para conferir a sua implementação antes de ligar o webhook.
              </p>
              <dl>
                <div>
                  <dt>Chave</dt>
                  <dd>
                    <code>{SAMPLE_SECRET}</code>
                  </dd>
                </div>
                <div>
                  <dt>Carimbo</dt>
                  <dd>
                    <code>{example.headers["X-Aferis-Timestamp"]}</code>
                  </dd>
                </div>
                <div>
                  <dt>Assinatura esperada</dt>
                  <dd>
                    <code>{example.headers["X-Aferis-Signature"]}</code>
                  </dd>
                </div>
              </dl>
              <p>O corpo é o da aba Requisição, em “Bytes exatos assinados”.</p>
            </div>
          </>
        )}
      </div>

      <div {...panel("local")}>
        {example && (
          <>
            <div className="alert alert-warning" role="note">
              Este comando <strong>não é enviado pela Aferis</strong>: roda no
              seu terminal, com a chave de exemplo, para testar o seu receptor.{" "}
              {event.status === "proposed"
                ? "Este evento ainda não existe: o comando só serve para ensaiar o seu receptor."
                : "Para um envio real assinado com a sua chave, use “Simular evento” na seção acima."}
            </div>
            <CodeBlock
              language="shell"
              copyLabel="Copiar comando"
              code={curlFor(target, example.headers, example.body)}
            />
            <p className="form-hint">
              O receptor deve responder 2xx. Como o segredo do exemplo é
              público, use-o só em ambiente de teste.
            </p>
          </>
        )}
      </div>
    </article>
  );
}
