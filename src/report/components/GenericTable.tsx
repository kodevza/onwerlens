import { useMemo } from "react";

import { buildCollectionColumns, type ReportColumnRenderers } from "../buildCollectionColumns";
import type { ReportFieldDescriptor } from "../reportTypes";
import { Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "./ui/table";
import { ReportTableHead, useReportTableControls } from "./reportTableControls";

type GenericTableProps<TRow> = {
  emptyMessage: string;
  fields: ReportFieldDescriptor<TRow>[];
  fieldRenderers?: ReportColumnRenderers<TRow>;
  getRowKey: (row: TRow) => string;
  minWidthClassName: string;
  rows: TRow[];
};

export function GenericTable<TRow>({
  emptyMessage,
  fields,
  fieldRenderers,
  getRowKey,
  minWidthClassName,
  rows
}: GenericTableProps<TRow>) {
  const columns = useMemo(
    () => buildCollectionColumns(fields, { renderers: fieldRenderers }),
    [fields, fieldRenderers]
  );
  const {
    controlledRows,
    filterOptions,
    filters,
    openFilterColumnId,
    setColumnFilter,
    setColumnFilterOpen,
    setColumnValuesFilter,
    sortRules,
    toggleColumnValueFilter,
    toggleColumnSort
  } = useReportTableControls(rows, fields);

  return (
    <TableContainer>
      <Table className={minWidthClassName}>
        <TableHeader>
          <TableRow>
            <ReportTableHead
              columns={columns}
              filterOptions={filterOptions}
              filters={filters}
              openFilterColumnId={openFilterColumnId}
              sortRules={sortRules}
              onFilterChange={setColumnFilter}
              onFilterOpenChange={setColumnFilterOpen}
              onValueFilterToggle={toggleColumnValueFilter}
              onValuesFilterChange={setColumnValuesFilter}
              onSortToggle={toggleColumnSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {controlledRows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.id}>{column.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {controlledRows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">{emptyMessage}</div>
      ) : null}
    </TableContainer>
  );
}
