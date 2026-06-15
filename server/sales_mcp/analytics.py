"""Analytics / aggregation layer over the demo dataset.

Each public function returns plain ``dict`` / ``list`` structures that are sent
straight back to the widget as ``structuredContent`` and used by Copilot to
ground its natural-language answers.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from .data import (
    ALL_STAGES,
    DEALS,
    OPEN_STAGES,
    REGIONS,
    REP_BY_ID,
    REPS,
)


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _period_bounds(period: str) -> tuple[str, date | None, date | None]:
    """Resolve a period label into an inclusive (label, start, end) window.

    ``None`` bounds mean "no limit". Used to scope closed-won / closed-lost
    figures; open pipeline is always current.
    """
    today = _today()
    p = (period or "").strip().lower().replace(" ", "_")
    q = (today.month - 1) // 3
    q_start = date(today.year, q * 3 + 1, 1)
    next_q_start = date(today.year + 1, 1, 1) if q == 3 else date(today.year, q * 3 + 4, 1)
    q_end = next_q_start - timedelta(days=1)

    if p in ("this_quarter", "quarter", "qtd", "current_quarter"):
        return ("This quarter", q_start, q_end)
    if p == "last_quarter":
        lq_end = q_start - timedelta(days=1)
        lq_start = date(lq_end.year, ((lq_end.month - 1) // 3) * 3 + 1, 1)
        return ("Last quarter", lq_start, lq_end)
    if p in ("all", "all_time", "alltime", "lifetime"):
        return ("All time", None, None)
    # Default: year to date.
    return ("This year", date(today.year, 1, 1), date(today.year, 12, 31))


def _in_period(deal: dict, start: date | None, end: date | None) -> bool:
    if start is None and end is None:
        return True
    cd = date.fromisoformat(deal["close_date"])
    if start and cd < start:
        return False
    if end and cd > end:
        return False
    return True


def _enrich(deal: dict) -> dict:
    rep = REP_BY_ID.get(deal["rep_id"], {})
    return {
        **deal,
        "rep_name": rep.get("name", "Unassigned"),
        "rep_color": rep.get("color", "#666666"),
    }


def _safe_div(num: float, den: float) -> float:
    return (num / den) if den else 0.0


# ── Dashboard ───────────────────────────────────────────────────────────────

def compute_dashboard(period: str = "", region: str = "") -> dict:
    label, start, end = _period_bounds(period)
    region = (region or "").strip().upper()

    reps = [r for r in REPS if not region or r["region"] == region]
    deals = [d for d in DEALS if not region or d["region"] == region]

    open_deals = [d for d in deals if d["stage"] in OPEN_STAGES]
    won = [d for d in deals if d["stage"] == "Closed Won" and _in_period(d, start, end)]
    lost = [d for d in deals if d["stage"] == "Closed Lost" and _in_period(d, start, end)]

    open_pipeline = sum(d["amount"] for d in open_deals)
    weighted = sum(d["amount"] * d["probability"] / 100 for d in open_deals)
    closed_won = sum(d["amount"] for d in won)
    closed_lost = sum(d["amount"] for d in lost)
    total_quota = sum(r["quota"] for r in reps)

    kpis = {
        "open_pipeline": round(open_pipeline),
        "weighted_pipeline": round(weighted),
        "closed_won": round(closed_won),
        "closed_lost": round(closed_lost),
        "win_rate": round(_safe_div(len(won), len(won) + len(lost)), 4),
        "avg_deal_size": round(_safe_div(closed_won, len(won))),
        "total_quota": total_quota,
        "quota_attainment": round(_safe_div(closed_won, total_quota), 4),
        "open_deal_count": len(open_deals),
        "won_count": len(won),
        "lost_count": len(lost),
        "total_deal_count": len(deals),
    }

    pipeline_by_stage = []
    for s in OPEN_STAGES:
        sd = [d for d in open_deals if d["stage"] == s]
        pipeline_by_stage.append(
            {"stage": s, "count": len(sd), "amount": round(sum(d["amount"] for d in sd))}
        )

    top_deals = [
        _enrich(d) for d in sorted(open_deals, key=lambda d: d["amount"], reverse=True)[:6]
    ]

    rep_leaderboard = []
    for r in reps:
        r_won = sum(d["amount"] for d in won if d["rep_id"] == r["id"])
        r_open = sum(d["amount"] for d in open_deals if d["rep_id"] == r["id"])
        r_open_count = sum(1 for d in open_deals if d["rep_id"] == r["id"])
        rep_leaderboard.append(
            {
                "id": r["id"],
                "name": r["name"],
                "region": r["region"],
                "role": r["role"],
                "color": r["color"],
                "quota": r["quota"],
                "closed_won": round(r_won),
                "open_pipeline": round(r_open),
                "open_deal_count": r_open_count,
                "quota_attainment": round(_safe_div(r_won, r["quota"]), 4),
            }
        )
    rep_leaderboard.sort(key=lambda x: x["closed_won"], reverse=True)

    region_breakdown = []
    for rg in ([region] if region else REGIONS):
        rg_deals = [d for d in DEALS if d["region"] == rg]
        rg_open = [d for d in rg_deals if d["stage"] in OPEN_STAGES]
        rg_won = [d for d in rg_deals if d["stage"] == "Closed Won" and _in_period(d, start, end)]
        rg_lost = [d for d in rg_deals if d["stage"] == "Closed Lost" and _in_period(d, start, end)]
        region_breakdown.append(
            {
                "region": rg,
                "closed_won": round(sum(d["amount"] for d in rg_won)),
                "open_pipeline": round(sum(d["amount"] for d in rg_open)),
                "open_deal_count": len(rg_open),
                "win_rate": round(_safe_div(len(rg_won), len(rg_won) + len(rg_lost)), 4),
            }
        )

    return {
        "kpis": kpis,
        "pipeline_by_stage": pipeline_by_stage,
        "top_deals": top_deals,
        "rep_leaderboard": rep_leaderboard,
        "region_breakdown": region_breakdown,
        "filters": {
            "period": (period or "this_year"),
            "period_label": label,
            "region": region,
        },
    }


# ── Drill-downs ─────────────────────────────────────────────────────────────

def get_deal(deal_id: str) -> dict | None:
    q = (deal_id or "").strip().lower()
    if not q:
        return None
    match = next((d for d in DEALS if d["id"].lower() == q), None)
    if not match:
        match = next(
            (d for d in DEALS if q in d["id"].lower() or q in d["name"].lower()), None
        )
    if not match:
        return None
    rep = REP_BY_ID.get(match["rep_id"], {})
    related = [
        _enrich(d)
        for d in DEALS
        if d["account"] == match["account"] and d["id"] != match["id"]
    ]
    related.sort(key=lambda d: d["amount"], reverse=True)
    return {"deal": _enrich(match), "rep": rep, "related_deals": related[:6]}


def get_rep(rep: str) -> dict | None:
    q = (rep or "").strip().lower()
    if not q:
        return None
    match = next((r for r in REPS if r["id"].lower() == q or r["name"].lower() == q), None)
    if not match:
        match = next((r for r in REPS if q in r["name"].lower() or q in r["id"].lower()), None)
    if not match:
        return None

    _, start, end = _period_bounds("this_year")
    deals = [d for d in DEALS if d["rep_id"] == match["id"]]
    open_deals = [d for d in deals if d["stage"] in OPEN_STAGES]
    won = [d for d in deals if d["stage"] == "Closed Won" and _in_period(d, start, end)]
    lost = [d for d in deals if d["stage"] == "Closed Lost" and _in_period(d, start, end)]
    closed_won = sum(d["amount"] for d in won)

    kpis = {
        "closed_won": round(closed_won),
        "open_pipeline": round(sum(d["amount"] for d in open_deals)),
        "weighted_pipeline": round(sum(d["amount"] * d["probability"] / 100 for d in open_deals)),
        "quota": match["quota"],
        "quota_attainment": round(_safe_div(closed_won, match["quota"]), 4),
        "win_rate": round(_safe_div(len(won), len(won) + len(lost)), 4),
        "open_deal_count": len(open_deals),
        "won_count": len(won),
        "lost_count": len(lost),
    }
    enriched = [_enrich(d) for d in sorted(deals, key=lambda d: d["amount"], reverse=True)]
    return {"rep": match, "kpis": kpis, "deals": enriched}


def filter_deals(
    stage: str = "",
    region: str = "",
    rep: str = "",
    min_amount: str = "",
    search: str = "",
) -> list[dict]:
    region = (region or "").strip().upper()
    stage_q = (stage or "").strip().lower()
    rep_q = (rep or "").strip().lower()
    search_q = (search or "").strip().lower()
    try:
        min_amt = float(str(min_amount).strip()) if str(min_amount).strip() else 0.0
    except ValueError:
        min_amt = 0.0

    out: list[dict] = []
    for d in DEALS:
        if region and d["region"] != region:
            continue
        if stage_q and stage_q not in d["stage"].lower():
            continue
        if d["amount"] < min_amt:
            continue
        rep_name = REP_BY_ID.get(d["rep_id"], {}).get("name", "").lower()
        if rep_q and rep_q not in rep_name and rep_q not in d["rep_id"].lower():
            continue
        if search_q and not any(
            search_q in d[field].lower() for field in ("name", "account", "product")
        ):
            continue
        out.append(_enrich(d))
    out.sort(key=lambda d: d["amount"], reverse=True)
    return out[:40]


def all_stage_names() -> list[str]:
    return list(ALL_STAGES)
