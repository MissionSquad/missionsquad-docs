---
title: Execution Environment
---

# Execution Environment

Purpose: Give an agent a private Linux workspace where it can run shell commands and Python, Node, or TypeScript, read and write files, install packages, and save its work so a later session can pick up where this one stopped.

::: warning Early access
The execution environment is in early access. It is enabled per deployment, so it may not be available on every account or self-hosted installation yet. Today it works for agents **in chat**, used by the agent's owner — see [Current scope](#current-scope).
:::

## How it works

- **Workspace** — your saved work: files under `/workspace`, packages you installed into it, the working directory, and non-secret environment settings. A workspace belongs to one user.
- **Execution session** — a running copy of a workspace. Every active session runs in its **own microVM**; closing or timing out releases it.
- **Revision** — a saved state of a workspace. Saving creates a new revision; resuming starts a fresh session from the latest revision.
- **Job** — a command or script run in a session, in the foreground or in the background.

Resume restores files, installed workspace dependencies, the working directory, and settings. **Running programs and memory do not carry over** — run them again after resuming.

## Typical flow

1) **Check it is available.** In **MCP**, look for **Execution Environments** under **Platform Servers**. If it isn't listed, it isn't enabled for your deployment yet.
2) **Give an agent the tools.** In [Agents](/platform/agents), enable **Use Tools (MCP)**, select **Execution Environments**, and optionally **Select Functions** to limit what the agent can do (for example, leave out `ee_import` or `ee_fork`). Save.
3) **Chat with the agent.** Ask for work that needs a computer — "load this CSV with Python and summarize revenue by month", "write a script, run it, and give me the output files". The agent opens a session, works, and reports back; every tool call appears inline in the chat.
4) **Get the files.** Ask the agent to export the results as a ZIP. A download button (`filename (N KB)`) appears in the chat. See [Downloads](#downloads).
5) **Save or close.** Ask the agent to save, or use the workspace panel. Saved work is there next time.

## The workspace panel

In chat, the **Workspace** button opens the **Chat workspace** panel for the current conversation. It shows the session state, whether there are unsaved changes ("Changes pending"), the workspace ID and revision, and the session's vCPU, memory, and deadline.

- **Start workspace** / **Resume** — open a fresh workspace or restore the saved one into a new session.
- **Save** — save a revision and keep working. **Save and close** — save and release the session. **Discard changes** — close without saving; the last saved revision stays available.
- **Saved workspaces** — attach a different saved workspace to this chat.
- **Fork saved revision** — start a new workspace from the latest saved revision.
- **Session limits** — request different limits for the next session (vCPU, memory, workspace storage, workspace entries, processes and threads, retained output per job, idle timeout, command timeout, maximum session duration), up to the deployment's ceilings. Leave a field empty to use the saved setting or default.
- **Files** — browse a **Guest directory** in a running session, preview files, and list **Artifacts**.
- **Active jobs** — read a job's **Output** or **Cancel job**.
- **Backups and exports** — **Create named backup** (optionally saving current changes first), or **Download saved revision** as a portable archive (optionally including the environment image and retained command output).
- **Import a saved workspace** — create a new workspace from a portable archive (`.tar`); its files and environment are verified first.
- **Delete saved workspace** — revokes access to the workspace, its revision history, and its job output, and schedules its data for removal. Named backups are kept unless you choose to delete them too.

## Isolation and network

- Each active session runs in a dedicated **microVM** on a KVM host. Containers are only used to build the environment image; they are not the security boundary.
- Programs run as an unprivileged user under cgroup limits and a seccomp filter. There is no `sudo`, and the base system is read-only. OS packages cannot be installed during a session.
- The guest has no host mounts, Docker socket, cloud credentials, or database access. Platform and provider credentials never enter it.
- **Network:** by default, sessions can reach the public internet; private, local, link-local/metadata, and infrastructure address ranges are blocked over IPv4 and IPv6. A session can also be opened fully `offline`. Inbound ports are closed — sessions can't host a reachable server or preview.
- One workspace has one active session writing to it at a time.

See also [Security & Isolation](/platform/security).

## What's in the environment

The default `coding` profile is Debian Linux with:

- Python 3 (with `pip` and `venv`), `uv`, Node.js and npm, TypeScript and `tsx`
- `bash` and core utilities, `git`, `ripgrep`, `jq`, `sqlite3`, `make`, `gcc`/`g++`, `curl`, `wget`, `zip`/`unzip`, `tar`/`gzip`/`zstd`, and common network diagnostics

Packages installed with `pip`, `uv`, or `npm` go into the workspace and are saved with it (unless your administrator has disabled user packages).

## Limits

Defaults per session, and the maximum you can request (your deployment may set different values):

| Resource | Default | Maximum |
| --- | --- | --- |
| vCPU | 2 | 4 |
| Memory | 2 GiB | 8 GiB |
| Workspace storage | 5 GiB | 20 GiB |
| Workspace entries | 100,000 | 200,000 |
| Processes and threads | 128 | 256 |
| Retained output per job | 10 MiB | 50 MiB |
| Idle timeout | 15 minutes | 1 hour |
| Maximum session duration | 2 hours | 8 hours |
| Command timeout | 120 seconds | 15 minutes |

Per-user defaults: 2 active sessions at once, 8 vCPU and 8 GiB in total, 20 queued jobs, and 20 GiB of retained saved revisions. A workspace idle with unsaved changes is saved automatically. The current saved revision is kept until you delete the workspace; up to 5 older revisions are kept for up to 30 days, and job logs for 30 days.

## Downloads

When the agent calls `ee_export_zip`, the chat shows a download button for the archive.

- Up to 256 files or folders per archive, up to 50 MiB, 10,000 entries; symbolic links and special files are refused.
- The archive is kept for 24 hours, even after the session closes. Download links are short-lived and refresh when you click.
- The archive itself never passes through the model — the download link is removed from the tool result before the model sees it.

If a download has expired, the chat says "Download unavailable or expired. Ask the agent to export the files again."

## Agent tools

The **Execution Environments** server exposes these tools:

| Tool | What it does |
| --- | --- |
| `ee_profiles` | Inspect the environment profile, its default limits, and availability |
| `ee_open` | Open a fresh session or restore a saved workspace, waiting until it is ready |
| `ee_status` | Read session state and saved-revision status |
| `ee_list` | List workspaces, revisions, or backups |
| `ee_exec` | Run a shell command or an executable with arguments |
| `ee_run_code` | Run a Python, Node, or TypeScript script |
| `ee_job` | Wait for a job and read its output |
| `ee_cancel` | Cancel a job and its child processes |
| `ee_files` | List, stat, read, write, make directories, move, or delete under `/workspace` |
| `ee_transfer` | Upload/import files into the workspace, or export a single file |
| `ee_export_zip` | Package selected files and folders as a ZIP for download |
| `ee_settings` | Set the working directory and non-secret environment variables |
| `ee_checkpoint` | Save a revision and keep the session open |
| `ee_close` | Save and close (default), or close and discard changes |
| `ee_fork` | Create a new workspace from a saved revision or backup |
| `ee_backup` | Pin the latest saved revision as a named backup |
| `ee_export` | Create a time-limited download of a saved workspace |
| `ee_import` | Create a new workspace from a portable archive |
| `ee_operation` | Wait for the result of a long-running operation |

Tools wait up to about two minutes for a result. For longer work, the agent can start a background job and check on it with `ee_job`.

## Current scope

Available now:

- Agents in chat, working in their owner's private workspaces
- Shell, Python, Node, and TypeScript, with packages installed into the workspace
- Saved workspaces, forks, named backups, portable export/import, and ZIP downloads
- Public internet access, or fully offline sessions

Not yet supported:

- Execution inside workflow or factory steps, scheduled runs, or webhooks
- Requests authenticated with an API key (for example `/v1/chat/completions` with `x-api-key`) — execution runs only for the signed-in owner in chat
- Using your workspace through someone else's shared agent
- Inbound ports, previews, or hosting a live app
- Interactive terminals (no TTY or stdin) and notebook kernels
- Injecting your own secrets into the workspace — environment settings are for non-secret values only

## Gotchas

- Each command runs in a fresh shell. Use `ee_settings` (or explicit `cd`/paths) instead of relying on a previous command's state.
- After resuming, start any servers or long-running programs again — only files and installed dependencies come back.
- Idle workspaces are saved automatically, but a session that reaches its maximum duration mid-work can lose changes made since the last save. Save at milestones in long sessions.
- Ask the agent to export a ZIP rather than paste large file contents into chat — it is faster, keeps the context small, and preserves binary files.

## Related

- [Agents](/platform/agents) — attach tools to an agent
- [MCP (Tools)](/platform/mcp) — platform and external tool servers
- [Security & Isolation](/platform/security)
