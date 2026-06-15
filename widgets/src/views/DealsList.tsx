import React from "react";
import { Text, tokens } from "@fluentui/react-components";
import { Briefcase24Regular } from "@fluentui/react-icons";
import type { DealsData } from "../types";
import { Shell, TitleBar, Card, TipBar, PromptChip } from "../components/ui";
import { DealRow } from "../components/rows";

type Nav = (name: string, args?: Record<string, unknown>) => void;

export function DealsList({
  data,
  navigate,
  onBack,
  fullscreen,
}: {
  data: DealsData;
  navigate: Nav;
  onBack?: () => void;
  fullscreen?: boolean;
}) {
  const f = data.filters || {};
  const parts: string[] = [];
  if (f.stage) parts.push(f.stage);
  if (f.region) parts.push(f.region);
  if (f.rep) parts.push(`rep ${f.rep}`);
  if (f.min_amount) parts.push(`\u2265 ${f.min_amount}`);
  if (f.search) parts.push(`"${f.search}"`);
  const subtitle =
    `${data.total} deal${data.total === 1 ? "" : "s"}` +
    (parts.length ? ` \u00b7 ${parts.join(" \u00b7 ")}` : "");

  return (
    <Shell fullscreen={fullscreen}>
      <TitleBar
        title="Deals"
        subtitle={subtitle}
        icon={<Briefcase24Regular />}
        onBack={onBack}
      />
      <Card style={{ padding: "8px 8px" }}>
        {data.deals.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: tokens.colorNeutralForeground3,
            }}
          >
            <Text>No deals match these filters.</Text>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.deals.map((d) => (
              <DealRow
                key={d.id}
                deal={d}
                onOpen={() => navigate("show_deal_details", { deal_id: d.id })}
              />
            ))}
          </div>
        )}
      </Card>

      <TipBar>
        <Text size={200} weight="semibold">
          Try asking:
        </Text>
        <PromptChip
          label="Biggest deals"
          prompt="List the largest open deals over $200K and who owns them."
        />
        <PromptChip
          label="Negotiation stage"
          prompt="Show all deals in the Negotiation stage."
        />
        <PromptChip label="Back to dashboard" prompt="Show the sales dashboard." />
      </TipBar>
    </Shell>
  );
}
