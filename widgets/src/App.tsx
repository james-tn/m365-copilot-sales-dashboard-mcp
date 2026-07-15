import React, { useCallback, useEffect, useState } from "react";
import { ProgressBar, Text } from "@fluentui/react-components";
import { ErrorCircle24Regular } from "@fluentui/react-icons";
import { useBridge } from "./mcp/McpBridge";
import { Loading, Shell, TitleBar, Card, TipBar, PromptChip } from "./components/ui";
import { Dashboard } from "./views/Dashboard";
import { DealsList } from "./views/DealsList";
import { DealDetail } from "./views/DealDetail";
import { RepDetail } from "./views/RepDetail";
import { money } from "./format";
import type { DashboardData, SummaryData, ToolData } from "./types";

function summaryToDashboard(s: SummaryData): DashboardData {
  return {
    view: "dashboard",
    kpis: s.kpis,
    pipeline_by_stage: s.pipeline_by_stage,
    top_deals: [],
    rep_leaderboard: [],
    region_breakdown: s.region_breakdown,
    filters: s.filters,
  };
}

// A concise, text-only summary of what the widget is currently showing. Pushed
// to the host's model context (see McpBridge.updateModelContext) so a free-typed
// follow-up after a silent drill-down (e.g. "draft an email for this deal") is
// grounded in the on-screen entity. Only text is used — structuredContent is not
// model-visible.
function describeState(data: ToolData): string | null {
  switch (data.view) {
    case "dashboard":
    case "summary": {
      const f = data.filters ?? {};
      const scope = [f.period_label || f.period, f.region].filter(Boolean).join(" \u00b7 ");
      return `The user is viewing the sales dashboard overview${scope ? ` (${scope})` : ""}.`;
    }
    case "deals": {
      const f = data.filters ?? {};
      const parts = [
        f.stage && `stage=${f.stage}`,
        f.region && `region=${f.region}`,
        f.rep && `rep=${f.rep}`,
        f.min_amount && `min_amount=${f.min_amount}`,
        f.search && `search="${f.search}"`,
      ].filter(Boolean);
      return (
        `The user is viewing a filtered list of ${data.total} deal(s)` +
        (parts.length ? ` (filters: ${parts.join(", ")}).` : ".")
      );
    }
    case "deal": {
      const d = data.deal;
      return (
        `The user is viewing deal ${d.id} "${d.name}" — ${money(d.amount)}, ${d.stage}, ` +
        `owned by ${d.rep_name} in ${d.region}.`
      );
    }
    case "rep": {
      const r = data.rep;
      return `The user is viewing the scorecard for sales rep ${r.name} (${r.role}, ${r.region}).`;
    }
    default:
      return null;
  }
}

function ErrorView({
  message,
  onBack,
  fullscreen,
}: {
  message: string;
  onBack?: () => void;
  fullscreen?: boolean;
}) {
  return (
    <Shell fullscreen={fullscreen}>
      <TitleBar title="Not found" icon={<ErrorCircle24Regular />} onBack={onBack} />
      <Card>
        <Text>{message}</Text>
      </Card>
      <TipBar>
        <PromptChip label="Show dashboard" prompt="Show the sales dashboard." />
        <PromptChip label="List all deals" prompt="List all open deals." />
      </TipBar>
    </Shell>
  );
}

export function App() {
  const { toolData, callTool, updateModelContext, isConnected, isFullscreen } = useBridge();
  const [override, setOverride] = useState<ToolData | null>(null);
  const [busy, setBusy] = useState(false);

  // A fresh result from the host (a new tool call) resets any local drill-down.
  useEffect(() => {
    setOverride(null);
  }, [toolData]);

  const data = override ?? toolData;
  const canBack = !!override;
  const onBack = useCallback(() => setOverride(null), []);

  // Whenever the visible view changes — whether from a host/model tool call or a
  // silent widget-initiated drill-down — tell the agent what's on screen so the
  // next user question is understood in context.
  useEffect(() => {
    if (!data) return;
    const summary = describeState(data);
    if (summary) updateModelContext(summary);
  }, [data, updateModelContext]);

  const navigate = useCallback(
    (name: string, args?: Record<string, unknown>) => {
      setBusy(true);
      callTool(name, args)
        .then((sc) => {
          if (sc && (sc as ToolData).view) setOverride(sc);
        })
        .catch(() => {
          /* ignore — host will surface tool errors in chat */
        })
        .finally(() => setBusy(false));
    },
    [callTool],
  );

  if (!data) return <Loading connected={isConnected} />;

  const common = {
    navigate,
    onBack: canBack ? onBack : undefined,
    fullscreen: isFullscreen,
  };

  let view: React.ReactNode;
  switch (data.view) {
    case "dashboard":
      view = <Dashboard data={data} {...common} />;
      break;
    case "summary":
      view = <Dashboard data={summaryToDashboard(data)} {...common} />;
      break;
    case "deals":
      view = <DealsList data={data} {...common} />;
      break;
    case "deal":
      view = <DealDetail data={data} {...common} />;
      break;
    case "rep":
      view = <RepDetail data={data} {...common} />;
      break;
    case "error":
      view = (
        <ErrorView
          message={data.message}
          onBack={canBack ? onBack : undefined}
          fullscreen={isFullscreen}
        />
      );
      break;
    default:
      view = <Loading connected={isConnected} />;
  }

  return (
    <>
      {busy && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000 }}>
          <ProgressBar />
        </div>
      )}
      {view}
    </>
  );
}
