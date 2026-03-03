---
title: Secrets
---

# Secrets

Encrypted secret storage for MCP server credentials. Secrets are stored per-user in MongoDB with AES-256-GCM encryption and automatically injected into tool calls.

## Endpoints

### POST `/secrets/set`

Store a secret value for a specific user and MCP server. The secret is encrypted before storage.

```bash
curl -X POST http://mcp:8082/secrets/set \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user123",
    "serverName": "github",
    "secretName": "GITHUB_TOKEN",
    "secretValue": "ghp_xxxxxxxxxxxx"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | No | Username to associate the secret with. Defaults to `"default"` |
| `serverName` | string | Yes | Name of the MCP server that will use this secret |
| `secretName` | string | Yes | Secret identifier (e.g., `"API_KEY"`, `"GITHUB_TOKEN"`) |
| `secretValue` | string | Yes | The secret value to store |

Response:

```json
{ "success": true }
```

When a secret is set:

1. The system verifies the specified server exists
2. The secret value is encrypted using AES-256-GCM
3. The encrypted secret is stored in MongoDB, associated with the username and server
4. If a secret with the same name already exists for this user and server, it is overwritten

Secrets stored with this endpoint are automatically injected into tool calls made with [`POST /mcp/tool/call`](/api/mcp-api/servers#post-mcptoolcall) when the same username and server name are specified.

---

### POST `/secrets/delete`

Remove a stored secret.

```bash
curl -X POST http://mcp:8082/secrets/delete \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user123",
    "serverName": "github",
    "secretName": "GITHUB_TOKEN"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | No | Username associated with the secret. Defaults to `"default"` |
| `serverName` | string | Yes | MCP server the secret is associated with |
| `secretName` | string | Yes | Name of the secret to delete |

Response:

```json
{ "success": true }
```

The secret is permanently removed. Future tool calls will no longer have this secret injected.

---

## Security Model

The MCP API implements a layered security model for secret handling:

1. **Encryption at rest**: All secrets are encrypted using AES-256-GCM before storage. Each encrypted value is stored as `iv:authTag:ciphertext` (hex-encoded). The encryption key is configured via the `SECRETS_KEY` environment variable.

2. **User isolation**: Each user's secrets are stored separately, keyed by `(username, serverName, secretName)`. Multiple users can use the same MCP servers with different credentials.

3. **Just-in-time decryption**: Secrets are only decrypted when needed for a specific tool call and are not stored in plaintext in memory longer than necessary.

4. **Transparent injection**: Secrets are automatically injected into tool call arguments by the MCP API. Clients never need to handle or expose sensitive information in their requests.

5. **No secret enumeration**: There is no API endpoint to list stored secrets, reducing the risk of information disclosure.

### Production Requirements

- **Change `SECRETS_KEY`**: The default value (`secret`) is for development only. Generate a strong key with `openssl rand -hex 32`.
- **Use HTTPS**: Protect data in transit if the MCP API is accessed over a network.
- **Restrict network access**: The MCP API should only be reachable by the MissionSquad API and authorized administrators via private networking.
- **Rotate encryption keys**: Periodically rotate `SECRETS_KEY` and re-encrypt stored secrets.

## See also

- [Servers & Tools](/api/mcp-api/servers) — Tool calls that use injected secrets
- [Packages](/api/mcp-api/packages) — Install MCP server packages
- [MCP API Overview](/api/mcp-api/)
