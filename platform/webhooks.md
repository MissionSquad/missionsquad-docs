# Webhooks

Webhooks allow external systems to communicate with the MissionSquad API in real-time. They are essential for integrating with other services, triggering agents asynchronously, and handling authentication for MCP servers.

MissionSquad supports two primary types of webhooks:

1.  **Generic Trigger**: Trigger specific actions like running an agent or calling an MCP tool via a simple HTTP POST request.
2.  **OAuth Callback**: Handle OAuth 2.0 redirects to authenticate MCP servers or other integrations.

## Creating a Webhook

You can manage webhooks using the `/v1/webhooks` API endpoints.

### Creating a Generic Trigger Webhook

To create a webhook that runs an agent when triggered:

```json
POST /v1/webhooks
{
  "name": "Run Support Agent",
  "type": "generic_trigger",
  "triggerConfig": {
    "action": "run_agent",
    "actionParams": {
      "agentName": "support-agent",
      "promptTemplate": "Handle support ticket: {{ticketId}}. Description: {{description}}"
    },
    "sendResultInResponse": true
  }
}
```

To create a webhook that calls an MCP tool:

```json
POST /v1/webhooks
{
  "name": "Add to Calendar",
  "type": "generic_trigger",
  "triggerConfig": {
    "action": "call_mcp_tool",
    "actionParams": {
      "mcpServerName": "google-workspace",
      "mcpToolName": "add-calendar-event"
    },
    "sendResultInResponse": true
  }
}
```

### Creating an OAuth Callback Webhook

To create a webhook that handles OAuth callbacks for an MCP server (e.g., GitHub):

```json
POST /v1/webhooks
{
  "name": "GitHub Auth Callback",
  "type": "oauth_callback",
  "oauthConfig": {
    "provider": "github",
    "state": "random_secure_string",
    "redirectUri": "https://api.missionsquad.ai/webhooks/oauth/callback/{webhookId}",
    "mcpServerName": "github-mcp"
  }
}
```

## Triggering Webhooks

Once created, generic webhooks can be triggered by sending a POST request to the trigger URL.

**Endpoint:** `POST /webhooks/trigger/:webhookId`

### Security

Every generic webhook is assigned a `secret` upon creation. This secret must be hashed and verified, or passed directly if the client supports it.

For MissionSquad webhooks, you must include the `X-Webhook-Secret` header in your request with the raw secret value you received when creating the webhook. The server will verify this against the stored hash.

### Payload & Templates

The JSON body of your trigger request is treated as the payload. You can use this data in your `promptTemplate` using handlebars-style syntax `{{key}}`.

**Example Trigger Request:**

```bash
curl -X POST https://api.missionsquad.ai/webhooks/trigger/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "ticketId": "12345",
    "description": "User cannot login"
  }'
```

If your webhook is configured with the `promptTemplate`: `"Handle support ticket: {{ticketId}}. Description: {{description}}"`, the agent will receive:
`"Handle support ticket: 12345. Description: User cannot login"`

## OAuth Callbacks

OAuth callback webhooks are used to handle the redirect flow from OAuth providers.

1.  **Configure Provider**: Register your application with the OAuth provider (e.g., GitHub, Google) and set the callback URL to `https://api.missionsquad.ai/webhooks/oauth/callback/YOUR_WEBHOOK_ID`.
2.  **Initiate Flow**: Direct the user to the provider's authorization URL.
3.  **Handle Redirect**: The provider redirects the user back to the webhook URL with a `code` and `state`.
4.  **Token Exchange**: MissionSquad automatically validates the `state`, exchanges the `code` for an access token, and securely stores it.
5.  **MCP Integration**: If `mcpServerName` is configured, the token is automatically associated with that MCP server, allowing it to make authenticated requests.

## API Reference

### Manage Webhooks

*   **List Webhooks**: `GET /v1/webhooks`
*   **Create Webhook**: `POST /v1/webhooks`
*   **Get Webhook**: `GET /v1/webhooks/:webhookId`
*   **Update Webhook**: `PUT /v1/webhooks/:webhookId`
*   **Delete Webhook**: `DELETE /v1/webhooks/:webhookId`

### Utilities

*   **Execution History**: `GET /v1/webhooks/:webhookId/executions` - View logs of past webhook triggers.
*   **Get OAuth Token**: `GET /v1/webhooks/:webhookId/token` - Retrieve stored tokens (for debugging or manual usage).
