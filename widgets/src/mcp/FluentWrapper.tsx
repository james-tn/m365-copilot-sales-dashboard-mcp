import React from "react";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
} from "@fluentui/react-components";
import { useBridge } from "./McpBridge";

export function FluentWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useBridge();
  return (
    <FluentProvider
      theme={theme === "dark" ? webDarkTheme : webLightTheme}
      style={{ background: "transparent" }}
    >
      {children}
    </FluentProvider>
  );
}
