import type { ReactNode } from "react";
import { ChevronDown, Download } from "lucide-react";

import { Card, CardContent } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

export type ReportTab = "owners" | "managedIdentities" | "servicePrincipals";
export type ExportFormat = "json" | "csv";

type ReportDataSelectionProps = {
  activeTab: ReportTab;
  children: ReactNode;
  managedIdentityCount: number;
  onManagedIdentityExport?: (format: ExportFormat) => void;
  onQueryChange: (query: string) => void;
  onOwnerExport?: (format: ExportFormat) => void;
  onServicePrincipalExport?: (format: ExportFormat) => void;
  onTabChange: (tab: ReportTab) => void;
  ownerCount: number;
  query: string;
  servicePrincipalCount: number;
};

export function ReportDataSelection({
  activeTab,
  children,
  managedIdentityCount,
  onManagedIdentityExport,
  onOwnerExport,
  onQueryChange,
  onServicePrincipalExport,
  onTabChange,
  ownerCount,
  query,
  servicePrincipalCount
}: ReportDataSelectionProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ReportTab)}>
            <TabsList aria-label="Report sections">
              <ReportTabTrigger count={ownerCount} tab="owners">
                Owner Report
              </ReportTabTrigger>
              <ReportTabTrigger
                count={managedIdentityCount}
                tab="managedIdentities"
              >
                Managed Identities
              </ReportTabTrigger>
              <ReportTabTrigger
                count={servicePrincipalCount}
                tab="servicePrincipals"
              >
                Service Principals
              </ReportTabTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ReportExportButton
              activeTab={activeTab}
              onManagedIdentityExport={onManagedIdentityExport}
              onOwnerExport={onOwnerExport}
              onServicePrincipalExport={onServicePrincipalExport}
            />
            <Input
              aria-label="Filter active table"
              className="lg:max-w-80"
              placeholder="RegExp active table"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ReportExportButton({
  activeTab,
  onManagedIdentityExport,
  onOwnerExport,
  onServicePrincipalExport
}: {
  activeTab: ReportTab;
  onManagedIdentityExport?: (format: ExportFormat) => void;
  onOwnerExport?: (format: ExportFormat) => void;
  onServicePrincipalExport?: (format: ExportFormat) => void;
}) {
  const exportConfig = getExportConfig(
    activeTab,
    onOwnerExport,
    onManagedIdentityExport,
    onServicePrincipalExport
  );

  if (!exportConfig) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          type="button"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {exportConfig.label}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => exportConfig.onExport("json")}>JSON</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportConfig.onExport("csv")}>CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getExportConfig(
  activeTab: ReportTab,
  onOwnerExport?: (format: ExportFormat) => void,
  onManagedIdentityExport?: (format: ExportFormat) => void,
  onServicePrincipalExport?: (format: ExportFormat) => void
): { label: string; onExport: (format: ExportFormat) => void } | null {
  if (activeTab === "owners" && onOwnerExport) {
    return { label: "Export owners", onExport: onOwnerExport };
  }

  if (activeTab === "managedIdentities" && onManagedIdentityExport) {
    return { label: "Export MI", onExport: onManagedIdentityExport };
  }

  if (activeTab === "servicePrincipals" && onServicePrincipalExport) {
    return { label: "Export SP", onExport: onServicePrincipalExport };
  }

  return null;
}

function ReportTabTrigger({
  tab,
  count,
  children
}: {
  tab: ReportTab;
  count: number;
  children: string;
}) {
  return (
    <TabsTrigger value={tab}>
      {children}
      <span className="ml-2 rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground data-[state=active]:text-foreground">
        {count}
      </span>
    </TabsTrigger>
  );
}
