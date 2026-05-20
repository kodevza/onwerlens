import type { OwnerResolution } from "./types";

export type OwnerResolver<TTarget, TContext> = {
  resolveOwner(target: TTarget, context: TContext): OwnerResolution;
};
