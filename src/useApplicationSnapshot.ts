import { useEffect, useState } from "react";
import {
  ApiError,
  getApplicationWebhookEndpoint,
  listApplicationWebhookDeliveries,
  listPartnerCredentials,
  type PartnerCredential,
  type WebhookDelivery,
  type WebhookEndpoint,
} from "./api";

export type ApplicationSnapshot = {
  endpoint: WebhookEndpoint | null;
  credentials: PartnerCredential[];
  deliveries: WebhookDelivery[];
};

export function useApplicationSnapshot(
  applicationId: string,
  channel: "team" | "partner",
  enabled: boolean,
  onUnauthorized: () => void,
): { data: ApplicationSnapshot | null; failed: boolean; refresh: () => void } {
  const [state, setState] = useState<{
    key: string;
    data: ApplicationSnapshot | null;
    failed: boolean;
  }>({ key: "", data: null, failed: false });
  const [revision, setRevision] = useState(0);
  const key = `${channel}:${applicationId}`;

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void (async () => {
      try {
        const [endpoint, credentials, deliveries] = await Promise.all([
          getApplicationWebhookEndpoint(applicationId, channel).catch(
            (cause: unknown) => {
              if (cause instanceof ApiError && cause.status === 404)
                return null;
              throw cause;
            },
          ),
          listPartnerCredentials(applicationId, undefined, channel),
          listApplicationWebhookDeliveries(applicationId, {}, channel),
        ]);
        if (live)
          setState({
            key,
            data: {
              endpoint,
              credentials: credentials.items,
              deliveries: deliveries.items,
            },
            failed: false,
          });
      } catch (cause) {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized();
        else setState({ key, data: null, failed: true });
      }
    })();
    return () => {
      live = false;
    };
  }, [applicationId, channel, enabled, key, revision, onUnauthorized]);

  const refresh = () => setRevision((value) => value + 1);
  return state.key === key
    ? { data: state.data, failed: state.failed, refresh }
    : { data: null, failed: false, refresh };
}
