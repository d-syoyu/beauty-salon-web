// Shared admin access flags for demo environments.
// Set NEXT_PUBLIC_ADMIN_AUTH_DISABLED=false to restore admin auth.

export const ADMIN_AUTH_DISABLED =
  process.env.NEXT_PUBLIC_ADMIN_AUTH_DISABLED !== "false";
