import type { OwnerEvidence } from "../types";

type EvidenceListProps = {
  evidence: OwnerEvidence[];
  canDisable?: boolean;
  onDisabledChange?: (entry: OwnerEvidence, disabled: boolean) => void;
};

export function EvidenceList({ evidence, canDisable = false, onDisabledChange }: EvidenceListProps) {
  if (evidence.length === 0) {
    return "-";
  }

  return (
    <div className="flex flex-col gap-1">
      {evidence.map((entry) => {
        const isEmailCandidate = entry.user.includes("@");

        return (
          <div
            className={
              entry.disabled
                ? "flex flex-col gap-0.5 rounded bg-muted px-1.5 py-1 leading-snug text-muted-foreground"
                : "flex flex-col gap-0.5 rounded bg-emerald-100 px-1.5 py-1 leading-snug text-emerald-800"
            }
            key={`${entry.user}:${entry.date ?? ""}`}
          >
            <div className="flex items-start gap-1.5">
              {isEmailCandidate && canDisable && onDisabledChange ? (
                <button
                  aria-label={`${entry.disabled ? "Enable" : "Disable"} ${entry.user}`}
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-background text-xs leading-none text-muted-foreground hover:text-foreground"
                  title={entry.disabled ? "Enable owner candidate" : "Disable owner candidate"}
                  type="button"
                  onClick={() => onDisabledChange(entry, !entry.disabled)}
                >
                  x
                </button>
              ) : null}
              <span className={entry.disabled ? "line-through" : undefined}>{entry.user}</span>
            </div>
            {entry.date ? (
              <time className="text-xs text-muted-foreground" dateTime={entry.date}>
                {entry.date}
              </time>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
