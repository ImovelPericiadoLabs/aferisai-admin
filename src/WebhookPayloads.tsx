import { useEffect, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import {
  buildExample,
  curlFor,
  envelopeFields,
  eventCatalog,
  nodeVerifySnippet,
  pythonVerifySnippet,
  SAMPLE_SECRET,
  type EventDefinition,
  type SignedExample,
} from "./webhook-payloads";
import "./webhook-payloads.css";

const views = [
  { id: "request", label: "Requisição" },
  { id: "fields", label: "Campos" },
  { id: "verify", label: "Validar assinatura" },
  { id: "local", label: "Testar localmente" },
] as const;
type View = (typeof views)[number]["id"];

export function WebhookPayloads({
  endpointUrl,
}: {
  endpointUrl: string | null;
}) {
  const [selected, setSelected] = useState<EventDefinition>(eventCatalog[0]);
  const [view, setView] = useState<View>("request");
  const [language, setLanguage] = useState<"node" | "python">("node");
  const [example, setExample] = useState<SignedExample | null>(null);

  useEffect(() => {
    let live = true;
    void buildExample(selected, SAMPLE_SECRET).then((built) => {
      if (live) setExample(built);
    });
    return () => {
      live = false;
    };
  }, [selected]);

  const target = endpointUrl ?? "https://SEU-SERVIDOR/webhooks/aferis";
  const requestPath = (() => {
    try {
      const url = new URL(target);
      return url.pathname || "/";
    } catch {
      return "/webhooks/aferis";
    }
  })();

  return (
    <section className="card wp" aria-labelledby="wp-title">
      <header className="wp-head">
        <div>
          <h3 className="appws-section-title" id="wp-title">
            Eventos e payloads
          </h3>
          <p className="form-hint">
            Exemplos documentados, assinados com uma chave de exemplo. A chave
            real aparece uma única vez, no cadastro do webhook.
          </p>
        </div>
      </header>
      <div className="wp-body">
        <ul className="wp-events" aria-label="Eventos">
          {eventCatalog.map((event) => (
            <li key={event.type}>
              <button
                type="button"
                className="wp-event"
                data-proposed={event.status === "proposed"}
                aria-pressed={selected.type === event.type}
                onClick={() => setSelected(event)}
              >
                <code>{event.type}</code>
                <span
                  className={`badge ${event.status === "implemented" ? "badge-success" : "badge-info"}`}
                >
                  {event.status === "implemented" ? "Existe" : "Proposta"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="wp-panel">
          <div className="wp-title-row">
            <div>
              <strong>{selected.title}</strong>
              <p className="form-hint">{selected.description}</p>
            </div>
          </div>
          {selected.status === "proposed" && (
            <div className="alert alert-warning" role="note">
              Este evento ainda não existe no backend. O formato mostrado é uma
              proposta e pode mudar.
            </div>
          )}
          <div className="seg" role="group" aria-label="Visão do evento">
            {views.map((item) => (
              <button
                key={item.id}
                type="button"
                className="seg-item"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {view === "request" && example && (
            <div className="wp-stack">
              <CodeBlock
                language="http"
                label="Requisição"
                code={`POST ${requestPath} HTTP/1.1\n${Object.entries(
                  example.headers,
                )
                  .map(([name, value]) => `${name}: ${value}`)
                  .join("\n")}`}
              />
              <CodeBlock
                language="json"
                label="Corpo (JSON)"
                copyLabel="Copiar JSON"
                code={example.pretty}
              />
              <details className="wp-exact">
                <summary>Bytes exatos assinados</summary>
                <p className="form-hint">
                  A assinatura cobre o carimbo de tempo, um ponto e este corpo
                  compacto, com chaves ordenadas e caracteres não ASCII
                  escapados. Não reserialize o JSON antes de validar.
                </p>
                <CodeBlock
                  language="json"
                  label="Corpo assinado"
                  code={example.body}
                  maxHeight={240}
                />
              </details>
            </div>
          )}

          {view === "fields" && (
            <div className="data-table-wrap">
              <table className="data-table" aria-label="Campos do evento">
                <thead>
                  <tr>
                    <th scope="col">Campo</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {[...envelopeFields, ...selected.fields].map((field) => (
                    <tr key={field.name}>
                      <td data-label="Campo">
                        <code>{field.name}</code>
                      </td>
                      <td data-label="Tipo">{field.type}</td>
                      <td data-label="Descrição">{field.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "verify" && example && (
            <div className="wp-stack">
              <p className="form-hint">
                Calcule o HMAC-SHA256 do carimbo (
                <code>X-Aferis-Timestamp</code>), de um ponto e dos bytes
                recebidos, com a sua chave. Compare com o cabeçalho{" "}
                <code>X-Aferis-Signature</code>, em tempo constante. Durante uma
                rotação de chave, o cabeçalho <code>X-Aferis-Key-Version</code>{" "}
                indica qual chave assinou.
              </p>
              <div className="seg" role="group" aria-label="Linguagem">
                <button
                  type="button"
                  className="seg-item"
                  aria-pressed={language === "node"}
                  onClick={() => setLanguage("node")}
                >
                  Node.js
                </button>
                <button
                  type="button"
                  className="seg-item"
                  aria-pressed={language === "python"}
                  onClick={() => setLanguage("python")}
                >
                  Python
                </button>
              </div>
              <CodeBlock
                language={language === "node" ? "js" : "python"}
                code={
                  language === "node" ? nodeVerifySnippet : pythonVerifySnippet
                }
              />
              <div className="alert" role="note">
                <strong>Vetor de teste:</strong> com a chave{" "}
                <code>{SAMPLE_SECRET}</code>, o carimbo{" "}
                <code>{example.headers["X-Aferis-Timestamp"]}</code> e o corpo
                exato acima, a assinatura esperada é{" "}
                <code>{example.headers["X-Aferis-Signature"]}</code>. Use para
                conferir a sua implementação antes de ligar o webhook.
              </div>
            </div>
          )}

          {view === "local" && example && (
            <div className="wp-stack">
              <div className="alert alert-warning" role="note">
                Este comando <strong>não é enviado pela Aferis</strong>: roda no
                seu terminal, com a chave de exemplo, para testar o seu
                receptor.{" "}
                {selected.status === "proposed"
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
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
