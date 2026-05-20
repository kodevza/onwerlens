import {
  applyColumnFilterOpen,
  applyColumnFilterValueToggle,
  applyColumnValueToggle,
  applyReportTableControls,
  type ReportTableColumn
} from "./reportTableControls.tsx";
import type { ReportFieldDescriptor } from "../reportTypes.ts";
import { buildCollectionColumns } from "./CollectionColumnsFactory.tsx";

type Row = {
  id: string;
  ownership: "External" | "Tenant owned" | "Unknown";
  risk: "high" | "low" | "none";
};

const rows: Row[] = [
  { id: "external-low", ownership: "External", risk: "low" },
  { id: "tenant-high", ownership: "Tenant owned", risk: "high" },
  { id: "tenant-low", ownership: "Tenant owned", risk: "low" },
  { id: "tenant-none", ownership: "Tenant owned", risk: "none" },
  { id: "unknown-high", ownership: "Unknown", risk: "high" }
];

const columns: ReportTableColumn<Row>[] = [
  {
    id: "ownership",
    label: "Ownership",
    getValue: (row) => row.ownership,
    render: (row) => row.ownership
  },
  {
    id: "risk",
    label: "Permission risk",
    getValue: (row) => row.risk,
    render: (row) => row.risk
  }
];

test("applies multiple column value filters", () => {
  const result = applyReportTableControls(rows, columns, {
    ownership: { type: "values", values: ["External", "Tenant owned"] },
    risk: { type: "values", values: ["low", "high"] }
  });

  expect(result.controlledRows.map((row) => row.id)).toEqual(["external-low", "tenant-high", "tenant-low"]);
});

test("applies text column filters as regular expressions", () => {
  const result = applyReportTableControls(rows, columns, {
    ownership: { type: "text", value: "^tenant\\s+owned$" }
  });

  expect(result.controlledRows.map((row) => row.id)).toEqual(["tenant-high", "tenant-low", "tenant-none"]);
});

test("constructs filters from column value toggles", () => {
  const constructedFilters = applyColumnFilterValueToggle(
    applyColumnFilterValueToggle(
      applyColumnFilterValueToggle(applyColumnFilterValueToggle({}, "ownership", "External", true), "ownership", "Tenant owned", true),
      "risk",
      "low",
      true
    ),
    "risk",
    "high",
    true
  );

  expect(constructedFilters).toEqual({
    ownership: { type: "values", values: ["External", "Tenant owned"] },
    risk: { type: "values", values: ["low", "high"] }
  });

  expect(applyReportTableControls(rows, columns, constructedFilters).controlledRows.map((row) => row.id)).toEqual([
    "external-low",
    "tenant-high",
    "tenant-low"
  ]);
});

test("keeps only one column filter popover open", () => {
  const openFilterColumnId = applyColumnFilterOpen(
    applyColumnFilterOpen(applyColumnFilterOpen(null, "ownership", true), "risk", true),
    "ownership",
    false
  );

  expect(openFilterColumnId).toBe("risk");
});

test("toggles column values", () => {
  expect(applyColumnValueToggle(["External"], "Tenant owned", true)).toEqual(["External", "Tenant owned"]);

  expect(applyColumnValueToggle(["External", "Tenant owned"], "External", false)).toEqual(["Tenant owned"]);
});

test("applies descriptor-backed ownership and permission risk filters through table columns", () => {
  const fields: ReportFieldDescriptor<Row>[] = [
    {
      id: "ownership",
      label: "Ownership",
      valueType: "text",
      getValue: (row) => row.ownership,
      filter: {
        kind: "multiSelect"
      }
    },
    {
      id: "permissionRisk",
      label: "Permission risk",
      valueType: "riskLevel",
      getValue: (row) => row.risk,
      filter: {
        kind: "multiSelect"
      }
    }
  ];
  const columns = buildCollectionColumns(fields);

  const result = applyReportTableControls(rows, columns, {
    ownership: { type: "values", values: ["External", "Tenant owned"] },
    permissionRisk: { type: "values", values: ["low", "high"] }
  });

  expect(result.controlledRows.map((row) => row.id)).toEqual([
    "external-low",
    "tenant-high",
    "tenant-low"
  ]);
  expect(result.controlledRows.every((row) => ["External", "Tenant owned"].includes(row.ownership))).toBe(true);
});
