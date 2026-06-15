// Compact, locale-aware formatters used across the dashboard widget.

export function money(n: number | undefined | null): string {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function moneyFull(n: number | undefined | null): string {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function pct(n: number | undefined | null): string {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return `${Math.round(v * 100)}%`;
}

export function dateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
