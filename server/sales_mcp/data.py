"""In-memory demo sales dataset.

This stands in for a real CRM / data warehouse. The data is generated once at
import time with a fixed seed so the dashboard, KPIs and leaderboard are stable
across requests and restarts.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

# ── Reference data ──────────────────────────────────────────────────────────

REGIONS = ["AMER", "EMEA", "APAC", "LATAM"]

OPEN_STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation"]
CLOSED_STAGES = ["Closed Won", "Closed Lost"]
ALL_STAGES = OPEN_STAGES + CLOSED_STAGES

# Likelihood a deal in each stage eventually closes (used for weighted pipeline).
STAGE_PROBABILITY = {
    "Prospecting": 10,
    "Qualification": 30,
    "Proposal": 60,
    "Negotiation": 80,
    "Closed Won": 100,
    "Closed Lost": 0,
}

PRODUCTS = [
    "Platform License",
    "Premium Support",
    "Analytics Add-on",
    "Security Suite",
    "Data Pipeline",
    "AI Copilot Seats",
    "Professional Services",
    "Training Package",
]

ACCOUNTS = [
    "Contoso", "Fabrikam", "Northwind Traders", "Adventure Works",
    "Tailspin Toys", "Wingtip Toys", "Proseware", "Litware",
    "Fourth Coffee", "Wide World Importers", "Trey Research", "Margie's Travel",
    "Alpine Ski House", "Coho Vineyard", "Lucerne Publishing", "Graphic Design Institute",
    "City Power & Light", "Blue Yonder Airlines", "Relecloud", "VanArsdel",
]

NEXT_STEPS = [
    "Schedule executive briefing",
    "Send revised proposal",
    "Confirm budget with finance",
    "Technical proof-of-concept review",
    "Legal & security review",
    "Negotiate final pricing",
    "Align on rollout timeline",
    "Awaiting signature",
]

# Sales representatives. Quotas are annual.
REPS = [
    {"id": "r1", "name": "Ava Thompson", "region": "AMER", "role": "Account Executive", "quota": 1_200_000, "color": "#0a66c2"},
    {"id": "r2", "name": "Liam Walsh", "region": "EMEA", "role": "Account Executive", "quota": 1_000_000, "color": "#7c3aed"},
    {"id": "r3", "name": "Sofia Rossi", "region": "EMEA", "role": "Senior Account Executive", "quota": 1_400_000, "color": "#0e7490"},
    {"id": "r4", "name": "Noah Kim", "region": "APAC", "role": "Account Executive", "quota": 900_000, "color": "#b45309"},
    {"id": "r5", "name": "Mia Chen", "region": "APAC", "role": "Senior Account Executive", "quota": 1_300_000, "color": "#059669"},
    {"id": "r6", "name": "Lucas Silva", "region": "LATAM", "role": "Account Executive", "quota": 800_000, "color": "#dc2626"},
    {"id": "r7", "name": "Emma Johnson", "region": "AMER", "role": "Senior Account Executive", "quota": 1_500_000, "color": "#6d28d9"},
    {"id": "r8", "name": "Omar Haddad", "region": "EMEA", "role": "Account Executive", "quota": 1_000_000, "color": "#0284c7"},
]

REP_BY_ID = {r["id"]: r for r in REPS}


def _generate_deals(seed: int = 42, count: int = 64) -> list[dict]:
    rng = random.Random(seed)
    today = datetime.now(timezone.utc).date()
    # Stage mix tuned for a believable ~60% win rate, healthy open pipeline and
    # year-to-date quota attainment in the ~45-65% range.
    stage_pool = (
        ["Prospecting"] * 7
        + ["Qualification"] * 8
        + ["Proposal"] * 7
        + ["Negotiation"] * 6
        + ["Closed Won"] * 16
        + ["Closed Lost"] * 9
    )
    deals: list[dict] = []
    for i in range(1, count + 1):
        rep = rng.choice(REPS)
        account = rng.choice(ACCOUNTS)
        product = rng.choice(PRODUCTS)
        amount = rng.randrange(15, 451) * 1000
        stage = rng.choice(stage_pool)
        if stage in OPEN_STAGES:
            created = today - timedelta(days=rng.randint(15, 200))
            close = today + timedelta(days=rng.randint(7, 120))
            next_step = rng.choice(NEXT_STEPS)
        else:
            close = today - timedelta(days=rng.randint(5, 160))
            created = close - timedelta(days=rng.randint(30, 150))
            next_step = "Closed"
        deals.append(
            {
                "id": f"D-{1000 + i}",
                "name": f"{account} \u2013 {product}",
                "account": account,
                "product": product,
                "amount": amount,
                "stage": stage,
                "probability": STAGE_PROBABILITY[stage],
                "rep_id": rep["id"],
                "region": rep["region"],
                "close_date": close.isoformat(),
                "created_date": created.isoformat(),
                "next_step": next_step,
            }
        )
    return deals


DEALS = _generate_deals()
