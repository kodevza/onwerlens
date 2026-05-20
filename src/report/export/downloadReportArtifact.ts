import type { ReportExportArtifact } from "../reportTypes";
import { serializeCsv } from "./csv";

export function downloadReportArtifact(artifact: ReportExportArtifact) {
  if (artifact.kind === "csv") {
    downloadBlob(new Blob([serializeCsv(artifact.rows)], { type: "text/csv;charset=utf-8" }), artifact.fileName);
    return;
  }

  downloadBlob(new Blob([JSON.stringify(artifact.data, null, 2)], { type: "application/json" }), artifact.fileName);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
