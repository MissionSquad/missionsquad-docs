---
title: Claude Desktop — MCP Server and Skill
description: Install the MissionSquad npm MCP server and upload its configuration skill in Claude Desktop Chat.
---

# Claude desktop setup

Install the npm MCP server and configuration skill, then use them together in
**Claude Desktop Chat**. Complete the [prerequisites](/mcp-server/#prerequisites)
first.

::: warning Use Desktop Chat for the local npm server
Claude documents local servers configured in `claude_desktop_config.json` as
available in Desktop Chat, **not Cowork or claude.ai**. Uploading the skill does
not change that transport limitation. Those other surfaces need a supported
remote MCP connection. See Claude's
[local versus remote connector guidance](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
:::

## Install the MCP server

Open Claude Desktop's **Settings → Developer → Edit Config**. This opens
`claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add `missionsquad` to the existing `mcpServers` object. Keep other servers and
settings. If the file is empty, use the complete example for your operating system:

::: code-group

```json [macOS]
{
  "mcpServers": {
    "missionsquad": {
      "command": "npx",
      "args": ["-y", "@missionsquad/mcp-msq@latest"],
      "env": {
        "MSQ_API_KEY": "msq-REPLACE_WITH_YOUR_API_KEY",
        "MSQ_BASE_URL": "https://agents.missionsquad.ai/v1"
      }
    }
  }
}
```

```json [Windows]
{
  "mcpServers": {
    "missionsquad": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@missionsquad/mcp-msq@latest"],
      "env": {
        "MSQ_API_KEY": "msq-REPLACE_WITH_YOUR_API_KEY",
        "MSQ_BASE_URL": "https://agents.missionsquad.ai/v1"
      }
    }
  }
}
```

:::

Replace the placeholder with your MissionSquad key. Save, fully quit Claude
Desktop, and reopen it. Claude starts the process; `npx -y` fetches the published
npm package without an interactive install prompt. A global npm installation or
separately running terminal server is not needed.

Check the server in **Settings → Developer** and enable its tools in your Chat
conversation's connector controls. Claude's
[local MCP setup guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
covers configuration, restart, and tool discovery. The Windows command follows
the [official MCP server example](https://github.com/modelcontextprotocol/servers/blob/main/src/everything/README.md).

## Install the skill

Download [msq-config-agent.zip](/downloads/msq-config-agent.zip). Keep it zipped
for upload. This is a **standalone skill**, not a Claude plugin or a desktop MCP
extension; it contains no credentials and does not install the server.

In Claude Desktop:

1. Open **Customize → Skills**.
2. Select **+ → Create skill → Upload a skill**.
3. Choose `msq-config-agent.zip` and enable the imported skill.
4. Start a new **Chat** conversation with the MissionSquad tools enabled.

Claude requires code execution for Skills. If the upload or enable controls are
unavailable, check your account's capability settings and workspace policy. The
current [Skills instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude)
describe those controls and availability.

The ZIP contains one top-level `msq-config-agent/` directory with `SKILL.md` and a
`references/` directory. Upload the supplied ZIP as-is; do not wrap it in another
folder or upload the old `.claude-plugin` bundle. Claude's
[custom skill packaging guide](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
describes this format. The same portable bundle also works with the
[ChatGPT desktop installation](/mcp-server/chatgpt-desktop#install-the-skill).

## Verify both parts

In **Desktop Chat**, send:

> Use the msq-config-agent skill to list my MissionSquad agents, workflows, and
> factories. Do not create, modify, run, publish, or schedule anything.

Allow the requested read-only tool calls. Results should come from tools such as
`msq_list_agents`, `msq_list_workflows`, and `msq_list_factories`. An empty list is a
valid result. This verifies API access as well as discovery, without starting an
agent run or changing your account.

## Troubleshooting and updates

- **Invalid JSON:** use double quotes, remove trailing commas, and keep exactly
  one top-level `mcpServers` object. Merge the server into your existing file.
- **`npx` not found:** on macOS, locate it with `command -v npx` and use that
  absolute path as `command`. Also check `command -v node`: the GUI process needs
  Node.js on its `PATH`, even when `npx` has an absolute path. On Windows, use the
  `cmd /c npx` example, check `where.exe node` and `where.exe npx`, then restart.
- **Missing key or HTTP 401:** check `MSQ_API_KEY` and the API URL ending in `/v1`,
  then fully restart Claude. Do not replace the MissionSquad key with an AI provider key.
- **Skill uploads but tools are missing:** finish the MCP setup and use Desktop
  Chat. Cowork cannot use this local JSON-configured server.
- **Skill upload fails:** use the supplied ZIP, with `msq-config-agent/SKILL.md`
  immediately inside its top-level folder. Do not upload the unzipped folder or
  a plugin archive through the Skills upload control.
- **Server still fails:** inspect `mcp.log` and `mcp-server-missionsquad.log` in
  `~/Library/Logs/Claude` (macOS) or `%APPDATA%\Claude\logs` (Windows).
- **Update:** fully restart Claude to resolve the npm `@latest` tag. To pin a
  release, use a published version such as `@missionsquad/mcp-msq@0.7.1`. For skill
  updates, download the current ZIP and replace the previous imported skill,
  preserving any edits you want to keep.

The manual JSON file stores your API key locally. Keep it out of screenshots,
shared configuration files, and the skill archive. Continue with the
[MCP tool reference](/mcp-server/#tool-reference).
