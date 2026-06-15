"""MCP tool + prompt handlers.

Every tool returns a :class:`mcp.types.CallToolResult` carrying:

* ``content``           – a short text summary Copilot can read aloud.
* ``structuredContent`` – the data payload the dashboard widget renders. Each
  payload includes a ``view`` discriminator (``dashboard`` | ``deal`` | ``rep``
  | ``deals`` | ``summary`` | ``error``) so the single widget can route.

The ``TOOL_SPECS`` / ``PROMPT_SPECS`` registries are consumed by ``server.py``.
"""

from __future__ import annotations

from typing import Any

from mcp import types
from mcp.types import PromptMessage, TextContent

from . import analytics


def _result(text: str, structured: dict[str, Any]) -> types.CallToolResult:
    return types.CallToolResult(
        content=[types.TextContent(type="text", text=text)],
        structuredContent=structured,
    )


def _money(value: float) -> str:
    return f"${value:,.0f}"


# ── Tool handlers ───────────────────────────────────────────────────────────

async def show_sales_dashboard(period: str = "", region: str = "") -> types.CallToolResult:
    """Render the full sales dashboard widget and summarise headline numbers."""
    data = analytics.compute_dashboard(period=period, region=region)
    k = data["kpis"]
    scope = data["filters"]["period_label"] + (f" \u00b7 {data['filters']['region']}" if data["filters"]["region"] else "")
    text = (
        f"Sales dashboard ({scope}): open pipeline {_money(k['open_pipeline'])} across "
        f"{k['open_deal_count']} deals; closed-won {_money(k['closed_won'])} "
        f"({k['quota_attainment'] * 100:.0f}% of {_money(k['total_quota'])} quota); "
        f"win rate {k['win_rate'] * 100:.0f}%."
    )
    return _result(text, {"view": "dashboard", **data})


async def list_deals(
    stage: str = "",
    region: str = "",
    rep: str = "",
    min_amount: str = "",
    search: str = "",
) -> types.CallToolResult:
    """Show a filtered list of deals in the widget."""
    deals = analytics.filter_deals(
        stage=stage, region=region, rep=rep, min_amount=min_amount, search=search
    )
    text = (
        f"{len(deals)} deal(s) match your filters."
        if deals
        else "No deals match your filters."
    )
    return _result(
        text,
        {
            "view": "deals",
            "total": len(deals),
            "deals": deals,
            "filters": {
                "stage": stage,
                "region": (region or "").upper(),
                "rep": rep,
                "min_amount": min_amount,
                "search": search,
            },
        },
    )


async def show_deal_details(deal_id: str) -> types.CallToolResult:
    """Drill into a single deal: amount, stage, owner, next step and sibling deals."""
    detail = analytics.get_deal(deal_id)
    if not detail:
        msg = f"No deal found matching '{deal_id}'."
        return _result(msg, {"view": "error", "message": msg})
    d = detail["deal"]
    text = (
        f"{d['name']} ({d['id']}): {_money(d['amount'])}, {d['stage']} "
        f"({d['probability']}% to close), owned by {d['rep_name']} in {d['region']}, "
        f"target close {d['close_date']}. Next step: {d['next_step']}."
    )
    return _result(text, {"view": "deal", **detail})


async def show_rep_details(rep: str) -> types.CallToolResult:
    """Drill into a single sales rep: quota attainment, pipeline and their deals."""
    detail = analytics.get_rep(rep)
    if not detail:
        msg = f"No sales rep found matching '{rep}'."
        return _result(msg, {"view": "error", "message": msg})
    r = detail["rep"]
    k = detail["kpis"]
    text = (
        f"{r['name']} \u2013 {r['role']}, {r['region']}: closed-won {_money(k['closed_won'])} "
        f"({k['quota_attainment'] * 100:.0f}% of {_money(k['quota'])} quota), "
        f"{k['open_deal_count']} open deals worth {_money(k['open_pipeline'])}, "
        f"win rate {k['win_rate'] * 100:.0f}%."
    )
    return _result(text, {"view": "rep", **detail})


async def get_sales_summary(period: str = "", region: str = "") -> types.CallToolResult:
    """Return headline metrics as data only (no widget) for quick text answers."""
    data = analytics.compute_dashboard(period=period, region=region)
    k = data["kpis"]
    text = (
        f"{data['filters']['period_label']}"
        + (f" / {data['filters']['region']}" if data["filters"]["region"] else "")
        + f": open pipeline {_money(k['open_pipeline'])} "
        f"(weighted {_money(k['weighted_pipeline'])}), closed-won {_money(k['closed_won'])}, "
        f"win rate {k['win_rate'] * 100:.0f}%, quota attainment {k['quota_attainment'] * 100:.0f}%."
    )
    return _result(
        text,
        {
            "view": "summary",
            "kpis": k,
            "pipeline_by_stage": data["pipeline_by_stage"],
            "region_breakdown": data["region_breakdown"],
            "filters": data["filters"],
        },
    )


# ── Prompt handlers (conversation helpers, surfaced in MCP clients) ──────────

def _prompt(text: str) -> list[PromptMessage]:
    return [PromptMessage(role="user", content=TextContent(type="text", text=text))]


def sales_overview_prompt() -> list[PromptMessage]:
    return _prompt(
        "Show me the sales dashboard with current pipeline, quota attainment and "
        "the rep leaderboard. Call show_sales_dashboard."
    )


def pipeline_by_stage_prompt() -> list[PromptMessage]:
    return _prompt(
        "What does our pipeline look like by stage this quarter? "
        "Call show_sales_dashboard with period 'this_quarter' and highlight where "
        "deals are concentrated."
    )


def top_deals_prompt() -> list[PromptMessage]:
    return _prompt(
        "Show the top open deals and tell me which ones look at risk. "
        "Call list_deals filtered to Negotiation and Proposal stages."
    )


# ── Registries (consumed by server.py) ──────────────────────────────────────

TOOL_SPECS: list[dict] = [
    {
        "name": "show_sales_dashboard",
        "description": (
            "Display the interactive sales dashboard with KPIs (open pipeline, "
            "weighted pipeline, closed-won, win rate, quota attainment), a pipeline "
            "funnel by stage, top open deals, the rep leaderboard and a regional "
            "breakdown. Optional filters: period ('this_quarter', 'this_year', "
            "'last_quarter', 'all') and region ('AMER', 'EMEA', 'APAC', 'LATAM')."
        ),
        "handler": show_sales_dashboard,
        "ui": True,
    },
    {
        "name": "list_deals",
        "description": (
            "Show a filtered list of deals in the dashboard. Optional filters: stage "
            "(e.g. 'Negotiation', 'Closed Won'), region, rep (name or id), min_amount "
            "(numeric), and search (matches deal name, account or product)."
        ),
        "handler": list_deals,
        "ui": True,
    },
    {
        "name": "show_deal_details",
        "description": (
            "Drill into a single deal and render its detail card: amount, stage, "
            "probability, owner, target close date, next step and other deals at the "
            "same account. Provide deal_id (e.g. 'D-1009') or part of the deal name."
        ),
        "handler": show_deal_details,
        "ui": True,
    },
    {
        "name": "show_rep_details",
        "description": (
            "Drill into a single sales representative and render their scorecard: "
            "quota attainment, closed-won, open pipeline, win rate and their deals. "
            "Provide rep as a name (e.g. 'Sofia Rossi') or id (e.g. 'r3')."
        ),
        "handler": show_rep_details,
        "ui": True,
    },
    {
        "name": "get_sales_summary",
        "description": (
            "Return headline sales metrics as data only (no widget) for quick "
            "natural-language answers such as 'what's our win rate?' or 'how much "
            "pipeline is open in EMEA?'. Optional filters: period and region."
        ),
        "handler": get_sales_summary,
        "ui": False,
    },
]

PROMPT_SPECS: list[dict] = [
    {
        "name": "sales-overview",
        "description": "Open the sales dashboard with pipeline, quota and leaderboard.",
        "handler": sales_overview_prompt,
    },
    {
        "name": "pipeline-by-stage",
        "description": "See this quarter's pipeline broken down by stage.",
        "handler": pipeline_by_stage_prompt,
    },
    {
        "name": "top-deals-at-risk",
        "description": "Review the largest late-stage deals that may be at risk.",
        "handler": top_deals_prompt,
    },
]
