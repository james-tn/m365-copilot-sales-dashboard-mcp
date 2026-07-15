# Design Guide — Building an Intelligent Analytics Agent with MCP Apps for M365 Copilot

A **repeatable design-and-build process** for turning a business intelligence
domain (backed by a real data warehouse) into an *intelligent, conversational*
analytics agent: a declarative Microsoft 365 Copilot agent + an MCP Apps server
that returns both grounded data **and** a rich interactive UI rendered inline in
chat.

This is the **methodology** ("how to design one of these from scratch"). For the
concrete build/deploy mechanics of *this* repo, see
[`GUIDE.md`](GUIDE.md). This document uses the Sales Dashboard in this repo as the
worked example throughout.

> **Working assumption used in this guide:** only a tool result's **`content`**
> (text) is added to the model's context. **`structuredContent` is for UI
> rendering only and is never guaranteed to be model-visible.** This matches the
> MCP Apps spec's Data Passing best practice; do not rely on the model "seeing"
> the structured payload behind a widget. It has direct design consequences in
> Phases 4–6.

---

## The process at a glance

| Phase | You produce | This repo's artifact |
| :-- | :-- | :-- |
| 0. Frame the solution | Personas, scope, decisions, non-goals | `instruction.txt` (boundaries) |
| 1. Define KPIs & metrics | A **metric catalog** (semantic layer) | `analytics.py` |
| 2. Data & analytics contract | Warehouse mapping + `structuredContent` schemas | `data.py`, `analytics.py`, `types.ts` |
| 3. UI system design | View taxonomy, layout, filters, drill paths, states | `widgets/src/views/*`, `App.tsx` |
| 4. NL surface (tools & prompts) | Tool catalog, input schemas, tool/agent instructions | `tools.py`, `ai-plugin.json`, `instruction.txt` |
| 5. Interaction model | A decision table: silent fetch vs message vs context | `McpBridge.tsx`, `App.tsx`, `ui.tsx` |
| 6. Context-aware operations | Selection→ask, filter→action, state strategy | `App.tsx` (`navigate`), `PromptChip` |
| 7. Auth & security | Identity, per-user scoping, secrets, PII | `ai-plugin.json` `auth`, `settings.py` |
| 8. Package, deploy, operate | Agent package, hosting, observability | `m365agents.yml`, `Dockerfile` |
| 9. Validate & iterate | Eval prompts, tool-selection tests | `scripts/smoke_test.py` |

Work top-to-bottom, but expect to loop: UI design (Phase 3) and the tool catalog
(Phase 4) co-evolve, and the interaction model (Phase 5) often sends you back to
refine both.

---

## Phase 0 — Frame the solution

Decide *who* asks *what*, and *how the answer should appear*, before writing any
code.

1. **Personas & jobs-to-be-done.** e.g. *Sales rep* ("how am I tracking to
   quota?"), *Sales manager* ("which deals are at risk?"), *RevOps* ("pipeline by
   stage and region"). Each persona implies different default views and metrics.
2. **Answer modality per question type.** For every representative question,
   pre-decide: *rich widget*, *data-only text*, or *both*. This becomes the
   `ui: true|false` flag in Phase 4. Rule of thumb:
   - Comparisons, breakdowns, trends, "show me…" → **widget**.
   - Single scalar facts ("what's our win rate?") → **data-only** text.
3. **Scope & non-goals.** Enumerate what the agent will *not* do — this becomes
   the **Boundaries** section of the agent instructions and stops the model from
   hallucinating unsupported capabilities. (See `instruction.txt` → "Boundaries".)
4. **Guardrails.** Read-only vs write actions, sensitivity of data, whether
   figures are demo vs live. Mark read-only tools with `annotations.readOnlyHint`
   (see every tool in `ai-plugin.json`).

**Deliverable:** a one-page brief — personas, top ~15 questions each, the answer
modality for each, and explicit non-goals.

---

## Phase 1 — Define KPIs & metrics (the semantic layer)

This is the heart of an *intelligent* analytics agent. The model can only reason
as well as your metrics are defined. Build a **metric catalog** — one
unambiguous definition per KPI — independent of any UI.

For each metric capture:

| Attribute | Example (Win Rate) |
| :-- | :-- |
| **Name / id** | `win_rate` |
| **Definition (formula)** | `won_count / (won_count + lost_count)` |
| **Grain** | per company, per rep, per region |
| **Dimensions it slices by** | period, region, rep, stage |
| **Time semantics** | closed-won/lost within the selected period; open pipeline is always "as of now" |
| **Filters that apply** | period, region |
| **Format** | percentage, 0 decimals |
| **Edge cases** | denominator 0 → return 0, never divide-by-zero |

In this repo the catalog lives in **`analytics.py`**. Note how the same rules
appear once and are reused everywhere: `_safe_div` guards every ratio;
`_period_bounds` centralizes time semantics; open pipeline ignores the period
window while closed figures respect it (`_in_period`). That single source of
truth is what keeps the agent's spoken numbers, the widget, and drill-downs
consistent.

**Concrete KPI set in this example** (`compute_dashboard` → `kpis`): open
pipeline, weighted pipeline (`amount × probability`), closed-won, closed-lost,
win rate, average deal size, total quota, quota attainment, and deal counts.

**Deliverable:** a metric catalog (a table or a `metrics.yaml`) that a
non-engineer can review. Every number the agent will ever say should trace back
to one row here.

> **Why this matters for the LLM:** because only `content` reaches the model, the
> *text summary* you build from these metrics (Phase 4) is literally all the model
> knows. Under-specify a metric and the agent will speak vaguely or wrongly.

---

## Phase 2 — Data & analytics contract (warehouse → payload)

Now bind the catalog to a real data warehouse and define the exact JSON the
server returns.

### 2a. Warehouse integration

The demo uses an in-memory dataset (`data.py`). For production, replace it with a
**repository/semantic layer** that your analytics functions call:

- **Push computation down** to the warehouse (Snowflake / BigQuery / Synapse /
  Fabric / Databricks SQL) or a semantic model (dbt metrics, Power BI / Fabric
  semantic model, Cube, etc.). Return aggregates, not raw rows.
- Keep `analytics.py` as a **thin adapter**: it should orchestrate parameterized
  queries and shape results, not re-implement business logic that already lives
  in your semantic layer.
- **Cache** hot aggregates (dashboard headline numbers) with a short TTL; drill
  paths can be lazier.
- **Parameterize every filter** (period/region/rep) to prevent SQL injection and
  to let the warehouse optimize.
- Decide the **freshness contract** ("as of last night's load" vs near-real-time)
  and surface it in the text `content` so the agent can state it.

### 2b. The `structuredContent` schema (UI contract)

Every tool returns a `CallToolResult` with two channels (see `tools.py`
`_result`):

- **`content`** — a short text summary. *This is the model's entire view of the
  answer.* Put every figure the agent may need to quote here.
- **`structuredContent`** — the payload the widget renders. **UI-only.** Include
  a **`view` discriminator** so a *single* widget can route to the right screen.

This repo's discriminator (`types.ts`, consumed by `App.tsx`):
`dashboard | deals | deal | rep | summary | error`. One widget, many views —
simpler to build, ship, and cache than many widgets.

**Design the schema view-first:** each view's payload should contain exactly what
its UI needs (already aggregated, pre-sorted, pre-formatted where helpful —
e.g. `top_deals` is pre-sorted top-6, `rep_leaderboard` pre-sorted by
closed-won). Don't ship raw tables the widget must crunch.

**Deliverable:** a typed schema (TypeScript `types.ts` on the widget side, mirrored
by the server's dict shapes) for every `view`, plus the text-summary template for
each tool.

---

## Phase 3 — Design the UI system

Design the **widget taxonomy** and each view's anatomy before coding components.

### 3a. Choose your view taxonomy

Map questions (Phase 0) to views. This repo:

| View | Answers | Key UI elements |
| :-- | :-- | :-- |
| `dashboard` | "how are we doing / overview" | KPI cards, pipeline funnel, top deals, leaderboard, region breakdown |
| `deals` | "show deals matching X" | filtered, sortable deal list + active-filter chips |
| `deal` | "drill into this deal" | detail card + sibling deals at the account |
| `rep` | "how is this rep doing" | scorecard + their deals |
| `summary` | quick facts (data-only tool) | (reuses dashboard KPIs, no rich extras) |
| `error` | not-found | message + recovery chips |

### 3b. Design each view's anatomy

For every view specify: **header/title bar**, **primary metrics**, **the main
visual** (funnel, list, meter), **row/card affordances** (what's clickable →
Phase 5), **empty/loading/error states**, and **display modes** (inline vs
fullscreen). See `components/ui.tsx` for the reusable kit (`KpiCard`, `Meter`,
`StagePill`, `HoverRow`, `TitleBar` with back + fullscreen, `Loading`).

### 3c. Filters

Decide which filters are **UI controls** vs **NL-only**. This repo drives filters
via tool arguments (`period`, `region`, `stage`, `rep`, `min_amount`, `search`)
and shows active filters back to the user (`list_deals` echoes a `filters`
object). A UI filter control simply issues the same tool with new args — see
Phase 5 for whether that's a silent call or a message.

### 3d. Host-fidelity concerns

- **Theme & fonts:** honor host context (`onhostcontextchanged` → light/dark; the
  SDK's `useHostStyleVariables`/`useHostFonts`). Never hard-code colors that fight
  the host chrome.
- **Auto-resize:** report height so the inline iframe fits content
  (`McpBridge` `notifyHeight` + `ResizeObserver`).
- **Portability:** if you target ChatGPT-style hosts too, plan the
  `window.openai` fallback (this repo does it in `McpBridge`).

**Deliverable:** wireframes per view + a component inventory + a state matrix
(loading / empty / error / fullscreen) for each.

---

## Phase 4 — Design the natural-language surface (tools & prompts)

Tools are the **only** vocabulary the model has. Tool names, descriptions, and
input schemas *are* the prompt-engineering surface.

### 4a. Tool catalog

Derive tools from the view taxonomy + the "quick fact" cases:

| Tool | UI? | Purpose | Inputs |
| :-- | :-- | :-- | :-- |
| `show_sales_dashboard` | ✅ | overview widget | `period`, `region` |
| `list_deals` | ✅ | filtered list widget | `stage, region, rep, min_amount, search` |
| `show_deal_details` | ✅ | one-deal widget | `deal_id` (required) |
| `show_rep_details` | ✅ | one-rep widget | `rep` (required) |
| `get_sales_summary` | — | **data-only** quick facts | `period`, `region` |

**Link UI tools to the widget** via `_meta.ui.resourceUri` pointing at the
`ui://…/app.html` resource (`server.py` attaches this to every `ui: true` tool).
The data-only tool omits it (`get_sales_summary`, `ui: False`) — this is your
Phase-0 "answer modality" decision made real.

### 4b. Write model-facing descriptions deliberately

The description is how the model *chooses* and *fills* a tool. For each tool
spell out **when to use it** and **enumerate the valid filter values**
(`period`: this_quarter/this_year/last_quarter/all; `region`: AMER/EMEA/APAC/LATAM;
stages by name). See the rich descriptions in `tools.py` `TOOL_SPECS` and the
mirrored `x-mcp_tool_description` in `ai-plugin.json`. Precise enums here mean the
model maps free-form language ("last three months in Europe") to the right
arguments.

### 4c. Craft the text `content` (the model's grounding)

Because only `content` reaches the model, the deterministic text template
(`tools.py` `_result`, e.g. the dashboard's summary f-string) must contain every
figure you want the agent to be able to quote. **Design principle:** if the agent
should be able to say it, it must be in `content` — not just in
`structuredContent`. For per-item questions ("name the top 3 deals"), include the
salient items in the text, or expect the agent to re-call a more specific tool.

### 4d. Author the agent instructions

`instruction.txt` (referenced by `declarativeAgent.json`) steers tool selection,
grounding, NL→filter mapping, cross-tool workflows ("if asked to draft an email,
use the deal/rep data"), tone, and boundaries. Keep the mapping tables here in
sync with the enums in your tool descriptions.

### 4e. Conversation starters & prompts

Seed discovery with `conversation_starters` (`declarativeAgent.json`) and
optional MCP `prompts` (`PROMPT_SPECS` in `tools.py`) that pre-write good tool
calls.

**Deliverable:** the tool catalog with final names/descriptions/schemas, the text
template per tool, `instruction.txt`, and conversation starters.

---

## Phase 5 — Design the interaction model (the critical decisions)

Every affordance in the widget must be classified into **one** of the channels
below. This is where "intelligent" is won or lost — and it's entirely the
developer's responsibility (the SDK gives primitives; the spec defines
semantics; *you* choose per interaction). In this repo the choices live in
`McpBridge.tsx` + `App.tsx`.

### The interaction decision matrix

| # | Channel | SDK / bridge call | Enters model context? | Triggers a model turn? | Use for |
| :- | :-- | :-- | :-- | :-- | :-- |
| 1 | **Silent server fetch** | `app.callServerTool` → bridge `callTool` (in `App.tsx` `navigate`) | No | No | Drill-downs, filter changes, refresh — pure UI navigation |
| 2 | **User message** | `app.sendMessage` → bridge `sendPrompt` (used by `PromptChip`) | Yes (as a turn) | **Yes** | "Try asking" chips, predefined actions that should produce a spoken answer |
| 3 | **Model context update** | `app.updateModelContext` | Yes (ambient, future turns) | No | Push current UI state (selection/filters) so *later* questions are understood |
| 4 | **Logging** | `app.sendLog` | No | No | Telemetry/debug only |
| 5 | **Data-only tool** | tool with `ui: false` | Yes (via `content`) | (model already in a turn) | Quick facts with no widget |

**Rules of thumb**

- **Navigation ≠ conversation.** Clicking a deal to *look* at it should be a
  **silent `callServerTool`** (channel 1). It updates the pixels, not the
  transcript. This repo enforces that with the **`callDepth` guard** in
  `McpBridge`: results from widget-initiated calls are returned to the caller
  (`navigate` → `setOverride`) and do **not** replace the root view or enter the
  turn flow; only host/model-initiated results (`callDepth === 0`) do.
- **Ask ≠ navigate.** A chip like *"Which of these are at risk?"* should be a
  **`sendMessage`** (channel 2) — it needs the LLM to reason and answer, so it
  belongs in the conversation.
- **Awareness without a turn** → channel 3 (see Phase 6).
- **Tool `visibility`** (`_meta.ui.visibility: ["model","app"]`) lets you expose a
  tool to the widget only (`"app"`) and hide it from the model's tool list —
  perfect for pure-UI operations (refresh, paginate) you never want the model to
  call.

**Deliverable:** a table listing *every* clickable/interactive element in every
view and its channel (1–5), plus any consent requirements.

---

## Phase 6 — Context-aware operations

This is the subtle part: the user selects/filters something in the UI, then asks
a question **assuming the agent can see what they see**. Because
**`structuredContent` is not model-visible** (our assumption), the agent does
*not* automatically know the widget's current state. You must design the bridge
deliberately.

### The problem, concretely

1. User opens the dashboard (model called `show_sales_dashboard`; the model saw
   only the text `content`).
2. User clicks a deal → `navigate` fires a **silent** `callServerTool`
   (channel 1). The model is **not** told.
3. User types "draft a follow-up email for this deal." The model has no idea
   which deal is on screen.

### Three design options (pick per interaction)

- **A. Carry context in the message (simplest, always works).** When a UI action
  should lead to a model answer, use **`sendMessage`** (channel 2) with the
  context embedded in the text. E.g. a "Draft email" button on the deal card
  sends: *"Draft a follow-up email for deal D-1041 (Fabrikam – Premium Support,
  Negotiation, $450k, owner Sofia Rossi)."* The model now has everything in
  `content`-equivalent text. **This repo already does this**: the `DealDetail` and
  `RepDetail` "Ask the agent" chips interpolate the on-screen entity into the
  prompt (see `PromptChip` usage in `views/DealDetail.tsx`).
- **B. Push ambient state with `updateModelContext` (channel 3).** On every
  view/filter change, send a **text** summary of current UI state
  ("User is viewing deal D-1041…; filter: stage=Negotiation"). The host makes it
  available on the *next* user turn without triggering a response; each call
  overwrites the previous. Use **text `content`** (not `structuredContent`) so it's
  actually model-visible under our assumption. **This repo implements this**:
  `McpBridge.updateModelContext` wraps `app.updateModelContext` (guarded with
  feature-detection + try/catch so it degrades to a no-op on hosts that don't
  support it), and `App.tsx` derives a summary via `describeState(data)` and
  pushes it from an effect on *every* view change — whether the change came from a
  host/model tool call or a silent widget-initiated drill-down.
- **C. Re-fetch on demand.** For "predefined action" buttons, fire a
  `sendMessage` whose text names the action + entity; the model then calls the
  right tool (whose `content` grounds the answer). Good when the action maps
  cleanly to an existing tool.

### Recommended default

Combine **A for actions** (deterministic, no dependence on host context handling)
with **B for passive awareness** (so free-typed follow-ups work). Avoid relying on
the host to leak `structuredContent` — it's host-specific and, per our assumption,
not to be counted on. This repo uses exactly that combination.

**Worked flow (as implemented):**

| User action | Channel | What the model sees |
| :-- | :-- | :-- |
| "Show the dashboard" | model tool call | dashboard `content` text |
| Clicks deal D-1041 | 1 (silent) + 3 (state push) | ambient: "viewing D-1041 …" |
| "Draft a follow-up email" | (next turn) | ambient state → picks D-1041, re-calls `show_deal_details` for full grounding |
| Clicks "Draft email" button | 2 (message w/ context) | full deal context in the message text |

**Deliverable:** for each context-dependent interaction, the chosen option (A/B/C)
and the exact text you'll inject.

---

## Phase 7 — Authentication & security

The demo uses **anonymous** auth (`ai-plugin.json` → `"auth": {"type": "None"}`,
CORS `*` in `settings.py`) — fine for local/demo, **not** for production.

Design these before go-live:

1. **User identity → Copilot → MCP.** Configure auth in `ai-plugin.json`'s runtime
   `auth` block. Options (see [`GUIDE.md`](GUIDE.md) → *Authentication for
   production*):
   - **Microsoft Entra SSO** — flows the signed-in user's identity to the MCP
     server; best for internal enterprise data and per-user row-level security.
   - **OAuth 2.1 authorization-code** — ISV-owned credentials; the server brokers
     access to the backend.
2. **Warehouse credentials.** The MCP server authenticates to the warehouse with a
   service principal / managed identity — **never** embed secrets in code or the
   package. Use Key Vault / managed identity (the container already runs on Azure
   Container Apps; see `Dockerfile`).
3. **Per-user data scoping (authorization).** If a rep should only see their
   territory, enforce it **server-side** using the caller's identity — filter in
   the warehouse query, not in the widget. The widget is untrusted.
4. **Lock down CORS** to the Copilot origins in production (`SALES_MCP_CORS_ORIGINS`).
5. **PII & compliance.** Decide what leaves the warehouse. Remember only `content`
   reaches the model/transcript — keep sensitive fields out of `content` unless
   the user is authorized and the data classification allows it.
6. **Read-only vs write.** This agent is read-only (`readOnlyHint`,
   `taskSupport: forbidden`). If you add write actions (update a deal), treat them
   as channel-2 interactions with explicit user confirmation and server-side
   authorization.

**Deliverable:** an auth design (identity flow diagram), a secrets plan, and a
data-scoping/authorization rule per persona.

---

## Phase 8 — Package, deploy, and operate

1. **Declarative agent package.** `manifest.json` + `declarativeAgent.json` +
   `ai-plugin.json` + `instruction.txt` + icons, zipped by the Agents Toolkit
   (`m365agents.yml`). Keep tool descriptions in `ai-plugin.json` in sync with the
   server (`scripts/gen_ai_plugin.py`).
2. **Host the server over HTTPS.** Container image (`Dockerfile`) → Azure Container
   Apps (or any HTTPS host). The built widget ships inside the image and is served
   as the `ui://` resource.
3. **Provision / sideload.** `atk provision` (automated) or manual upload — see
   [`GUIDE.md`](GUIDE.md) → *Sideload*.
4. **Observability (learned the hard way).** Add request logging/metrics to the
   `/mcp` endpoint. A real incident in this project looked like a server outage but
   was actually a **stale agent-side MCP registration** — traffic simply stopped
   reaching a healthy server. Watching POST `/mcp` volume in Log Analytics is how
   you tell "server down" from "nobody's calling us." Instrument for that
   distinction from day one.
5. **Sizing & resilience.** Cache warehouse aggregates; set sensible replica
   min/max; health probes.

**Deliverable:** a deploy runbook + a dashboard/alert on `/mcp` request volume,
error rate, and latency.

---

## Phase 9 — Validate & iterate

- **End-to-end MCP test** (`scripts/smoke_test.py`): handshake → `tools/list` →
  `tools/call` → read the widget resource. Run it in CI.
- **Tool-selection evals.** Maintain a list of representative utterances and the
  tool+args they *should* produce; check the model picks correctly. Tighten tool
  descriptions / `instruction.txt` when it doesn't.
- **Grounding checks.** Confirm the agent only quotes figures present in `content`.
  If it invents per-item detail, that data isn't in `content` — add it or route to
  a more specific tool.
- **Interaction review.** Re-walk the Phase-5 matrix in the live host: does each
  click do the right thing (navigate silently vs converse)? Does a UI selection
  followed by a free-typed question work (Phase 6)?

**Deliverable:** a living eval set + the smoke test wired into CI.

---

## Cross-cutting checklist

- [ ] Every spoken number traces to one metric-catalog definition (Phase 1).
- [ ] Every figure the agent may quote is in the text `content` (Phase 4c).
- [ ] Every `structuredContent` has a `view` discriminator (Phase 2b).
- [ ] Every UI tool links to the widget via `_meta.ui.resourceUri` (Phase 4a).
- [ ] Every interactive element is classified in the interaction matrix (Phase 5).
- [ ] Context-dependent actions carry their context (message text or
      `updateModelContext`) — not via `structuredContent` (Phase 6).
- [ ] Production auth + per-user data scoping enforced **server-side** (Phase 7).
- [ ] Warehouse secrets via managed identity / Key Vault; CORS locked down (Phase 7).
- [ ] `/mcp` request-volume + error monitoring in place (Phase 8).
- [ ] Tool-selection + grounding evals green in CI (Phase 9).

---

## References

- [`GUIDE.md`](GUIDE.md) — step-by-step build & deploy of this project (server,
  widget, package, tunnel, sideload, production auth, publishing, troubleshooting).
- MCP Apps specification (extension `io.modelcontextprotocol/ui`) — tool/UI
  linkage, `tools/call`, `ui/message`, `ui/update-model-context`, tool
  `visibility`, data-passing best practices.
- [MCP Apps in Copilot](https://learn.microsoft.com/microsoft-365/copilot/extensibility/plugin-mcp-apps)
- [Plugins for M365 Copilot](https://learn.microsoft.com/microsoft-365/copilot/extensibility/overview-plugins?tabs=mcp)
- [Interactive UI samples](https://github.com/microsoft/mcp-interactiveUI-samples)
