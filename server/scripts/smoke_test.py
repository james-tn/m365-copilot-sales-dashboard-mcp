"""End-to-end smoke test: connect to the running MCP server, list tools,
call each tool, and read the widget resource. Run with:

    uv run python scripts/smoke_test.py
"""

from __future__ import annotations

import asyncio
import json

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

URL = "http://localhost:3978/mcp"


def _meta_of(tool) -> dict | None:
    return getattr(tool, "meta", None) or getattr(tool, "_meta", None)


async def main() -> None:
    async with streamablehttp_client(URL) as (read, write, *_):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            print("Connected to:", init.serverInfo.name, init.serverInfo.version)

            tools = (await session.list_tools()).tools
            print(f"\nTools ({len(tools)}):")
            for t in tools:
                meta = _meta_of(t)
                ui = (meta or {}).get("ui") if isinstance(meta, dict) else None
                print(f"  - {t.name:22} ui={ui}")

            resources = (await session.list_resources()).resources
            print(f"\nResources ({len(resources)}):")
            for r in resources:
                print(f"  - {r.uri}  ({r.mimeType})")

            print("\n--- call show_sales_dashboard ---")
            res = await session.call_tool("show_sales_dashboard", {"period": "this_year"})
            print("text:", res.content[0].text)
            print("view:", res.structuredContent["view"])
            print("kpis:", json.dumps(res.structuredContent["kpis"], indent=2))

            print("\n--- call show_rep_details (Sofia) ---")
            res = await session.call_tool("show_rep_details", {"rep": "Sofia"})
            print("text:", res.content[0].text)

            print("\n--- call list_deals (Negotiation) ---")
            res = await session.call_tool("list_deals", {"stage": "Negotiation"})
            print("text:", res.content[0].text, "->", res.structuredContent["total"], "deals")
            first = res.structuredContent["deals"][0]
            print("first deal:", first["id"], first["name"], first["amount"])

            print("\n--- call show_deal_details ---")
            res = await session.call_tool("show_deal_details", {"deal_id": first["id"]})
            print("text:", res.content[0].text)

            print("\n--- read widget resource ---")
            content = await session.read_resource("ui://sales-dashboard/app.html")
            html = content.contents[0].text
            print("widget html bytes:", len(html), "| mime:", content.contents[0].mimeType)

    print("\nSMOKE TEST OK")


if __name__ == "__main__":
    asyncio.run(main())
