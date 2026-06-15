// Shapes mirror the `structuredContent` returned by the Python MCP tools.

export type Theme = "light" | "dark";

export interface Deal {
  id: string;
  name: string;
  account: string;
  product: string;
  amount: number;
  stage: string;
  probability: number;
  rep_id: string;
  region: string;
  close_date: string;
  created_date: string;
  next_step: string;
  rep_name: string;
  rep_color: string;
}

export interface Rep {
  id: string;
  name: string;
  region: string;
  role: string;
  quota: number;
  color: string;
}

export interface Kpis {
  open_pipeline: number;
  weighted_pipeline: number;
  closed_won: number;
  closed_lost: number;
  win_rate: number;
  avg_deal_size: number;
  total_quota: number;
  quota_attainment: number;
  open_deal_count: number;
  won_count: number;
  lost_count: number;
  total_deal_count?: number;
}

export interface StageBucket {
  stage: string;
  count: number;
  amount: number;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  region: string;
  role: string;
  color: string;
  quota: number;
  closed_won: number;
  open_pipeline: number;
  open_deal_count: number;
  quota_attainment: number;
}

export interface RegionRow {
  region: string;
  closed_won: number;
  open_pipeline: number;
  open_deal_count: number;
  win_rate: number;
}

export interface Filters {
  period?: string;
  period_label?: string;
  region?: string;
  stage?: string;
  rep?: string;
  min_amount?: string;
  search?: string;
}

export interface DashboardData {
  view: "dashboard";
  kpis: Kpis;
  pipeline_by_stage: StageBucket[];
  top_deals: Deal[];
  rep_leaderboard: LeaderboardRow[];
  region_breakdown: RegionRow[];
  filters: Filters;
}

export interface DealsData {
  view: "deals";
  total: number;
  deals: Deal[];
  filters: Filters;
}

export interface DealData {
  view: "deal";
  deal: Deal;
  rep: Rep;
  related_deals: Deal[];
}

export interface RepData {
  view: "rep";
  rep: Rep;
  kpis: Kpis;
  deals: Deal[];
}

export interface SummaryData {
  view: "summary";
  kpis: Kpis;
  pipeline_by_stage: StageBucket[];
  region_breakdown: RegionRow[];
  filters: Filters;
}

export interface ErrorData {
  view: "error";
  message: string;
}

export type ToolData =
  | DashboardData
  | DealsData
  | DealData
  | RepData
  | SummaryData
  | ErrorData;
