import { useEffect, useMemo, useState } from "react";

import { azureReportModule } from "./providers/azure";
import { OwnerReportView } from "./report";
import type { LoadState, OwnerReport, SnapshotData, SnapshotFile } from "./report";

type SnapshotListResponse = {
  files: SnapshotFile[];
  error?: string;
};

const reportModule = azureReportModule;

type ResourceSnapshot = Parameters<typeof reportModule.buildOwnershipReport>[0];
type IdentitySnapshot = Parameters<typeof reportModule.buildOwnershipReport>[1];

export default function App() {
  const [files, setFiles] = useState<SnapshotFile[]>([]);
  const [resourceFile, setResourceFile] = useState<string>("");
  const [identityFile, setIdentityFile] = useState<string>("");
  const [resourceSnapshot, setResourceSnapshot] = useState<ResourceSnapshot | null>(null);
  const [identitySnapshot, setIdentitySnapshot] = useState<IdentitySnapshot | null>(null);
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

        const nextResourceFile = findFile(discoveredFiles, reportModule.snapshots.resourceFileName);
        const nextIdentityFile = findFile(discoveredFiles, reportModule.snapshots.identityFileName);
        setResourceFile(nextResourceFile);
        setIdentityFile(nextIdentityFile);

        const missingFiles = [
          nextResourceFile ? null : `./data/${reportModule.snapshots.resourceFileName}`,
          nextIdentityFile ? null : `./data/${reportModule.snapshots.identityFileName}`
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
    if (!resourceFile || !identityFile) {
      setResourceSnapshot(null);
      setIdentitySnapshot(null);
      return;
    }

    async function loadReportInputs() {
      setLoadState({ status: "loading" });

      try {
        const [nextResourceSnapshot, nextIdentitySnapshot] = await Promise.all([
          readSnapshot(resourceFile),
          readSnapshot(identityFile)
        ]);

        assertProvider(nextResourceSnapshot, reportModule.snapshots.resourceProvider);
        assertProvider(nextIdentitySnapshot, reportModule.snapshots.identityProvider);
        setResourceSnapshot(nextResourceSnapshot as ResourceSnapshot);
        setIdentitySnapshot(nextIdentitySnapshot as IdentitySnapshot);
        setLoadState({ status: "ready" });
      } catch (error) {
        setResourceSnapshot(null);
        setIdentitySnapshot(null);
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not read report inputs."
        });
      }
    }

    loadReportInputs();
  }, [resourceFile, identityFile]);

  const selectedResourceFile = files.find((file) => file.name === resourceFile);
  const selectedIdentityFile = files.find((file) => file.name === identityFile);
  const baseReport = useMemo(
    () =>
      resourceSnapshot && identitySnapshot ? reportModule.buildOwnershipReport(resourceSnapshot, identitySnapshot) : null,
    [resourceSnapshot, identitySnapshot]
  );
  const reportContextFactory = useMemo(
    () =>
      ({ query, report }: { query: string; report: OwnerReport }) => {
        if (!resourceSnapshot || !identitySnapshot) {
          throw new Error("Report snapshots are not loaded.");
        }

        return reportModule.buildProviderContext({
          identitySnapshot,
          query,
          report,
          resourceSnapshot
        });
      },
    [identitySnapshot, resourceSnapshot]
  );

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
              value={identityFile}
              onChange={(event) => setIdentityFile(event.target.value)}
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

      {resourceSnapshot && identitySnapshot && baseReport ? (
        <OwnerReportView
          baseReport={baseReport}
          buildOverview={reportModule.buildOverview}
          buildProviderContext={reportContextFactory}
          collectionTabs={reportModule.collectionTabs}
          ownerColumnHelp={reportModule.ownerColumnHelp}
          providers={reportModule.providers}
          reportInputs={{
            activityLogCount: resourceSnapshot.activityLogs.length,
            entraFile: selectedIdentityFile,
            entraSnapshotCreatedAt: identitySnapshot.meta.createdAt ?? null,
            resourceFile: selectedResourceFile,
            resourceGroupCount: resourceSnapshot.resourceGroups.length,
            resourceSnapshotCreatedAt: resourceSnapshot.meta.createdAt ?? null,
            servicePrincipalCount: identitySnapshot.servicePrincipals.length,
            subscriptionCount: resourceSnapshot.subscriptions.length
          }}
          resetKey={`${resourceFile}:${identityFile}`}
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

function assertProvider(snapshot: SnapshotData, expectedProvider: string) {
  if (snapshot.meta?.provider !== expectedProvider) {
    throw new Error(`Expected ${expectedProvider} snapshot, got ${String(snapshot.meta?.provider ?? "unknown")}.`);
  }
}

function findFile(files: SnapshotFile[], name: string): string {
  return files.find((file) => file.name === name)?.name ?? "";
}
