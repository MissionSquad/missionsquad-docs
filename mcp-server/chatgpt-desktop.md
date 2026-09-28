---
title: ChatGPT Desktop — MCP Server and Skill
description: Install the MissionSquad npm MCP server and configuration skill in the ChatGPT desktop app.
---

# ChatGPT desktop setup

Connect your MissionSquad account with the npm MCP server, then install the
configuration skill. Complete the [prerequisites](/mcp-server/#prerequisites) first.

This setup uses the desktop app's **local MCP host**, shared with Codex on that
computer. Use a local chat with these tools available. A cloud-only ChatGPT chat
cannot launch `npx` on your computer or read this local configuration; installing a
skill alone does not provide that connection.

## Install the MCP server

In ChatGPT desktop, open **Settings → MCP servers → Add server**. Choose **STDIO**
and enter:

| Field | Value |
| --- | --- |
| Name | `missionsquad` |
| Command (macOS) | `npx` |
| Arguments (macOS) | `-y`, `@missionsquad/mcp-msq@latest` as separate arguments |
| Command (Windows) | `cmd` |
| Arguments (Windows) | `/c`, `npx`, `-y`, `@missionsquad/mcp-msq@latest` as separate arguments |
| Environment: `MSQ_API_KEY` | Your MissionSquad API key |
| Environment: `MSQ_BASE_URL` | `https://agents.missionsquad.ai/v1` |

Save and select **Restart**. The first startup can take longer while npm downloads
the package. This is a command-based server; do not enter the npm package in a
remote connector URL field. OpenAI documents the desktop controls in its
[MCP setup guide](https://learn.chatgpt.com/docs/extend/mcp).

### Configure with a file instead

Add the following to your user configuration, preserving existing entries. If
`missionsquad` is already configured, edit that entry rather than adding it twice.

- macOS: `~/.codex/config.toml`
- Windows: `%USERPROFILE%\.codex\config.toml`

::: code-group

```toml [macOS]
[mcp_servers.missionsquad]
command = "npx"
args = ["-y", "@missionsquad/mcp-msq@latest"]
startup_timeout_sec = 60
tool_timeout_sec = 600

[mcp_servers.missionsquad.env]
MSQ_API_KEY = "msq-REPLACE_WITH_YOUR_API_KEY"
MSQ_BASE_URL = "https://agents.missionsquad.ai/v1"
```

```toml [Windows]
[mcp_servers.missionsquad]
command = "cmd"
args = ["/c", "npx", "-y", "@missionsquad/mcp-msq@latest"]
startup_timeout_sec = 60
tool_timeout_sec = 600

[mcp_servers.missionsquad.env]
MSQ_API_KEY = "msq-REPLACE_WITH_YOUR_API_KEY"
MSQ_BASE_URL = "https://agents.missionsquad.ai/v1"
```

:::

Replace the placeholder key locally and restart the MCP server or desktop app.
The optional timeouts allow npm startup and longer workflow/factory status waits;
increase the tool timeout if an intended run takes more than ten minutes. These
are client limits, separate from `MSQ_HTTP_TIMEOUT_MS` on individual API requests.
See the [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

## Install the skill

Download [msq-config-agent.zip](/downloads/msq-config-agent.zip). It contains a
standard `SKILL.md` and four references, with host-independent MCP instructions.
There is no recording step and no Claude plugin wrapper.

Extract the ZIP into your personal local skills folder:

::: code-group

```sh [macOS]
mkdir -p "$HOME/.agents/skills"
unzip "$HOME/Downloads/msq-config-agent.zip" -d "$HOME/.agents/skills"
```

```powershell [Windows PowerShell]
New-Item -ItemType Directory -Force "$HOME\.agents\skills" | Out-Null
Expand-Archive -Path "$HOME\Downloads\msq-config-agent.zip" -DestinationPath "$HOME\.agents\skills"
```

:::

Adjust the download path if your browser saved it elsewhere. You can also unzip
and move the folder with Finder or File Explorer. The final layout must be:

```text
~/.agents/skills/msq-config-agent/
├── SKILL.md
└── references/
    ├── agent-pages.md
    ├── factories.md
    ├── schedules.md
    └── workflows.md
```

Avoid an extra enclosing folder. If a copy is already installed (including under
`~/.codex/skills`), back up any custom edits and update that copy rather than
creating two skills with the same name.

Start a new local chat; restart the app if the skill is not discovered. Select
`msq-config-agent` in the skill picker (`@` in ChatGPT, `$` in Codex), or ask to use
it by name. The [OpenAI skills guide](https://learn.chatgpt.com/docs/build-skills)
documents local discovery and invocation. This installation is local to this
computer; it does not create an account-wide plugin or install the MCP server.

## Verify both parts

Check that `missionsquad` is connected in MCP settings. In a local Codex chat,
`/mcp` also shows connected servers. Then send:

> Use the msq-config-agent skill to list my MissionSquad agents, workflows, and
> factories. Do not create, modify, run, publish, or schedule anything.

The response should come from tools such as `msq_list_agents`, `msq_list_workflows`,
and `msq_list_factories`. An empty list is a successful connection when your account
has no saved items. The tool appearing in a picker alone does not verify the API key.

## Troubleshooting and updates

- **`npx` not found:** desktop apps may have a different `PATH` from your shell.
  On macOS, run `command -v node` and `command -v npx`. Set the command to the
  absolute `npx` path and, if necessary, add the directory containing `node` to the
  server's `PATH` environment setting. On Windows, check `where.exe node` and
  `where.exe npx` and restart the app after installing Node.js.
- **Startup timeout:** check npm registry access and use `startup_timeout_sec = 60`
  in the TOML configuration. Authentication is supplied through `MSQ_API_KEY`, not
  an MCP OAuth login for this local server.
- **Missing key or HTTP 401:** replace the placeholder with the MissionSquad key
  and restart the server. Verify the API base URL includes `/v1`.
- **Tools available, skill missing:** check the folder layout above and restart.
  **Skill available, tools missing:** check local MCP settings and use the local
  desktop/Codex host instead of a cloud-only chat.
- **Update:** restart the server to resolve the npm `@latest` tag. For a fixed
  version, replace `@latest` with a published version such as `@0.7.1`. To update
  the skill, download the current ZIP and replace its folder after saving local edits.

Continue with the [MCP tool reference](/mcp-server/#tool-reference).
