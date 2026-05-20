import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OwnerReportView } from "./OwnerReportView";
import type { OwnerReport, OwnerReportRow } from "./types";
import type { ProviderOverview } from "./reportProviderModule";
import type { ReportProvider } from "./reportTypes";

type TestContext = {
  report: OwnerReport;
};

test("renders disable controls for activity owner evidence", () => {
  const report = ownerReport([
    ownerRow({
      evidence: [
        {
          user: "owner@example.com",
          date: "2026-05-01T10:00:00.000Z"
        }
      ],
      owner: "owner@example.com",
      source: "activity.roleAssignments"
    })
  ]);

  const html = renderToStaticMarkup(
    <OwnerReportView
      baseReport={report}
      buildOverview={buildOverview}
      buildProviderContext={({ report }) => ({ report })}
      collectionTabs={[
        {
          id: "owners",
          label: "Owners",
          exportLabel: "Export Owners",
          fileBaseName: "owners",
          table: {
            emptyMessage: "No owners",
            minWidthClassName: "min-w-full"
          }
        }
      ]}
      providers={[ownersProvider]}
      reportInputs={{
        activityLogCount: 1,
        resourceGroupCount: 1,
        servicePrincipalCount: 0,
        subscriptionCount: 1
      }}
    />
  );

  expect(html).toMatch(/aria-label="Disable owner@example\.com"/);
});

const ownersProvider: ReportProvider<TestContext> = {
  id: "test",
  collections: [
    {
      id: "owners",
      title: "Owners",
      getCount: (ctx) => ctx.report.owners.length,
      getRows: (ctx) => ctx.report.owners,
      getRowKey: (row) => (row as OwnerReportRow).targetKey,
      fields: () => [
        {
          id: "owner",
          label: "Owner",
          valueType: "text",
          getValue: (row) => (row as OwnerReportRow).owner
        },
        {
          id: "evidence",
          label: "Evidence",
          valueType: "list",
          getValue: (row) => (row as OwnerReportRow).evidence.map((entry) => [entry.user, entry.date])
        }
      ]
    }
  ]
};

function buildOverview(): ProviderOverview {
  return {
    managedIdentityCount: 0,
    servicePrincipalCount: 0,
    tenantOwnedServicePrincipalCount: 0
  };
}

function ownerReport(owners: OwnerReportRow[]): OwnerReport {
  return { owners };
}

function ownerRow(row: Pick<OwnerReportRow, "evidence" | "owner" | "source">): OwnerReportRow {
  return {
    kind: "resourceGroup",
    subscriptionId: "sub-1",
    subscriptionName: "Subscription 1",
    resourceGroup: "rg-app",
    targetKey: "resourceGroup:sub-1:rg-app",
    confidence: "low",
    ...row
  };
}
