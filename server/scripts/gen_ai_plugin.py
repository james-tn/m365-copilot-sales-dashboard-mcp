"""Generate appPackage/ai-plugin.json from the running MCP server.

Introspects the live server's tools (names, descriptions, input schemas and the
`_meta.ui.resourceUri` widget links) and writes the Microsoft 365 Copilot plugin
manifest with a RemoteMCPServer runtime. The server URL is left as the
``${{MCP_ENDPOINT_URL}}`` token so the Agents Toolkit substitutes the real (dev
tunnel) URL at provision time.

Usage (with the server running on http://localhost:3978/mcp):

    uv run python scripts/gen_ai_plugin.py
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

URL = "http://localhost:3978/mcp"
REPO_ROOT = Path(__file__).resolve().parents[2]
OUT = REPO_ROOT / "appPackage" / "ai-plugin.json"

NAME = "Sales Dashboard${{APP_NAME_SUFFIX}}"
DESCRIPTION = (
    "Interactive sales analytics for Microsoft 365 Copilot: pipeline KPIs, deal "
    "and rep drill-downs, and a rich dashboard rendered inline in chat."
)
NAMESPACE = "salesdashboard"


def _tool_meta(tool) -> dict | None:
    meta = getattr(tool, "meta", None) or getattr(tool, "_meta", None)
    return meta if isinstance(meta, dict) else None


async def main() -> None:
    async with streamablehttp_client(URL) as (read, write, *_):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = (await session.list_tools()).tools

    functions = []
    tool_descriptors = []
    run_for = []
    for t in tools:
        functions.append({"name": t.name, "description": t.description})
        run_for.append(t.name)

        descriptor: dict = {
            "name": t.name,
            "description": t.description,
            "inputSchema": t.inputSchema,
            "annotations": {"readOnlyHint": True},
            "execution": {"taskSupport": "forbidden"},
        }
        meta = _tool_meta(t)
        ui = (meta or {}).get("ui") if meta else None
        if isinstance(ui, dict) and ui.get("resourceUri"):
            descriptor["_meta"] = {
                "ui": {"resourceUri": ui["resourceUri"]},
                "ui/resourceUri": ui["resourceUri"],
            }
        tool_descriptors.append(descriptor)

    manifest = {
        "$schema": "https://developer.microsoft.com/json-schemas/copilot/plugin/v2.4/schema.json",
        "schema_version": "v2.4",
        "name_for_human": NAME,
        "description_for_human": DESCRIPTION,
        "namespace": NAMESPACE,
        "functions": functions,
        "runtimes": [
            {
                "type": "RemoteMCPServer",
                "spec": {
                    "url": "${{MCP_ENDPOINT_URL}}",
                    "x-mcp_tool_description": {"tools": tool_descriptors},
                },
                "run_for_functions": run_for,
                "auth": {"type": "None"},
            }
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(manifest, indent=4) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(functions)} functions)")


if __name__ == "__main__":
    asyncio.run(main())
