import { Card, CardContent } from "./ui/card";

export type OwnerOverviewProps = {
  managedIdentityCount: number;
  ownedCount: number;
  ownerRowCount: number;
  servicePrincipalCount: number;
  tenantOwnedServicePrincipalCount: number;
  unresolvedCount: number;
};

export function OwnerOverview({
  managedIdentityCount,
  ownedCount,
  ownerRowCount,
  servicePrincipalCount,
  tenantOwnedServicePrincipalCount,
  unresolvedCount
}: OwnerOverviewProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Owned Targets" value={`${ownedCount} / ${ownerRowCount}`} />
      <SummaryCard label="Unresolved" value={String(unresolvedCount)} />
      <SummaryCard label="Managed Identities" value={String(managedIdentityCount)} />
      <SummaryCard
        label="Tenant-Owned Service Principals"
        value={`${tenantOwnedServicePrincipalCount} / ${servicePrincipalCount}`}
      />
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-24 flex-col gap-2 p-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <strong className="break-words text-xl leading-tight">{value}</strong>
      </CardContent>
    </Card>
  );
}
