# Contributing

Thank you for considering a contribution to OwnerLens.

## Development

1. Install dependencies with `npm install`.
2. Create local snapshot files in `./data` if your change affects report
   behavior.
3. Start the app with `npm run dev`.
4. Run tests with `npm test`.
5. Run a production build with `npm run build` before opening a larger change.

## Guidelines

- Keep snapshot data, tenant identifiers, subscription identifiers, and exported
  activity logs out of commits.
- Add or update focused tests for ownership resolution, filtering, or report
  behavior changes.
- Prefer small pull requests with a clear description of the user-visible
  behavior being changed.
- Follow the existing TypeScript and React patterns in the codebase.

## Reporting Issues

When reporting an issue, include:

- The OwnerLens version or commit.
- The command that failed, if applicable.
- A short description of the snapshot shape involved. Do not attach sensitive
  snapshot data unless it has been reviewed and sanitized.
