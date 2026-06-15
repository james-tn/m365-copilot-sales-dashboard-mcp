import React from "react";
import { Text, tokens } from "@fluentui/react-components";
import {
  Person24Regular,
  Money24Regular,
  Target24Regular,
  Trophy24Regular,
  Briefcase24Regular,
  DataTrending24Regular,
} from "@fluentui/react-icons";
import type { RepData } from "../types";
import { money, pct } from "../format";
import {
  Shell,
  TitleBar,
  Card,
  SectionTitle,
  KpiCard,
  Meter,
  RegionPill,
  RepAvatar,
  TipBar,
  PromptChip,
} from "../components/ui";
import { DealRow } from "../components/rows";

type Nav = (name: string, args?: Record<string, unknown>) => void;

export function RepDetail({
  data,
  navigate,
  onBack,
  fullscreen,
}: {
  data: RepData;
  navigate: Nav;
  onBack?: () => void;
  fullscreen?: boolean;
}) {
  const r = data.rep;
  const k = data.kpis;

  return (
    <Shell fullscreen={fullscreen}>
      <TitleBar
        title={r.name}
        subtitle={`${r.role} \u00b7 ${r.region}`}
        icon={<Person24Regular />}
        onBack={onBack}
      />

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <RepAvatar name={r.name} color={r.color} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text weight="bold" style={{ fontSize: 18 }}>
              {r.name}
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <RegionPill region={r.region} />
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {r.role} {"\u00b7"} quota {money(r.quota)}
              </Text>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          <KpiCard
            icon={<Money24Regular />}
            label="Closed won"
            value={money(k.closed_won)}
            sub={`${k.won_count} deals won`}
            accent="#2bb673"
          />
          <KpiCard
            icon={<Target24Regular />}
            label="Quota attainment"
            value={pct(k.quota_attainment)}
            sub={
              <div style={{ marginTop: 4 }}>
                <Meter value={k.quota_attainment} color={r.color} height={6} />
              </div>
            }
            accent="#e0902f"
          />
          <KpiCard
            icon={<Briefcase24Regular />}
            label="Open pipeline"
            value={money(k.open_pipeline)}
            sub={`${k.open_deal_count} open deals`}
            accent="#5b8def"
          />
          <KpiCard
            icon={<DataTrending24Regular />}
            label="Weighted"
            value={money(k.weighted_pipeline)}
            sub="probability-adjusted"
            accent="#8a6ded"
          />
          <KpiCard
            icon={<Trophy24Regular />}
            label="Win rate"
            value={pct(k.win_rate)}
            sub={`${k.won_count}W / ${k.lost_count}L`}
            accent="#d65db1"
          />
        </div>
      </Card>

      <Card style={{ padding: "16px 8px" }}>
        <div style={{ padding: "0 8px" }}>
          <SectionTitle icon={<Briefcase24Regular />}>
            {r.name.split(" ")[0]}'s deals ({data.deals.length})
          </SectionTitle>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.deals.map((d) => (
            <DealRow
              key={d.id}
              deal={d}
              onOpen={() => navigate("show_deal_details", { deal_id: d.id })}
            />
          ))}
        </div>
      </Card>

      <TipBar>
        <Text size={200} weight="semibold">
          Ask the agent:
        </Text>
        <PromptChip
          label="Coaching plan"
          prompt={`Based on ${r.name}'s pipeline and quota attainment, suggest a coaching plan to hit target.`}
        />
        <PromptChip
          label="Forecast"
          prompt={`What is ${r.name} likely to close this quarter based on their weighted pipeline?`}
        />
        <PromptChip label="Back to dashboard" prompt="Show the sales dashboard." />
      </TipBar>
    </Shell>
  );
}
