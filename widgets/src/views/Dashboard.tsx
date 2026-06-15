import React from "react";
import { tokens, Text, Button } from "@fluentui/react-components";
import {
  Money24Regular,
  DataTrending24Regular,
  Trophy24Regular,
  Target24Regular,
  DataPie24Regular,
  Briefcase24Regular,
  Globe24Regular,
} from "@fluentui/react-icons";
import type { DashboardData } from "../types";
import { money, pct } from "../format";
import {
  Card,
  KpiCard,
  SectionTitle,
  Meter,
  StagePill,
  RegionPill,
  RepAvatar,
  TitleBar,
  TipBar,
  PromptChip,
  ViewLink,
  HoverRow,
  Shell,
  stageColor,
  regionColor,
} from "../components/ui";
import { DealRow } from "../components/rows";

type Nav = (name: string, args?: Record<string, unknown>) => void;

const PERIODS: [string, string][] = [
  ["this_quarter", "This quarter"],
  ["this_year", "This year"],
  ["all", "All time"],
];
const REGION_FILTERS: [string, string][] = [
  ["", "All regions"],
  ["AMER", "AMER"],
  ["EMEA", "EMEA"],
  ["APAC", "APAC"],
  ["LATAM", "LATAM"],
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="small"
      shape="circular"
      appearance={active ? "primary" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function Dashboard({
  data,
  navigate,
  onBack,
  fullscreen,
}: {
  data: DashboardData;
  navigate: Nav;
  onBack?: () => void;
  fullscreen?: boolean;
}) {
  const k = data.kpis;
  const region = data.filters.region || "";
  const period = data.filters.period || "this_year";
  const scope =
    (data.filters.period_label || "This year") +
    (region ? ` \u00b7 ${region}` : "") +
    (k.total_deal_count ? ` \u00b7 ${k.total_deal_count} deals` : "");
  const maxStage = Math.max(1, ...data.pipeline_by_stage.map((s) => s.amount));

  return (
    <Shell fullscreen={fullscreen}>
      <TitleBar
        title="Sales Dashboard"
        subtitle={scope}
        icon={<DataTrending24Regular />}
        onBack={onBack}
      />

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {PERIODS.map(([val, label]) => (
          <Chip
            key={val}
            active={period === val}
            onClick={() => navigate("show_sales_dashboard", { period: val, region })}
          >
            {label}
          </Chip>
        ))}
        <span style={{ width: 1, height: 20, background: tokens.colorNeutralStroke2 }} />
        {REGION_FILTERS.map(([val, label]) => (
          <Chip
            key={val || "all"}
            active={region === val}
            onClick={() => navigate("show_sales_dashboard", { period, region: val })}
          >
            {label}
          </Chip>
        ))}
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        <KpiCard
          icon={<Briefcase24Regular />}
          label="Open pipeline"
          value={money(k.open_pipeline)}
          sub={`${k.open_deal_count} open deals`}
          accent="#5b8def"
        />
        <KpiCard
          icon={<DataTrending24Regular />}
          label="Weighted pipeline"
          value={money(k.weighted_pipeline)}
          sub="probability-adjusted"
          accent="#8a6ded"
        />
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
              <Meter value={k.quota_attainment} color="#e0902f" height={6} />
              <div style={{ marginTop: 3 }}>of {money(k.total_quota)}</div>
            </div>
          }
          accent="#e0902f"
        />
        <KpiCard
          icon={<Trophy24Regular />}
          label="Win rate"
          value={pct(k.win_rate)}
          sub={`${k.won_count}W / ${k.lost_count}L`}
          accent="#d65db1"
        />
        <KpiCard
          icon={<DataPie24Regular />}
          label="Avg deal size"
          value={money(k.avg_deal_size)}
          sub="won deals"
          accent="#0e7490"
        />
      </div>

      {/* Pipeline / leaderboard / regions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Pipeline by stage */}
        <Card>
          <SectionTitle icon={<DataPie24Regular />}>Pipeline by stage</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.pipeline_by_stage.map((s) => (
              <HoverRow
                key={s.stage}
                onClick={() => navigate("list_deals", { stage: s.stage, region })}
                style={{ padding: "8px 6px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StagePill stage={s.stage} />
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {s.count} deals
                    </Text>
                  </div>
                  <Text weight="semibold">{money(s.amount)}</Text>
                </div>
                <Meter value={s.amount / maxStage} color={stageColor(s.stage)} />
              </HoverRow>
            ))}
          </div>
        </Card>

        {/* Rep leaderboard */}
        <Card>
          <SectionTitle icon={<Trophy24Regular />}>Rep leaderboard</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.rep_leaderboard.map((r, i) => (
              <HoverRow
                key={r.id}
                onClick={() => navigate("show_rep_details", { rep: r.id })}
                style={{ padding: "8px 6px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 18,
                      textAlign: "center",
                      fontWeight: 700,
                      color: tokens.colorNeutralForeground3,
                    }}
                  >
                    {i + 1}
                  </div>
                  <RepAvatar name={r.name} color={r.color} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                      <RegionPill region={r.region} />
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        {r.open_deal_count} open
                      </Text>
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <Meter value={r.quota_attainment} color={r.color} height={6} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{money(r.closed_won)}</div>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      {pct(r.quota_attainment)} quota
                    </Text>
                  </div>
                </div>
              </HoverRow>
            ))}
          </div>
        </Card>

        {/* Region breakdown */}
        <Card>
          <SectionTitle icon={<Globe24Regular />}>By region</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.region_breakdown.map((rg) => (
              <HoverRow
                key={rg.region}
                onClick={() => navigate("show_sales_dashboard", { region: rg.region, period })}
                style={{ padding: "8px 6px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <RegionPill region={rg.region} />
                  <Text weight="semibold">{money(rg.closed_won)}</Text>
                </div>
                <Meter value={rg.win_rate} color={regionColor(rg.region)} height={6} />
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                  open {money(rg.open_pipeline)} {"\u00b7"} {rg.open_deal_count} deals {"\u00b7"} win{" "}
                  {pct(rg.win_rate)}
                </Text>
              </HoverRow>
            ))}
          </div>
        </Card>
      </div>

      {/* Top deals */}
      <Card style={{ padding: "16px 8px" }}>
        <div style={{ padding: "0 8px" }}>
          <SectionTitle
            icon={<Briefcase24Regular />}
            right={<ViewLink label="All deals" onClick={() => navigate("list_deals", { region })} />}
          >
            Top open deals
          </SectionTitle>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.top_deals.map((d) => (
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
          Try asking:
        </Text>
        <PromptChip
          label="Deals at risk"
          prompt="Which of our late-stage deals look at risk and what should I do about them?"
        />
        <PromptChip label="EMEA view" prompt="Show me the sales dashboard for EMEA." />
        <PromptChip
          label="Forecast"
          prompt="Based on the weighted pipeline, what's our forecast to close this quarter?"
        />
        <PromptChip label="Top rep" prompt="Who is our top performing rep and why?" />
      </TipBar>
    </Shell>
  );
}
