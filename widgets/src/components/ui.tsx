import React from "react";
import { tokens, Text, Spinner, Button } from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  FullScreenMaximize20Regular,
  FullScreenMinimize20Regular,
  ChevronRight16Regular,
} from "@fluentui/react-icons";
import { initials } from "../format";
import { stageColor, regionColor, tint } from "../theme";
import { useBridge } from "../mcp/McpBridge";

export const FONT =
  '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif';

export function cardStyle(clickable = false): React.CSSProperties {
  return {
    background: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: 12,
    padding: 16,
    cursor: clickable ? "pointer" : "default",
    transition: "border-color .15s ease, box-shadow .15s ease",
  };
}

export function Card({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...cardStyle(clickable),
        ...(clickable && hover
          ? { borderColor: tokens.colorBrandStroke1, boxShadow: tokens.shadow8 }
          : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Shell({
  children,
  fullscreen,
}: {
  children: React.ReactNode;
  fullscreen?: boolean;
}) {
  return (
    <div
      style={{
        fontFamily: FONT,
        background: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground1,
        minHeight: "100%",
        width: "100%",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxSizing: "border-box",
        ...(fullscreen
          ? { position: "fixed", inset: 0, overflowY: "auto", zIndex: 9999 }
          : {}),
      }}
    >
      {children}
    </div>
  );
}

export function TitleBar({
  title,
  subtitle,
  icon,
  onBack,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
}) {
  const { canExpand, isFullscreen, toggleFullscreen } = useBridge();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {onBack && (
          <Button
            appearance="subtle"
            icon={<ArrowLeft20Regular />}
            onClick={onBack}
            aria-label="Back"
          />
        )}
        {icon && (
          <span style={{ color: tokens.colorBrandForeground1, display: "flex" }}>{icon}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <Text weight="bold" style={{ fontSize: 20, letterSpacing: "-0.3px" }}>
            {title}
          </Text>
          {subtitle && (
            <div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {subtitle}
              </Text>
            </div>
          )}
        </div>
      </div>
      {canExpand && (
        <Button
          appearance="subtle"
          icon={isFullscreen ? <FullScreenMinimize20Regular /> : <FullScreenMaximize20Regular />}
          onClick={toggleFullscreen}
          aria-label="Toggle full screen"
        />
      )}
    </div>
  );
}

export function SectionTitle({
  icon,
  children,
  right,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && (
          <span style={{ color: tokens.colorBrandForeground1, display: "flex" }}>{icon}</span>
        )}
        <Text weight="semibold" style={{ fontSize: 15 }}>
          {children}
        </Text>
      </div>
      {right}
    </div>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        ...cardStyle(),
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: tint(accent, "22"),
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {label}
        </Text>
      </div>
      <Text weight="bold" style={{ fontSize: 24, lineHeight: "26px" }}>
        {value}
      </Text>
      {sub && (
        <div style={{ color: tokens.colorNeutralForeground3, fontSize: 12 }}>{sub}</div>
      )}
    </div>
  );
}

export function Meter({
  value,
  color,
  height = 8,
}: {
  value: number;
  color: string;
  height?: number;
}) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div
      style={{
        background: tokens.colorNeutralBackground4,
        borderRadius: 999,
        height,
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${v * 100}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width .4s ease",
        }}
      />
    </div>
  );
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        color,
        background: tint(color, "22"),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function StagePill({ stage }: { stage: string }) {
  return <Pill text={stage} color={stageColor(stage)} />;
}

export function RegionPill({ region }: { region: string }) {
  return <Pill text={region} color={regionColor(region)} />;
}

export function RepAvatar({
  name,
  color,
  size = 28,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function ViewLink({
  label = "View",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button
      appearance="transparent"
      size="small"
      iconPosition="after"
      icon={<ChevronRight16Regular />}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </Button>
  );
}

export function PromptChip({ label, prompt }: { label: string; prompt: string }) {
  const { sendPrompt } = useBridge();
  return (
    <Button
      appearance="outline"
      size="small"
      shape="circular"
      onClick={() => sendPrompt(prompt)}
    >
      {label}
    </Button>
  );
}

export function TipBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...cardStyle(),
        background: tint(tokens.colorBrandBackground as string, "14"),
        borderColor: tokens.colorBrandStroke2,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

export function HoverRow({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: 8,
        background: onClick && hover ? tokens.colorNeutralBackground1Hover : "transparent",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Loading({ connected }: { connected: boolean }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 56,
        color: tokens.colorNeutralForeground3,
      }}
    >
      <Spinner size="medium" />
      <Text size={200}>
        {connected ? "Loading sales data\u2026" : "Connecting to the sales agent\u2026"}
      </Text>
    </div>
  );
}

export { stageColor, regionColor, tint };
