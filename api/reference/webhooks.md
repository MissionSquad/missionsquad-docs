# Webhooks API

Webhooks allow you to trigger actions and handle authentications asynchronously.

For a comprehensive guide on creating, configuring, and using webhooks, please see the [Webhooks Platform Guide](/platform/webhooks).

## Endpoints

- **List Webhooks**: `GET /v1/webhooks`
- **Create Webhook**: `POST /v1/webhooks`
- **Get Webhook**: `GET /v1/webhooks/:webhookId`
- **Update Webhook**: `PUT /v1/webhooks/:webhookId`
- **Delete Webhook**: `DELETE /v1/webhooks/:webhookId`
- **Execution History**: `GET /v1/webhooks/:webhookId/executions`
- **Get OAuth Token**: `GET /v1/webhooks/:webhookId/token`
- **Trigger Webhook**: `POST /webhooks/trigger/:webhookId`
