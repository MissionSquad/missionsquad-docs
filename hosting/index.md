---
title: Hosting (Docker & Docker Compose)
---

# Mission Squad Platform — Hosting via Docker & Docker Compose

Audience: Operators deploying the Mission Squad Platform in their own environment. This guide assumes you already know Docker and Docker Compose; it focuses on the platform-specific setup, environment, networking, and operations.

What you will deploy:
- api: Mission Squad API (OpenAI-compatible for chat completions, vector stores, files, core endpoints)
- mcp: Mission Squad MCP gateway (tools server hub)
- Optional: searxng + redis (for web search tools via MCP)
- Optional: shared Redis/Valkey for API distributed cache HA mode

What you bring:
- A reachable MongoDB (Atlas or self-hosted) with auth enabled
- A domain and TLS termination (Nginx, Cloudflare, or equivalent)
- Outbound e-mail SMTP credentials (optional but recommended for schedules/notifications)
- For multi-instance API deployments: a shared Redis/Valkey endpoint

Related docs:
- Platform UI: [Getting Started](/platform/getting-started)
- API Overview: [API](/api/)
- Endpoint Index: [Endpoint Index](/api/reference/endpoint-index)
- Google Cloud deployment: [GCP](/hosting/gcp/)

## 1) Prerequisites

- Docker Engine and Docker Compose (Plugin or v2)
- MongoDB connection string (SRV or standard), e.g.:
  - mongodb+srv://USER:PASS@cluster.x.mongodb.net
  - mongodb://USER:PASS@host1:27017,host2:27017/?replicaSet=rs0
- SMTP credentials (if you want e-mail delivery for schedules):
  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
- A domain and TLS:
  - api.your-domain.com → reverse proxy to container api:8080
  - (Optional) mcp.your-domain.com → reverse proxy to container mcp:8082 if you expose MCP externally
- Disk paths (bind mounts) on the host for persistent data:
  - ./data (API data)
  - ./packages (MCP installed packages)
  - ./valkey-data (if using redis/valkey)
  - ./searxng (if using searxng configuration)

## 2) Directory layout

Create a dedicated folder on the target host (example: /opt/missionsquad):

```
/opt/missionsquad
  docker-compose.yaml
  .api.env
  .mcp.env
  data/
  packages/
  searxng/                 # if using SearXNG
  valkey-data/             # if using Redis/Valkey
  image-processor-prompts.json
```

## 3) Environment files

Create .api.env:

```bash
# .api.env
JWT_SECRET=your-super-secret-jwt-key
USER_SECRET_KEY=your-super-secret-user-data-encryption-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-super-secret-admin-password
ADMIN_EMAIL=your@email.com
MONGO_USER=mongodb-user
MONGO_PASS=mongodb-password
MONGO_HOST=mongodb://mongodb-address-here
REPLICA_SET=mongodb-replica-set-name #only if using a replica set
MONGO_DBNAME=missionsquad
SECRETS_DBNAME=userSecrets
SMTP_PASS=google-app-password-or-smtp-password
REDIS_HOST=redis://redis:6379
REDIS_USER=
REDIS_PASS=
IMAGE_PROCESSOR_API_KEY=api-key-for-image-processor-host
```

Create .mcp.env:

```bash
# .mcp.env
PORT=8082
MONGO_USER=mongodb-user
MONGO_PASS=mongodb-password
MONGO_HOST=mongodb://mongodb-address-here
REPLICA_SET=mongodb-replica-set-name #only if using a replica set
SECRETS_DBNAME=userSecrets
SECRETS_KEY=your-super-secret-user-data-encryption-key
INSTALL_ON_START=@missionsquad/mcp-github|github,@missionsquad/mcp-helper-tools|helper-tools
SEARXNG_URL=http://searxng
```

Recommendations:
- Generate strong secrets:
  - JWT_SECRET: `openssl rand -hex 32`
  - USER_SECRET_KEY and SECRETS_KEY: `openssl rand -hex 32`
- If using Atlas SRV URLs (mongodb+srv://), set MONGO_HOST to the SRV URL and omit REPLICA_SET.
- For multi-instance API HA mode, point `REDIS_HOST` to a shared Redis/Valkey endpoint (single-node or managed HA).
- Ensure the application user has permissions to create collections in MONGO_DBNAME and SECRETS_DBNAME.

## 4) Compose file (authoritative baseline)

Save docker-compose.yaml with the following content:

```yaml
x-logging:
  &logging
  logging:
    driver: "json-file"
    options:
      max-size: 100m
      max-file: "1"
      tag: "{{.Name}}"

services:
  api:
    image: ghcr.io/missionsquad/missionsquad-api:1.40.0
    container_name: api
    restart: unless-stopped
    env_file:
      - .api.env
    environment:
      - PORT=8080
      - DEBUG=false
      - SCRAPE_WITH_GPU=false
      - PAGE_CACHE_MAX=1000
      - TOOLS_HOST=http://mcp:8082
      - TOOL_SECRETS=github|github_pat
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=465
      - SMTP_USER=email@gmail.com
      - SMTP_SECURE=true
      - EMAIL_FROM_SYSTEM=email@gmail.com
      - EMAIL_FROM_USER=email@gmail.com
      - ALLOWED_ORIGINS=https://your-domain.com|your-domain.com
      - IMAGE_PROCESSOR_HOST=https://your-openai-api.com/v1/chat/completions
      - IMAGE_PROCESSOR_MODEL=nanonets-ocr-s
    ports:
      - 8080:8080
    volumes:
      - ./data:/app/data
      - ./image-processor-prompts.json:/app/lib/config/image-processor-prompts.json:ro
    <<: *logging

  mcp:
    image: ghcr.io/missionsquad/mcp-api:1.7.0
    container_name: mcp
    hostname: mcp
    restart: unless-stopped
    env_file:
      - .mcp.env
    ports:
     - 8082:8082
    volumes:
      - ./packages:/app/packages
    <<: *logging

  searxng:
    container_name: searxng
    image: docker.io/searxng/searxng:latest
    restart: unless-stopped
    depends_on:
      - redis
    expose:
      - 8083:8083
    volumes:
      - ./searxng:/etc/searxng:rw
    environment:
      - SEARXNG_BASE_URL=${SEARXNG_BASE_URL:-https://localhost:8080/}
      - UWSGI_WORKERS=${SEARXNG_UWSGI_WORKERS:-4}
      - UWSGI_THREADS=${SEARXNG_UWSGI_THREADS:-4}
      # If not configured in searxng.yaml, uncomment next line to use Redis at "redis:6379"
      # - SEARXNG_REDIS_URL=redis://redis:6379/0
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/"]
      interval: 30s
      timeout: 5s
      retries: 5
    <<: *logging

  redis:
    container_name: redis
    image: docker.io/valkey/valkey:8-bookworm
    restart: unless-stopped
    command: valkey-server --save 30 1 --loglevel warning
    networks:
      searxnet:
        ipv4_address: 172.23.0.9
    volumes:
      - ./valkey-data:/data
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
      - DAC_OVERRIDE
    <<: *logging
```

Notes:
- searxng is optional; include it only if you plan to use web search tools via MCP.
- redis can be used for two independent purposes:
  - SearXNG backend cache (optional web search tooling)
  - MissionSquad API distributed cache + invalidation (recommended for multi-instance HA)
- The API can be reached on the host at http://localhost:8080 unless you place it behind a reverse proxy (recommended).
- ALLOWED_ORIGINS must include your UI origin(s) to avoid CORS failures in browsers.

## 5) Bring the stack up

From the directory containing docker-compose.yaml:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Logs:

```bash
docker compose logs -f api
docker compose logs -f mcp
```

Initial admin:
- Sign in with ADMIN_USERNAME / ADMIN_PASSWORD from .api.env.
- Change the admin password after first login.
- Add providers and named model configurations in the Platform UI, or use API endpoints (see [Providers](/api/reference/providers) and [Models](/api/reference/models)).

## 6) Reverse proxy (production)

Terminate TLS and route traffic to containers using Nginx (recommended). Example for the API:

```nginx
server {
  listen 443 ssl http2;
  server_name api.your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8080;  # or the Docker host IP / unix socket / docker network alias
    proxy_http_version 1.1;

    # Preserve client context
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;

    # SSE-friendly: streaming chat completions
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_set_header X-Accel-Buffering no;
  }
}
```

If you also serve a static site that proxies /api/* to another origin (like the docs Worker), see `missionsquad-docs/nginx.conf.example` for SSE-safe settings. Use similar buffering and timeout flags for the Mission Squad API when exposing streaming endpoints.

## 7) Configuration reference (key environment variables)

API (service: api):
- PORT: API listen port (default 8080)
- ALLOWED_ORIGINS: Pipe-delimited list of allowed browser origins (e.g., https://your-domain.com|your-domain.com)
- JWT_SECRET: JWT signing secret
- USER_SECRET_KEY: Encryption key for per-user secrets
- ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL: Initial admin account
- MONGO_USER / MONGO_PASS / MONGO_HOST / REPLICA_SET / MONGO_DBNAME: Database credentials and connection
- SECRETS_DBNAME: Separate DB name to store encrypted user secrets
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_SECURE: Outbound e-mail
- TOOLS_HOST: URL for MCP gateway (default http://mcp:8082)
- TOOL_SECRETS: Tool secret mapping, e.g., github|github_pat
- REDIS_HOST / REDIS_USER / REDIS_PASS: Shared Redis used by API cache state sync and cross-instance core invalidation
- IMAGE_PROCESSOR_HOST / IMAGE_PROCESSOR_MODEL / IMAGE_PROCESSOR_API_KEY: OCR/image processing passthrough
- DEBUG, SCRAPE_WITH_GPU, PAGE_CACHE_MAX: operational flags

MCP (service: mcp):
- PORT: MCP listen port (default 8082)
- MONGO_* / REPLICA_SET / SECRETS_DBNAME / SECRETS_KEY: Storage and encryption for MCP-managed secrets
- INSTALL_ON_START: Comma-delimited packages to install on boot, format NAME|alias (e.g., @missionsquad/mcp-github|github)
- SEARXNG_URL: Internal URL for SearXNG when using web search tools (e.g., http://searxng)

Optional (seen in multi-tenant deployments; advanced):
- FRONTEND_URL: Primary UI origin used in generated links
- OPENAI_COMPLETIONS: Set true to enable certain OpenAI-compatible behaviors
- SIGNUP_CODES, SIGNUP_DOMAIN, ENTERPRISE: Gate onboarding and limit signups to specific domains

## 8) Operations

Start/stop/restart:
```bash
docker compose up -d
docker compose stop
docker compose restart api
```

Upgrade:
```bash
# Update image tags in docker-compose.yaml (or keep specific versions)
docker compose pull
docker compose up -d
docker image prune -f
```

Backup:
- Persisted data lives in bind mounts:
  - ./data (API)
  - ./packages (MCP tools)
  - ./valkey-data (Redis/Valkey, if used)
  - ./searxng (SearXNG config, if used)
- Back up:
  - tar/gzip the directories above
  - save .api.env and .mcp.env securely
  - use mongodump against your MongoDB cluster for point-in-time database backup

Health and logs:
```bash
docker compose ps
docker compose logs --since=1h api
docker compose logs --since=1h mcp
```

Scaling:
- The API is stateless (except local cache/data directory) and can be scaled horizontally behind a load balancer, provided all instances point at the same MongoDB and share required external services.
- For horizontally scaled API nodes, configure the same `REDIS_HOST`/`REDIS_USER`/`REDIS_PASS` on every instance to enable shared SuperLRU state and core invalidation pub/sub.
- MCP can be replicated; ensure consistent access to packages if using a shared volume or pre-baked images.

## 9) Optional: SearXNG + Redis

- Enable SearXNG for web search tooling via MCP by including the searxng and redis services.
- In .mcp.env, set `SEARXNG_URL=http://searxng` so the MCP gateway can reach it over the Docker network.
- For Redis, either configure SearXNG via `SEARXNG_REDIS_URL=redis://redis:6379/0` or in searxng.yaml within ./searxng.
- The same Redis service can also back API HA mode; if you use this pattern, set `REDIS_HOST` in `.api.env` to that Redis endpoint.

## 10) Verify and first use

1) Confirm API is reachable:
```bash
curl -s http://localhost:8080/v1/models | head
```

2) Sign into the Platform UI:
- If you host your own UI, set it to point at your API base URL.
- If you use a separate hosted UI, ensure the API’s ALLOWED_ORIGINS contains that UI origin.

3) Add a Provider and save a Model configuration, then create an Agent and test in Prompt Studio. See:
- [Providers](/platform/providers)
- [Models](/platform/models)
- [Agents](/platform/agents)
- [MCP (Tools)](/platform/mcp)

## 11) Troubleshooting

- Database auth failures:
  - Verify MONGO_HOST and credentials; use SRV or correct replica set name
- CORS errors in browser:
  - Ensure ALLOWED_ORIGINS includes your UI origin(s), exactly matching scheme/host
- SMTP 535/454 errors:
  - Check SMTP_USER/SMTP_PASS and SMTP_SECURE based on your provider (e.g., Gmail App Password)
- MCP cannot reach SearXNG:
  - Check SEARXNG_URL in .mcp.env and SearXNG container health
- Streaming hangs:
  - Ensure your reverse proxy disables buffering (proxy_buffering off) and sets X-Accel-Buffering: no
- Permission denied on bind mounts:
  - `chown -R 1000:1000 ./data ./packages` (or appropriate UID/GID) so Docker can write

---

## Appendix: Minimal quickstart

1) Create .api.env and .mcp.env with your secrets and Mongo URL.
2) Place docker-compose.yaml and image-processor-prompts.json (template) into the same directory.
3) Run:
```bash
docker compose up -d
```
4) Put a reverse proxy (Nginx) in front of the API domain with SSE-safe settings.

## Appendix: Multi-tenant patterns (advanced)

- You can run multiple API/MCP pairs in one compose file, each with distinct env files, data volumes, and ports.
- Ensure ALLOWED_ORIGINS and FRONTEND_URL match each tenant’s UI origin, and that each pair points to the appropriate secrets DB and packages directory.
