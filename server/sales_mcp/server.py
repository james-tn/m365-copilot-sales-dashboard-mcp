"""MCP Apps server bootstrap.

Exposes a single UI resource (the sales dashboard widget) plus a set of tools
that return ``structuredContent`` the widget renders. Tools are linked to the
widget through ``_meta.ui.resourceUri`` (the MCP Apps convention), so when
Copilot calls a tool it renders the widget inline and hands it the data.

Run locally::

    uv run python -m sales_mcp          # http://localhost:3978/mcp
"""

from __future__ import annotations

from pathlib import Path

import uvicorn
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from starlette.middleware.cors import CORSMiddleware

from .settings import get_settings
from .tools import PROMPT_SPECS, TOOL_SPECS

# Stable URI for the single dashboard widget. Every UI tool points here.
WIDGET_URI = "ui://sales-dashboard/app.html"

_WEB_DIR = Path(__file__).parent / "web"


def _load_widget_html() -> str:
    """Read the built widget HTML fresh on each request (picks up rebuilds)."""
    path = _WEB_DIR / "widget.html"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return (
        "<!doctype html><html><body style=\"font-family:sans-serif;padding:24px\">"
        "<h3>Sales dashboard widget not built yet</h3>"
        "<p>Run <code>npm install &amp;&amp; npm run build</code> in the "
        "<code>widgets/</code> folder, then restart this server.</p>"
        "</body></html>"
    )


settings = get_settings()

mcp = FastMCP(
    "sales-dashboard",
    host=settings.host,
    port=settings.port,
    # Behind a dev tunnel / proxy the Host header is the public FQDN, which the
    # default DNS-rebinding guard rejects (HTTP 421). Disable it for the tunnel
    # scenario used by the Microsoft 365 Agents Toolkit.
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


@mcp.resource(WIDGET_URI, mime_type="text/html;profile=mcp-app")
async def sales_dashboard_widget() -> str:
    return _load_widget_html()


# Register every tool. UI tools carry the MCP Apps `_meta.ui.resourceUri` link.
for _spec in TOOL_SPECS:
    _kwargs: dict = {"name": _spec["name"], "description": _spec["description"]}
    if _spec.get("ui", True):
        _kwargs["meta"] = {"ui": {"resourceUri": WIDGET_URI}}
    mcp.tool(**_kwargs)(_spec["handler"])

for _spec in PROMPT_SPECS:
    mcp.prompt(name=_spec["name"], description=_spec["description"])(_spec["handler"])


def build_app():
    """Build the Starlette/Streamable-HTTP ASGI app with CORS."""
    app = mcp.streamable_http_app()
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()] or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "mcp-session-id",
            "mcp-protocol-version",
        ],
        expose_headers=["mcp-session-id"],
    )
    return app


def main() -> None:
    app = build_app()
    print(
        f"\n  Sales Dashboard MCP server\n"
        f"  Transport : Streamable HTTP\n"
        f"  Endpoint  : http://{settings.host}:{settings.port}/mcp\n"
        f"  Tools     : {', '.join(s['name'] for s in TOOL_SPECS)}\n"
    )
    uvicorn.run(app, host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
