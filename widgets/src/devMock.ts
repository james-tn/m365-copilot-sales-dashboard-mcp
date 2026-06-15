import type { DashboardData } from "./types";

// Sample payload used only during `npm run dev` so the dashboard renders
// outside of an MCP host. Mirrors the shape returned by show_sales_dashboard.
export const devDashboard: DashboardData = {
  view: "dashboard",
  kpis: {
    open_pipeline: 7893000,
    weighted_pipeline: 2914500,
    closed_won: 4639000,
    closed_lost: 2690000,
    win_rate: 0.6774,
    avg_deal_size: 220905,
    total_quota: 9100000,
    quota_attainment: 0.5098,
    open_deal_count: 33,
    won_count: 21,
    lost_count: 10,
    total_deal_count: 64,
  },
  pipeline_by_stage: [
    { stage: "Prospecting", count: 10, amount: 2059000 },
    { stage: "Qualification", count: 12, amount: 2871000 },
    { stage: "Proposal", count: 8, amount: 2028000 },
    { stage: "Negotiation", count: 3, amount: 935000 },
  ],
  top_deals: [
    { id: "D-1042", name: "Contoso \u2013 Platform License", account: "Contoso", product: "Platform License", amount: 442000, stage: "Negotiation", probability: 80, rep_id: "r7", region: "AMER", close_date: "2026-07-30", created_date: "2026-02-01", next_step: "Awaiting signature", rep_name: "Emma Johnson", rep_color: "#6d28d9" },
    { id: "D-1018", name: "Fabrikam \u2013 Security Suite", account: "Fabrikam", product: "Security Suite", amount: 388000, stage: "Proposal", probability: 60, rep_id: "r3", region: "EMEA", close_date: "2026-08-12", created_date: "2026-03-04", next_step: "Send revised proposal", rep_name: "Sofia Rossi", rep_color: "#0e7490" },
    { id: "D-1006", name: "Alpine Ski House \u2013 Premium Support", account: "Alpine Ski House", product: "Premium Support", amount: 198000, stage: "Negotiation", probability: 80, rep_id: "r2", region: "EMEA", close_date: "2026-07-25", created_date: "2026-02-18", next_step: "Negotiate final pricing", rep_name: "Liam Walsh", rep_color: "#7c3aed" },
    { id: "D-1031", name: "Relecloud \u2013 Data Pipeline", account: "Relecloud", product: "Data Pipeline", amount: 176000, stage: "Qualification", probability: 30, rep_id: "r5", region: "APAC", close_date: "2026-09-01", created_date: "2026-04-10", next_step: "Confirm budget with finance", rep_name: "Mia Chen", rep_color: "#059669" },
    { id: "D-1024", name: "Litware \u2013 AI Copilot Seats", account: "Litware", product: "AI Copilot Seats", amount: 152000, stage: "Proposal", probability: 60, rep_id: "r1", region: "AMER", close_date: "2026-08-20", created_date: "2026-03-22", next_step: "Technical proof-of-concept review", rep_name: "Ava Thompson", rep_color: "#0a66c2" },
    { id: "D-1052", name: "VanArsdel \u2013 Analytics Add-on", account: "VanArsdel", product: "Analytics Add-on", amount: 131000, stage: "Prospecting", probability: 10, rep_id: "r6", region: "LATAM", close_date: "2026-09-15", created_date: "2026-05-02", next_step: "Schedule executive briefing", rep_name: "Lucas Silva", rep_color: "#dc2626" },
  ],
  rep_leaderboard: [
    { id: "r7", name: "Emma Johnson", region: "AMER", role: "Senior Account Executive", color: "#6d28d9", quota: 1500000, closed_won: 962000, open_pipeline: 1180000, open_deal_count: 6, quota_attainment: 0.6413 },
    { id: "r3", name: "Sofia Rossi", region: "EMEA", role: "Senior Account Executive", color: "#0e7490", quota: 1400000, closed_won: 618000, open_pipeline: 821000, open_deal_count: 3, quota_attainment: 0.4414 },
    { id: "r2", name: "Liam Walsh", region: "EMEA", role: "Account Executive", color: "#7c3aed", quota: 1000000, closed_won: 543000, open_pipeline: 593000, open_deal_count: 4, quota_attainment: 0.543 },
    { id: "r1", name: "Ava Thompson", region: "AMER", role: "Account Executive", color: "#0a66c2", quota: 1200000, closed_won: 528000, open_pipeline: 905000, open_deal_count: 5, quota_attainment: 0.44 },
    { id: "r5", name: "Mia Chen", region: "APAC", role: "Senior Account Executive", color: "#059669", quota: 1300000, closed_won: 489000, open_pipeline: 762000, open_deal_count: 4, quota_attainment: 0.3762 },
    { id: "r4", name: "Noah Kim", region: "APAC", role: "Account Executive", color: "#b45309", quota: 900000, closed_won: 421000, open_pipeline: 540000, open_deal_count: 3, quota_attainment: 0.4678 },
    { id: "r8", name: "Omar Haddad", region: "EMEA", role: "Account Executive", color: "#0284c7", quota: 1000000, closed_won: 388000, open_pipeline: 612000, open_deal_count: 4, quota_attainment: 0.388 },
    { id: "r6", name: "Lucas Silva", region: "LATAM", role: "Account Executive", color: "#dc2626", quota: 800000, closed_won: 290000, open_pipeline: 480000, open_deal_count: 4, quota_attainment: 0.3625 },
  ],
  region_breakdown: [
    { region: "AMER", closed_won: 1490000, open_pipeline: 2085000, open_deal_count: 11, win_rate: 0.71 },
    { region: "EMEA", closed_won: 1549000, open_pipeline: 2026000, open_deal_count: 11, win_rate: 0.67 },
    { region: "APAC", closed_won: 910000, open_pipeline: 1302000, open_deal_count: 7, win_rate: 0.66 },
    { region: "LATAM", closed_won: 690000, open_pipeline: 480000, open_deal_count: 4, win_rate: 0.6 },
  ],
  filters: { period: "this_year", period_label: "This year", region: "" },
};
