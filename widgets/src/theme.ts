// Stage / region color helpers. Fixed hues that read well on light and dark.

export const STAGE_COLORS: Record<string, string> = {
  Prospecting: "#5b8def",
  Qualification: "#8a6ded",
  Proposal: "#e0902f",
  Negotiation: "#d65db1",
  "Closed Won": "#2bb673",
  "Closed Lost": "#e0563f",
};

export function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? "#8a8886";
}

export const REGION_COLORS: Record<string, string> = {
  AMER: "#0a66c2",
  EMEA: "#7c3aed",
  APAC: "#0e7490",
  LATAM: "#b45309",
};

export function regionColor(region: string): string {
  return REGION_COLORS[region] ?? "#8a8886";
}

// Translucent tint for pill backgrounds (hex + alpha).
export function tint(hex: string, alpha = "22"): string {
  return `${hex}${alpha}`;
}
