export type StorefrontActionVariant = "primary" | "secondary" | "quiet" | "danger";
export type StorefrontActionSize = "default" | "icon";
export interface StorefrontActionOptions {
  variant?: StorefrontActionVariant;
  size?: StorefrontActionSize;
  className?: string;
}

export interface StorefrontNavigationItem {
  key: string;
  href: string;
  label: string;
  description?: string;
  feature?: "bilimOdasi" | "nasilUretiyoruz";
  dialog?: "manifesto" | "delivery" | "whereToFind";
}
