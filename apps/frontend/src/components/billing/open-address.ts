// apps/frontend/src/components/billing/open-address.ts
// Sends the browser to another address.
// A purchase, a payment method change and an export all continue on a page
// the payments driver or the success screen serves, so the billing screens
// leave through this one function. A test replaces it and reads the address.

/** Opens the address in the current browser tab. */
export function openAddress(url: string): void {
  window.location.href = url;
}
