import type { MouseEvent } from "react";

/** Keep native link behavior, including new tabs; refresh a repeated catalog anchor on the home page. */
export function handleStorefrontAnchor(event: MouseEvent<HTMLAnchorElement>): void {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = new URL(event.currentTarget.href);
  if (target.origin !== window.location.origin || target.pathname !== "/" || window.location.pathname !== "/" || !target.hash) return;
  event.preventDefault();
  window.location.hash = target.hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
