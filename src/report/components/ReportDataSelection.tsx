import type { ReactNode } from "react";
import { ChevronDown, Download } from "lucide-react";

import { Card, CardContent } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export type ExportFormat = "json" | "csv";

export type ReportCollectionTab<TId extends string = string> = {
  id: TId;
  label: string;
  count: number;
  exportLabel?: string;
  onExport?: (format: ExportFormat) => void;
};

type ReportDataSelectionProps = {
  activeTab: string;
  children: ReactNode;
  collections: ReportCollectionTab[];
  onQueryChange: (query: string) => void;
  onTabChange: (tab: string) => void;
  query: string;
};

export function ReportDataSelection({
  activeTab,
  children,
  collections,
  onQueryChange,
  onTabChange,
  query
}: ReportDataSelectionProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList aria-label="Report sections">
              {collections.map((collection) => (
                <ReportTabTrigger key={collection.id} count={collection.count} tab={collection.id}>
                  {collection.label}
                </ReportTabTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ReportExportButton activeTab={activeTab} collections={collections} />
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
  collections
}: {
  activeTab: string;
  collections: ReportCollectionTab[];
}) {
  const exportConfig = getExportConfig(activeTab, collections);

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
  activeTab: string,
  collections: ReportCollectionTab[]
): { label: string; onExport: (format: ExportFormat) => void } | null {
  const collection = collections.find((entry) => entry.id === activeTab);
  if (collection?.onExport && collection.exportLabel) {
    return { label: collection.exportLabel, onExport: collection.onExport };
  }

  return null;
}

function ReportTabTrigger({
  tab,
  count,
  children
}: {
  tab: string;
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
