import React, { useCallback, useEffect, useState } from "react";
import { ProgressBar, Text } from "@fluentui/react-components";
import { ErrorCircle24Regular } from "@fluentui/react-icons";
import { useBridge } from "./mcp/McpBridge";
import { Loading, Shell, TitleBar, Card, TipBar, PromptChip } from "./components/ui";
import { Dashboard } from "./views/Dashboard";
import { DealsList } from "./views/DealsList";
import { DealDetail } from "./views/DealDetail";
import { RepDetail } from "./views/RepDetail";
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
  const { toolData, callTool, isConnected, isFullscreen } = useBridge();
  const [override, setOverride] = useState<ToolData | null>(null);
  const [busy, setBusy] = useState(false);

  // A fresh result from the host (a new tool call) resets any local drill-down.
  useEffect(() => {
    setOverride(null);
  }, [toolData]);

  const data = override ?? toolData;
  const canBack = !!override;
  const onBack = useCallback(() => setOverride(null), []);

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
