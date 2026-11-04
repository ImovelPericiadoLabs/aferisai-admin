import { useEffect, useMemo, useState } from "react";
import { ApiError, listWebhookEventCatalog } from "./api";
import { WebhookEventDoc } from "./WebhookEventDoc";
import { WebhookEventIndex } from "./WebhookEventIndex";
import { groupEvents } from "./webhook-docs-model";
import {
  buildExample,
  eventDefinitionFromBackend,
  eventCatalog,
  SAMPLE_SECRET,
  type EventDefinition,
  type SignedExample,
} from "./webhook-payloads";
import "./webhook-payloads.css";

export function WebhookPayloads({
  endpointUrl,
  channel = "team",
}: {
  endpointUrl: string | null;
  channel?: "team" | "partner";
}) {
  const [catalog, setCatalog] = useState<EventDefinition[]>(eventCatalog);
  const [selected, setSelected] = useState<EventDefinition>(eventCatalog[0]);
  const [catalogError, setCatalogError] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [query, setQuery] = useState("");
  const [built, setBuilt] = useState<{
    type: string;
    example: SignedExample;
  } | null>(null);

  useEffect(() => {
    let live = true;
    setCatalogError("");
    setLoadingCatalog(true);
    listWebhookEventCatalog(channel)
      .then((items) => {
        if (!live || items.length === 0) return;
        const next = items.map(eventDefinitionFromBackend);
        setCatalog(next);
        setSelected(
          (current) =>
            next.find((item) => item.type === current.type) ?? next[0],
        );
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (!(cause instanceof ApiError && cause.status === 401)) {
          setCatalogError(
            "Catálogo ao vivo indisponível; exibindo a referência local.",
          );
        }
      })
      .finally(() => {
        if (live) setLoadingCatalog(false);
      });
    return () => {
      live = false;
    };
  }, [channel]);

  useEffect(() => {
    let live = true;
    void buildExample(selected, SAMPLE_SECRET).then((built) => {
      if (live) setBuilt({ type: selected.type, example: built });
    });
    return () => {
      live = false;
    };
  }, [selected]);

  const allGroups = useMemo(() => groupEvents(catalog, ""), [catalog]);
  const groups = useMemo(() => groupEvents(catalog, query), [catalog, query]);

  const target = endpointUrl ?? "https://SEU-SERVIDOR/webhooks/aferis";
  const requestPath = (() => {
    try {
      return new URL(target).pathname || "/";
    } catch {
      return "/webhooks/aferis";
    }
  })();

  return (
    <section
      className="card wp"
      aria-labelledby="wp-title"
      aria-busy={loadingCatalog}
    >
      <header className="wp-head">
        <h3 className="appws-section-title" id="wp-title">
          Eventos e payloads
        </h3>
        <p className="form-hint">
          Exemplos documentados, assinados com uma chave de exemplo. A chave
          real aparece uma única vez, no cadastro do webhook.
        </p>
      </header>
      <div className="wp-body">
        <WebhookEventIndex
          groups={groups}
          allGroups={allGroups}
          total={catalog.length}
          selected={selected.type}
          query={query}
          onQuery={setQuery}
          onSelect={(type) => {
            const next = catalog.find((item) => item.type === type);
            if (next) setSelected(next);
          }}
        />
        <WebhookEventDoc
          event={selected}
          example={built?.type === selected.type ? built.example : null}
          target={target}
          requestPath={requestPath}
          catalogNote={catalogError}
        />
      </div>
    </section>
  );
}
