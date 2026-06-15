import React from "react";
import { createRoot } from "react-dom/client";
import { McpBridgeProvider } from "./mcp/McpBridge";
import { FluentWrapper } from "./mcp/FluentWrapper";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <McpBridgeProvider appName="sales-dashboard">
    <FluentWrapper>
      <App />
    </FluentWrapper>
  </McpBridgeProvider>,
);
