import { changeReasonHeaders } from "./reason";
import { request } from "./api-core";

export type WebhookEndpoint = {
  id: string;
  application_id: string;
  url: string;
  status: "draft" | "active" | "suspended";
  created_at: string;
  plain_secret: string | null;
  last_successful_test_at?: string | null;
  event_types?: string[];
  event_selection_version?: number;
  key_version?: number;
  pending_key_version?: number | null;
  pending_key_prepared_at?: string | null;
  pending_key_tested_at?: string | null;
};

export type WebhookEventCatalogItem = {
  type: string;
  version: number;
  subscribable: boolean;
  json_schema: Record<string, unknown>;
  example: Record<string, unknown>;
};

export type WebhookDelivery = {
  id: string;
  event_type: string;
  status: "pending" | "delivered" | "attempted" | "unknown" | "skipped";
  endpoint_url: string;
  http_status: number | null;
  duration_ms: number | null;
  created_at: string;
  attempted_at: string | null;
  is_test: boolean;
  simulated_event_type?: string | null;
  test_payload?: Record<string, unknown> | null;
};

export type WebhookTestResult = WebhookDelivery;

export type WebhookDeliveryList = {
  items: WebhookDelivery[];
  next_cursor: string | null;
};

export const testApplicationWebhookEndpoint = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  eventType?: string,
) =>
  request<WebhookTestResult>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint/test`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      ...(eventType ? { body: JSON.stringify({ event_type: eventType }) } : {}),
    },
  );

const webhookPath = (applicationId: string, channel: "team" | "partner") =>
  `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`;

export const listWebhookEventCatalog = (channel: "team" | "partner" = "team") =>
  request<WebhookEventCatalogItem[]>(`/v1/${channel}/webhook-events`, {
    method: "GET",
  });

export const selectWebhookEvents = (
  applicationId: string,
  eventTypes: string[],
  expectedVersion: number,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(`${webhookPath(applicationId, channel)}/events`, {
    method: "PUT",
    headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    body: JSON.stringify({
      event_types: eventTypes,
      expected_version: expectedVersion,
    }),
  });

export const prepareWebhookKey = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(
    `${webhookPath(applicationId, channel)}/key-rotation`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const testWebhookKey = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookTestResult>(
    `${webhookPath(applicationId, channel)}/key-rotation/test`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } },
  );

export const activateWebhookKey = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(
    `${webhookPath(applicationId, channel)}/key-rotation/activate`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );

export const resendWebhookDelivery = (
  applicationId: string,
  deliveryId: string,
  reason: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookDelivery>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-deliveries/${encodeURIComponent(deliveryId)}/resend`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ reason: reason.trim() }),
    },
  );

export const listApplicationWebhookDeliveries = (
  applicationId: string,
  options: { before?: string; status?: string } = {},
  channel: "team" | "partner" = "team",
) => {
  const query = new URLSearchParams({ limit: "20" });
  if (options.before) query.set("before", options.before);
  if (options.status) query.set("status", options.status);
  return request<WebhookDeliveryList>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-deliveries?${query}`,
    { method: "GET" },
  );
};

export const getApplicationWebhookDelivery = (
  applicationId: string,
  deliveryId: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookDelivery>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-deliveries/${encodeURIComponent(deliveryId)}`,
    { method: "GET" },
  );

export const getApplicationWebhookEndpoint = (
  applicationId: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookEndpoint>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    { method: "GET" },
  );

export const registerApplicationWebhookEndpoint = (
  applicationId: string,
  url: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
) =>
  request<WebhookEndpoint>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ url }),
    },
  );

export const updateApplicationWebhookEndpointStatus = (
  applicationId: string,
  status: "active" | "suspended",
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<WebhookEndpoint>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint/status`,
    {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
      body: JSON.stringify({ status }),
    },
  );

export const deleteApplicationWebhookEndpoint = (
  applicationId: string,
  csrfToken: string,
  channel: "team" | "partner" = "team",
  reason?: string,
) =>
  request<void>(
    `/v1/${channel}/applications/${encodeURIComponent(applicationId)}/webhook-endpoint`,
    {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken, ...changeReasonHeaders(reason) },
    },
  );
