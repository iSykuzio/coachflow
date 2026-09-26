"use client";

import { useEffect } from "react";

/**
 * Supabase recovery emails can land on whichever URL is configured as the site
 * URL, with the session in the hash. Move that session to the reset page.
 */
export function RecoveryHashRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/reset-password") return;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const type = hash.get("type") ?? query.get("type");
    const hasCredential =
      hash.has("access_token") || query.has("code") || query.has("token_hash");

    if (type !== "recovery" || !hasCredential) return;

    window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
