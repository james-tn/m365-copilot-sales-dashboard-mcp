import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useApp, type App } from "@modelcontextprotocol/ext-apps/react";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { Theme, ToolData } from "../types";

interface BridgeValue {
  toolData: ToolData | null;
  theme: Theme;
  isConnected: boolean;
  isFullscreen: boolean;
  canExpand: boolean;
  callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolData | null>;
  toggleFullscreen: () => void;
  sendPrompt: (prompt: string) => void;
  updateModelContext: (text: string) => void;
  notifyHeight: () => void;
}

const BridgeContext = createContext<BridgeValue | null>(null);

export function McpBridgeProvider({
  appName,
  children,
}: {
  appName: string;
  children: React.ReactNode;
}) {
  const [toolData, setToolData] = useState<ToolData | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastHeight = useRef(0);
  const callDepth = useRef(0);

  const { app, isConnected } = useApp({
    appInfo: { name: appName, version: "1.0.0" },
    capabilities: {},
    onAppCreated: (created: App) => {
      // Register handlers before connect fires events.
      created.ontoolresult = (result) => {
        // Ignore results from widget-initiated tool calls (those are handled by
        // the caller); only host-delivered results replace the root view.
        if (callDepth.current === 0 && result?.structuredContent) {
          setToolData(result.structuredContent as unknown as ToolData);
        }
      };
      created.onhostcontextchanged = (ctx: McpUiHostContext) => {
        if (ctx?.theme) setTheme(ctx.theme === "dark" ? "dark" : "light");
        if (ctx?.displayMode) setIsFullscreen(ctx.displayMode === "fullscreen");
      };
    },
  });

  // Pick up the initial host context once connected.
  useEffect(() => {
    if (!app || !isConnected) return;
    const ctx = app.getHostContext();
    if (ctx?.theme) setTheme(ctx.theme === "dark" ? "dark" : "light");
    if (ctx?.displayMode) setIsFullscreen(ctx.displayMode === "fullscreen");
  }, [app, isConnected]);

  // OpenAI Apps SDK fallback (ChatGPT-style hosts that inject window.openai).
  useEffect(() => {
    const o = (window as Record<string, any>).openai;
    if (o?.toolOutput)
      setToolData((o.toolOutput.structuredContent ?? o.toolOutput) as unknown as ToolData);
    if (o?.theme) setTheme(o.theme === "dark" ? "dark" : "light");
    const handler = (e: Event) => {
      const g = (e as CustomEvent).detail?.globals;
      if (!g) return;
      if (g.toolOutput)
        setToolData((g.toolOutput.structuredContent ?? g.toolOutput) as unknown as ToolData);
      if (g.theme) setTheme(g.theme === "dark" ? "dark" : "light");
      if (g.displayMode) setIsFullscreen(g.displayMode === "fullscreen");
    };
    window.addEventListener("openai:set_globals", handler);
    return () => window.removeEventListener("openai:set_globals", handler);
  }, []);

  // Dev-only: load mock data so `npm run dev` renders without an MCP host.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const t = setTimeout(() => {
      setToolData((prev) => {
        if (prev) return prev;
        // Lazy import keeps the mock out of the production bundle.
        import("../devMock").then((m) => setToolData(m.devDashboard as ToolData));
        return prev;
      });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const notifyHeight = useCallback(() => {
    const h = document.body.scrollHeight;
    if (h === lastHeight.current) return;
    lastHeight.current = h;
    const a = app as unknown as Record<string, any> | null;
    try {
      a?.sendSizeChanged?.({ width: document.body.scrollWidth, height: h });
    } catch {
      /* not supported */
    }
    try {
      (window as Record<string, any>).openai?.notifyIntrinsicHeight?.({ height: h });
    } catch {
      /* not supported */
    }
  }, [app]);

  const callTool = useCallback(
    async (name: string, args?: Record<string, unknown>): Promise<ToolData | null> => {
      if (app && isConnected) {
        callDepth.current += 1;
        try {
          const result = await app.callServerTool({ name, arguments: args ?? {} });
          const sc = (result as Record<string, any>)?.structuredContent;
          return (sc ?? null) as ToolData | null;
        } finally {
          callDepth.current -= 1;
        }
      }
      const o = (window as Record<string, any>).openai;
      if (o?.callTool) {
        const r = await o.callTool(name, args ?? {});
        return ((r?.structuredContent ?? r) ?? null) as ToolData | null;
      }
      throw new Error("Tool calls are not available in this host.");
    },
    [app, isConnected],
  );

  const toggleFullscreen = useCallback(async () => {
    const next = isFullscreen ? "inline" : "fullscreen";
    try {
      if (app && isConnected) {
        const r = await app.requestDisplayMode({ mode: next });
        setIsFullscreen(r.mode === "fullscreen");
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      const o = (window as Record<string, any>).openai;
      if (o?.requestDisplayMode) {
        await o.requestDisplayMode({ mode: next });
        setIsFullscreen(next === "fullscreen");
        return;
      }
    } catch {
      /* fall through */
    }
    setIsFullscreen((v) => !v); // CSS-only fallback
  }, [app, isConnected, isFullscreen]);

  const sendPrompt = useCallback(
    (prompt: string) => {
      const a = app as unknown as Record<string, any> | null;
      try {
        if (a && isConnected && typeof a.sendMessage === "function") {
          a.sendMessage({ role: "user", content: [{ type: "text", text: prompt }] });
          return;
        }
      } catch {
        /* fall through */
      }
      try {
        (window as Record<string, any>).openai?.sendFollowUpMessage?.({ prompt });
      } catch {
        /* not supported */
      }
    },
    [app, isConnected],
  );

  // Push a text summary of the current UI state into the host's model context so
  // free-typed follow-up questions after a silent drill-down are understood. Per
  // the MCP Apps spec this does NOT trigger a model turn; the host makes it
  // available on the next user message, and each call overwrites the previous.
  // Only `content` (text) is model-visible, so we never send structuredContent.
  const updateModelContext = useCallback(
    (text: string) => {
      if (!text) return;
      const a = app as unknown as Record<string, any> | null;
      try {
        if (a && isConnected && typeof a.updateModelContext === "function") {
          a.updateModelContext({ content: [{ type: "text", text }] })?.catch?.(() => {
            /* host rejected or unsupported — ignore */
          });
        }
      } catch {
        /* not supported in this host — ignore */
      }
    },
    [app, isConnected],
  );

  const canExpand =
    !!(app && typeof (app as Record<string, any>).requestDisplayMode === "function") ||
    !!(window as Record<string, any>).openai?.requestDisplayMode;

  // Report height to the host so the inline iframe sizes to content.
  useEffect(() => {
    if (!toolData) return;
    const t1 = setTimeout(notifyHeight, 80);
    const t2 = setTimeout(notifyHeight, 280);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toolData, notifyHeight]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(notifyHeight, 80);
    });
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [notifyHeight]);

  return (
    <BridgeContext.Provider
      value={{
        toolData,
        theme,
        isConnected,
        isFullscreen,
        canExpand,
        callTool,
        toggleFullscreen,
        sendPrompt,
        updateModelContext,
        notifyHeight,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridge(): BridgeValue {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error("useBridge must be used within McpBridgeProvider");
  return ctx;
}
