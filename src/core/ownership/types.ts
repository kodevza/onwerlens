export type OwnerConfidence = "high" | "medium" | "low" | "none";

export type OwnerEvidence = {
  user: string;
  date: string | null;
  disabled?: boolean;
};

export type OwnerResolution = {
  owner: string | null;
  confidence: OwnerConfidence;
  source: string;
  evidence: OwnerEvidence[];
};
