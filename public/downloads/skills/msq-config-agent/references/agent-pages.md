# Building an Agent Page

An Agent Page publishes a source's output at a public URL (`<publicOrigin>/p/<slug>`). A page is:
- a **header** (title, description, owner byline)
- a **source** (`agent`, `workflow`, or `factory`)
- a **layout** (blocks the API compiles into a strict JSON Schema every run must satisfy)
- a **run mode**: `on-demand` (visitors press Run, optional input form) or `scheduled` (daily or weekly editions)

## Procedure

1. **Clarify** with the user: what the page shows, whether visitors supply input (on-demand) or it runs on a timer (scheduled), and visibility. Pages are user pages (`pageType: "user"`). Default to unlisted (`publicListed: false` — reachable by URL, hidden from the directory) unless a listed page is requested. Use `visibility: "private"` when only the owner should see it (cannot be combined with payment).

2. **Pick the source by task shape**: `agent` for one fetch plus one report (simplest — prefer it); `workflow` for independent parallel fetches plus one synthesis; `factory` for sequential dependent steps. Create and verify the source first using the procedures in SKILL.md.

3. **Model policy**: any layout containing a `url` or `image` field REQUIRES a Google Gemini model on agent-source pages (OpenAI models reject the compiled `format: "uri"`). The whole run must finish within 5 minutes — prefer fast models and strict tool discipline in fetcher prompts.

4. **Input form wiring** (the most common mistake). Each input field's `name` must be exactly the key the source reads:
   - agent source: the key the agent prompt refers to (the run appends a fenced `Run input (validated)` JSON block, so the prompt must say what to do with each key)
   - workflow source: a top-level `dataPayload` key (visitor input merges over it)
   - factory source: the carry-payload key step 1 reads
   Text fields may carry an anchored `validation` regex (≤ 200 chars, no backreferences or nested quantifiers); select fields list `options`.

5. **Author the layout** as `{ "title", "layout": "report", "fields": [...] }`. Blocks are type·display pairs:
   - `richtext`·`synopsis` (lede), `richtext`·`paragraph`
   - `text`·`heading`, `text`·`paragraph`
   - `number`·`stat`
   - `list`·`stats` (items `label`, `value`, optional `delta` text, `direction` enum up/down/flat)
   - `list`·`stories` (items `heading`, `body`)
   - `list`·`table` (one item field per column)
   - `url`·`source`, `enum`·`badge`, `image`
   Field names are unique snake_case. Every field `description` is the instruction the model sees — write it as guidance ("Month-over-month change, e.g. '+3.2%'"). Set `maxItems` on lists. Badge colors only apply to buy/up/positive/pass, sell/down/negative/fail, and hold/flat/neutral/warn; map the page's semantics onto those values.

6. **Create the draft** with `msq_create_page`. For workflow or factory sources, call `msq_compile_page_layout_schema` with the layout and put the returned schema into the final agent's prompt (the workflow's main agent or the last factory step's agent) with: "Respond with ONLY a JSON object conforming exactly to this schema — no prose, no markdown fences." Agent-source pages don't need the schema in the prompt; the run supplies it as the response format.

7. **Verify before publishing, every time**: `msq_run_page_preview` (a real run stored in page history; pass `input` for on-demand pages) → `msq_get_page_run_status` (waits) → `msq_get_page_run_result`. Check every layout field is filled sensibly. If the run fails or content is wrong, fix the prompt/layout/model and run again; remove failed rows with `msq_delete_page_run`. Owner runs read live configuration — no republish needed between attempts.

8. **Publish** with `msq_publish_page` only after confirming title, description, and visibility with the user. The slug derives from the title at first publish and is stable afterwards. Share the returned `publicUrl`, then verify with `msq_get_public_page`; for on-demand pages you may also run it as a visitor: `msq_run_public_page` → `msq_get_public_page_run`.

9. **Edit** with `msq_update_page`: only passed fields change; `null` removes an optional block; switching `runMode` drops the other mode's settings. Prompt and layout edits apply on the next run without republishing. `msq_unpublish_page` (slug stays reserved) before `msq_delete_page`.

10. **Scheduled pages** use `schedule` with `cadence` (daily | weekly), `dayOfWeek` for weekly, wall-clock `hour` and `minute`, and an IANA `timezone` (confirm timing and timezone with the user). Verify with `msq_run_page_preview` (produces the current period's edition); after publishing read editions with `msq_get_public_page_content`.

11. **Paid pages** (per-run x402 payment) are on-demand only: pick an available `network` from `msq_list_x402_networks` and set `payment` with `payTo` and `priceUsd`. Never combine payment with private visibility.

## Plan template to show the user before creating

- Source: `<agent|workflow|factory>` — `<name>`
- Run mode: `<on-demand|scheduled (cadence, time, timezone)>`
- Input fields (on-demand): `<name → key the source reads, type, validation/options>`
- Layout blocks: `<field_name: type·display — description>`
- Visibility: `<unlisted|listed|private>`, payment: `<none|network/priceUsd>`
