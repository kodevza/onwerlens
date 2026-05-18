# Security Policy

## Reporting A Vulnerability

Please report security issues privately to the project maintainers instead of
opening a public issue. Include a concise description, reproduction steps, and
the affected commit or release when possible.

## Data Handling

OwnerLens is designed to run locally, but its snapshot files can contain
sensitive tenant, subscription, resource, identity, group, and activity-log
metadata. Review exported JSON files before sharing them outside your
organization.

Files matching `data/*snapshot.json` are ignored by git by default.
