import React from "react";
import { tokens, Text } from "@fluentui/react-components";
import type { Deal } from "../types";
import { money, dateShort } from "../format";
import { RepAvatar, StagePill, tint } from "./ui";
import { stageColor } from "../theme";

export function DealRow({
  deal,
  onOpen,
  rank,
}: {
  deal: Deal;
  onOpen: () => void;
  rank?: number;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: hover ? tokens.colorNeutralBackground1Hover : "transparent",
      }}
    >
      {rank !== undefined && (
        <div
          style={{
            width: 22,
            textAlign: "center",
            fontWeight: 700,
            color: tokens.colorNeutralForeground3,
            flexShrink: 0,
          }}
        >
          {rank}
        </div>
      )}
      <RepAvatar name={deal.rep_name} color={deal.rep_color} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: tokens.colorNeutralForeground1,
          }}
        >
          {deal.name}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 3,
          }}
        >
          <StagePill stage={deal.stage} />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {deal.rep_name}
          </Text>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: stageColor(deal.stage),
              background: tint(stageColor(deal.stage), "18"),
              padding: "1px 6px",
              borderRadius: 999,
            }}
          >
            {deal.probability}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, color: tokens.colorNeutralForeground1 }}>
          {money(deal.amount)}
        </div>
        <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
          {dateShort(deal.close_date)}
        </Text>
      </div>
    </div>
  );
}
