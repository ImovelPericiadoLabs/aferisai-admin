// Output of the backend's own event_catalog() (app/integrations/webhook_events.py, origin/main), trimmed to one
// event per data model. The other 20 events reuse these models, so their schemas have the same shape.
export const REAL_CATALOG_TYPES = [
  "analysis.created",
  "analysis.completed",
  "analysis.failed",
  "analysis.review_required",
  "registry.created",
  "registry.preview.completed",
  "registry.quote.created",
  "registry.quote.expired",
  "payment.created",
  "payment.confirmed",
  "payment.failed",
  "payment.refunded",
  "acquisition.submitted",
  "acquisition.completed",
  "acquisition.failed",
  "certificate.available",
  "connection.created",
  "connection.revoked",
  "credential.created",
  "credential.revoked",
  "commission.owed",
  "commission.reverted",
  "webhook.test"
] as const;

export const REAL_CATALOG_ITEMS = [
  {
    "type": "analysis.created",
    "version": 1,
    "subscribable": true,
    "json_schema": {
      "$defs": {
        "AnalysisEventData": {
          "properties": {
            "analysis_request_id": {
              "format": "uuid",
              "title": "Analysis Request Id",
              "type": "string"
            },
            "synthetic": {
              "anyOf": [
                {
                  "const": true,
                  "type": "boolean"
                },
                {
                  "type": "null"
                }
              ],
              "default": null,
              "title": "Synthetic"
            }
          },
          "required": [
            "analysis_request_id"
          ],
          "title": "AnalysisEventData",
          "type": "object"
        }
      },
      "properties": {
        "id": {
          "description": "Stable UUIDv7 for receiver deduplication.",
          "format": "uuid",
          "title": "Id",
          "type": "string"
        },
        "event": {
          "const": "analysis.created",
          "default": "analysis.created",
          "title": "Event",
          "type": "string"
        },
        "version": {
          "const": 1,
          "default": 1,
          "title": "Version",
          "type": "integer"
        },
        "occurred_at": {
          "format": "date-time",
          "title": "Occurred At",
          "type": "string"
        },
        "application_id": {
          "format": "uuid",
          "title": "Application Id",
          "type": "string"
        },
        "connection_id": {
          "anyOf": [
            {
              "format": "uuid",
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Connection Id"
        },
        "data": {
          "$ref": "#/$defs/AnalysisEventData"
        }
      },
      "required": [
        "id",
        "occurred_at",
        "application_id",
        "connection_id",
        "data"
      ],
      "title": "AnalysisCreatedEvent",
      "type": "object"
    },
    "example": {
      "id": "019a0000-0000-7000-8000-000000000001",
      "event": "analysis.created",
      "version": 1,
      "occurred_at": "2026-10-23T12:00:00+00:00",
      "application_id": "019a0000-0000-7000-8000-000000000002",
      "connection_id": "019a0000-0000-7000-8000-000000000003",
      "data": {
        "analysis_request_id": "019a0000-0000-7000-8000-000000000004"
      }
    }
  },
  {
    "type": "payment.confirmed",
    "version": 1,
    "subscribable": true,
    "json_schema": {
      "$defs": {
        "PartnerResourceEventData": {
          "properties": {
            "resource_type": {
              "maxLength": 64,
              "minLength": 1,
              "title": "Resource Type",
              "type": "string"
            },
            "resource_id": {
              "format": "uuid",
              "title": "Resource Id",
              "type": "string"
            },
            "status": {
              "anyOf": [
                {
                  "maxLength": 64,
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "default": null,
              "title": "Status"
            },
            "quote_id": {
              "anyOf": [
                {
                  "format": "uuid",
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "default": null,
              "title": "Quote Id"
            },
            "payment_id": {
              "anyOf": [
                {
                  "format": "uuid",
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "default": null,
              "title": "Payment Id"
            },
            "certificate_code": {
              "anyOf": [
                {
                  "maxLength": 64,
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "default": null,
              "title": "Certificate Code"
            }
          },
          "required": [
            "resource_type",
            "resource_id"
          ],
          "title": "PartnerResourceEventData",
          "type": "object"
        }
      },
      "properties": {
        "id": {
          "description": "Stable UUIDv7 for receiver deduplication.",
          "format": "uuid",
          "title": "Id",
          "type": "string"
        },
        "event": {
          "const": "payment.confirmed",
          "default": "payment.confirmed",
          "title": "Event",
          "type": "string"
        },
        "version": {
          "const": 1,
          "default": 1,
          "title": "Version",
          "type": "integer"
        },
        "occurred_at": {
          "format": "date-time",
          "title": "Occurred At",
          "type": "string"
        },
        "application_id": {
          "format": "uuid",
          "title": "Application Id",
          "type": "string"
        },
        "connection_id": {
          "anyOf": [
            {
              "format": "uuid",
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Connection Id"
        },
        "data": {
          "$ref": "#/$defs/PartnerResourceEventData"
        }
      },
      "required": [
        "id",
        "occurred_at",
        "application_id",
        "connection_id",
        "data"
      ],
      "title": "PaymentConfirmedEvent",
      "type": "object"
    },
    "example": {
      "id": "019a0000-0000-7000-8000-000000000001",
      "event": "payment.confirmed",
      "version": 1,
      "occurred_at": "2026-10-23T12:00:00+00:00",
      "application_id": "019a0000-0000-7000-8000-000000000002",
      "connection_id": "019a0000-0000-7000-8000-000000000003",
      "data": {
        "resource_type": "payment",
        "resource_id": "019a0000-0000-7000-8000-000000000005"
      }
    }
  },
  {
    "type": "webhook.test",
    "version": 1,
    "subscribable": false,
    "json_schema": {
      "$defs": {
        "TestEventData": {
          "properties": {
            "message": {
              "title": "Message",
              "type": "string"
            },
            "synthetic": {
              "const": true,
              "default": true,
              "title": "Synthetic",
              "type": "boolean"
            }
          },
          "required": [
            "message"
          ],
          "title": "TestEventData",
          "type": "object"
        }
      },
      "properties": {
        "id": {
          "description": "Stable UUIDv7 for receiver deduplication.",
          "format": "uuid",
          "title": "Id",
          "type": "string"
        },
        "event": {
          "const": "webhook.test",
          "default": "webhook.test",
          "title": "Event",
          "type": "string"
        },
        "version": {
          "const": 1,
          "default": 1,
          "title": "Version",
          "type": "integer"
        },
        "occurred_at": {
          "format": "date-time",
          "title": "Occurred At",
          "type": "string"
        },
        "application_id": {
          "format": "uuid",
          "title": "Application Id",
          "type": "string"
        },
        "connection_id": {
          "anyOf": [
            {
              "format": "uuid",
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Connection Id"
        },
        "data": {
          "$ref": "#/$defs/TestEventData"
        }
      },
      "required": [
        "id",
        "occurred_at",
        "application_id",
        "connection_id",
        "data"
      ],
      "title": "WebhookTestEvent",
      "type": "object"
    },
    "example": {
      "id": "019a0000-0000-7000-8000-000000000001",
      "event": "webhook.test",
      "version": 1,
      "occurred_at": "2026-10-23T12:00:00+00:00",
      "application_id": "019a0000-0000-7000-8000-000000000002",
      "connection_id": null,
      "data": {
        "message": "Teste fict\u00edcio AferisAI",
        "synthetic": true
      }
    }
  }
];
