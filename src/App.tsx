import { useEffect, useState } from "react";

import type { EntraSnapshot } from "./providers/azure/domain/entra";
import type { AzureSnapshot } from "./providers/azure/domain/resources";
import { OwnerReportView } from "./report";
import type { LoadState, SnapshotData, SnapshotFile } from "./report";

type SnapshotListResponse = {
  files: SnapshotFile[];
  error?: string;
};

const resourceSnapshotFileName = "snapshot.json";
const entraSnapshotFileName = "entra-snapshot.json";

export default function App() {
  const [files, setFiles] = useState<SnapshotFile[]>([]);
  const [resourceFile, setResourceFile] = useState<string>("");
  const [entraFile, setEntraFile] = useState<string>("");
  const [resourceSnapshot, setResourceSnapshot] = useState<AzureSnapshot | null>(null);
  const [entraSnapshot, setEntraSnapshot] = useState<EntraSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    async function loadFiles() {
      try {
        const response = await fetch("/api/snapshots");
        if (!response.ok) {
          throw new Error(`Snapshot list failed: ${response.status}`);
        }

        const result = (await response.json()) as SnapshotListResponse;
        const discoveredFiles = result.files;
        setFiles(discoveredFiles);

        const nextResourceFile = findFile(discoveredFiles, resourceSnapshotFileName);
        const nextEntraFile = findFile(discoveredFiles, entraSnapshotFileName);
        setResourceFile(nextResourceFile);
        setEntraFile(nextEntraFile);

        const missingFiles = [
          nextResourceFile ? null : `./data/${resourceSnapshotFileName}`,
          nextEntraFile ? null : `./data/${entraSnapshotFileName}`
        ].filter(Boolean);

        if (result.error || missingFiles.length > 0) {
          setLoadState({
            status: "error",
            message:
              result.error ??
              `Missing required snapshot file${missingFiles.length === 1 ? "" : "s"}: ${missingFiles.join(", ")}. Run the snapshot scripts and refresh the app.`
          });
          return;
        }

        setLoadState({ status: "ready" });
      } catch (error) {
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load snapshots."
        });
      }
    }

    loadFiles();
  }, []);

  useEffect(() => {
    if (!resourceFile || !entraFile) {
      setResourceSnapshot(null);
      setEntraSnapshot(null);
      return;
    }

    async function loadReportInputs() {
      setLoadState({ status: "loading" });

      try {
        const [nextResourceSnapshot, nextEntraSnapshot] = await Promise.all([
          readSnapshot(resourceFile),
          readSnapshot(entraFile)
        ]);

        assertProvider(nextResourceSnapshot, "azure");
        assertProvider(nextEntraSnapshot, "entra");
        setResourceSnapshot(nextResourceSnapshot as AzureSnapshot);
        setEntraSnapshot(nextEntraSnapshot as EntraSnapshot);
        setLoadState({ status: "ready" });
      } catch (error) {
        setResourceSnapshot(null);
        setEntraSnapshot(null);
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not read report inputs."
        });
      }
    }

    loadReportInputs();
  }, [resourceFile, entraFile]);

  const selectedResourceFile = files.find((file) => file.name === resourceFile);
  const selectedEntraFile = files.find((file) => file.name === entraFile);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>OwnerLens</h1>
          <p>Owner resolution report</p>
        </div>
        <div className="snapshot-selectors">
          <label>
            Azure resources
            <select
              aria-label="Azure resource snapshot file"
              value={resourceFile}
              onChange={(event) => setResourceFile(event.target.value)}
            >
              {files.length === 0 ? <option value="">No snapshots found in ./data</option> : null}
              {files.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Entra identities
            <select
              aria-label="Entra snapshot file"
              value={entraFile}
              onChange={(event) => setEntraFile(event.target.value)}
            >
              {files.length === 0 ? <option value="">No snapshots found in ./data</option> : null}
              {files.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {loadState.status === "error" ? <div className="alert">{loadState.message}</div> : null}

      {resourceSnapshot && entraSnapshot ? (
        <OwnerReportView
          resourceSnapshot={resourceSnapshot}
          entraSnapshot={entraSnapshot}
          resourceFile={selectedResourceFile}
          entraFile={selectedEntraFile}
        />
      ) : loadState.status === "loading" ? (
        <div className="empty-state">Loading report inputs...</div>
      ) : (
        <div className="empty-state">Create ./data/snapshot.json and ./data/entra-snapshot.json.</div>
      )}
    </main>
  );
}

async function readSnapshot(name: string): Promise<SnapshotData> {
  const response = await fetch(`/api/snapshots/read?name=${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Snapshot read failed for ${name}: ${response.status}`);
  }

  return (await response.json()) as SnapshotData;
}

function assertProvider(snapshot: SnapshotData, expectedProvider: "azure" | "entra") {
  if (snapshot.meta?.provider !== expectedProvider) {
    throw new Error(`Expected ${expectedProvider} snapshot, got ${String(snapshot.meta?.provider ?? "unknown")}.`);
  }
}

function findFile(files: SnapshotFile[], name: string): string {
  return files.find((file) => file.name === name)?.name ?? "";
}
