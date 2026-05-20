export type EntraAppRole = {
  id: string;
  value: string | null;
  displayName: string | null;
  description: string | null;
  isEnabled: boolean | null;
  allowedMemberTypes: string[];
};
