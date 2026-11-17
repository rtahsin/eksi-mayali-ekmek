import type { StorefrontActionOptions } from "@/types/storefront-ui";

/** Shared by native buttons and navigation links; behavior stays with the caller. */
export function storefrontAction({ variant = "secondary", size = "default", className = "" }: StorefrontActionOptions = {}): string {
  return `sf-action sf-action--${variant} sf-action--${size} ${className}`.trim();
}
