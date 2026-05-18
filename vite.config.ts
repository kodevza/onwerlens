import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { constants as fsConstants } from "node:fs";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const snapshotNamePattern = /^[\w.-]*snapshot\.json$/i;
const snapshotDirectoryName = "data";

function snapshotsApi(): Plugin {
  const root = process.cwd();
  const snapshotsDir = path.join(root, snapshotDirectoryName);

  return {
    name: "ownerlens-snapshots-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/snapshots")) {
          next();
          return;
        }

        try {
          const url = new URL(req.url, "http://localhost");

          if (url.pathname === "/api/snapshots") {
            const directoryExists = await pathExists(snapshotsDir);
            if (!directoryExists) {
              sendJson(res, {
                files: [],
                error:
                  "Snapshot directory ./data was not found. Run the snapshot scripts to create ./data/snapshot.json and ./data/entra-snapshot.json."
              });
              return;
            }

            const entries = await readdir(snapshotsDir);
            const files = await Promise.all(
              entries
                .filter((name) => snapshotNamePattern.test(name))
                .map(async (name) => {
                  const filePath = path.join(snapshotsDir, name);
                  const details = await stat(filePath);
                  return {
                    name,
                    size: details.size,
                    updatedAt: details.mtime.toISOString()
                  };
                })
            );

            sendJson(res, { files: files.sort((a, b) => a.name.localeCompare(b.name)) });
            return;
          }

          if (url.pathname === "/api/snapshots/read") {
            const name = url.searchParams.get("name") ?? "";

            if (!snapshotNamePattern.test(name) || path.basename(name) !== name) {
              sendJson(res, { error: "Invalid snapshot file name." }, 400);
              return;
            }

            const filePath = path.join(snapshotsDir, name);
            if (!(await pathExists(filePath))) {
              sendJson(res, { error: `Snapshot file ./data/${name} was not found.` }, 404);
              return;
            }

            const content = await readFile(filePath, "utf8");
            sendJson(res, JSON.parse(content));
            return;
          }

          next();
        } catch (error) {
          sendJson(
            res,
            { error: error instanceof Error ? error.message : "Unknown error" },
            500
          );
        }
      });
    }
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sendJson(
  res: { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void },
  value: unknown,
  statusCode = 200
) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

export default defineConfig({
  plugins: [react(), tailwindcss(), snapshotsApi()]
});
