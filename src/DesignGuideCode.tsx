import { CodeBlock } from "./CodeBlock";

export function DesignGuideCode() {
  return (
    <div className="guide-section card">
      <h2>Código</h2>
      <p>
        Trechos técnicos usam <code>CodeBlock</code>: fundo escuro, cores por
        tipo de token, rolagem lateral e botão de copiar. Identificadores curtos
        no texto usam <code>code</code>.
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
  );
}
