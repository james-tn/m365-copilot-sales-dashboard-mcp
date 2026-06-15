import React from "react";
import { Text, tokens, Button, Divider } from "@fluentui/react-components";
import {
  Briefcase24Regular,
  CalendarLtr20Regular,
  Person20Regular,
  Globe20Regular,
  Flag20Regular,
  ChevronRight16Regular,
} from "@fluentui/react-icons";
import type { DealData } from "../types";
import { money, moneyFull, pct, dateShort } from "../format";
import {
  Shell,
  TitleBar,
  Card,
  SectionTitle,
  Meter,
  StagePill,
  RegionPill,
  RepAvatar,
  HoverRow,
  TipBar,
  PromptChip,
  stageColor,
} from "../components/ui";
import { DealRow } from "../components/rows";

type Nav = (name: string, args?: Record<string, unknown>) => void;

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: tokens.colorNeutralForeground3,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{children}</div>
    </div>
  );
}

export function DealDetail({
  data,
  navigate,
  onBack,
  fullscreen,
}: {
  data: DealData;
  navigate: Nav;
  onBack?: () => void;
  fullscreen?: boolean;
}) {
  const d = data.deal;
  const rep = data.rep;

  return (
    <Shell fullscreen={fullscreen}>
      <TitleBar
        title={d.account}
        subtitle={`${d.product} \u00b7 ${d.id}`}
        icon={<Briefcase24Regular />}
        onBack={onBack}
      />

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text weight="bold" style={{ fontSize: 18 }}>
              {d.name}
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StagePill stage={d.stage} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: stageColor(d.stage),
                }}
              >
                {d.probability}% to close
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>
              {moneyFull(d.amount)}
            </div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              deal value
            </Text>
          </div>
        </div>

        <div style={{ margin: "14px 0 18px" }}>
          <Meter value={d.probability / 100} color={stageColor(d.stage)} height={8} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16,
          }}
        >
          <Fact icon={<CalendarLtr20Regular />} label="Target close">
            {dateShort(d.close_date)}
          </Fact>
          <Fact icon={<CalendarLtr20Regular />} label="Created">
            {dateShort(d.created_date)}
          </Fact>
          <Fact icon={<Globe20Regular />} label="Region">
            <RegionPill region={d.region} />
          </Fact>
          <Fact icon={<Flag20Regular />} label="Next step">
            {d.next_step}
          </Fact>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        <HoverRow
          onClick={() => navigate("show_rep_details", { rep: rep.id })}
          style={{ padding: "8px 6px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RepAvatar name={rep.name} color={rep.color} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{rep.name}</div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {rep.role} {"\u00b7"} owner
              </Text>
            </div>
            <ChevronRight16Regular />
          </div>
        </HoverRow>
      </Card>

      {data.related_deals.length > 0 && (
        <Card style={{ padding: "16px 8px" }}>
          <div style={{ padding: "0 8px" }}>
            <SectionTitle icon={<Briefcase24Regular />}>
              More at {d.account}
            </SectionTitle>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.related_deals.map((rd) => (
              <DealRow
                key={rd.id}
                deal={rd}
                onOpen={() => navigate("show_deal_details", { deal_id: rd.id })}
              />
            ))}
          </div>
        </Card>
      )}

      <TipBar>
        <Text size={200} weight="semibold">
          Ask the agent:
        </Text>
        <PromptChip
          label="Draft follow-up email"
          prompt={`Draft a follow-up email to advance the ${d.name} deal (${d.id}) toward close.`}
        />
        <PromptChip
          label="Risks"
          prompt={`What are the main risks on the ${d.name} deal and how do I de-risk it?`}
        />
        <Button
          appearance="outline"
          size="small"
          shape="circular"
          onClick={() => navigate("list_deals", { search: d.account })}
        >
          All {d.account} deals
        </Button>
      </TipBar>
    </Shell>
  );
}
