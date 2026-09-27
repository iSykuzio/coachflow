"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { homeForRole } from "@/lib/auth/home-path";

const PASSWORD_USER_KEY = "cf_pw_uid";

function userIdFromAccessToken(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="))) as {
      sub?: unknown;
    };
    return typeof json.sub === "string" && json.sub.length > 0 ? json.sub : null;
  } catch {
    return null;
  }
}

export default function FinishAuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const type = hash.get("type") ?? query.get("type");
      const next = query.get("next");
      const needsPassword = type === "invite" || type === "recovery" || next === "/reset-password";
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (needsPassword && (!accessToken || !refreshToken)) {
        setMessage("This link is invalid or has expired. Request a new invitation or reset your password.");
        return;
      }

      if (accessToken && refreshToken) {
        const expectedId = userIdFromAccessToken(accessToken);
        if (!expectedId) {
          setMessage("This link is invalid or has expired. Request a new invitation or reset your password.");
          return;
        }

        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (error) {
          setMessage("This link is invalid or has expired. Request a new invitation or reset your password.");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user || user.id !== expectedId) {
          setMessage(
            "This browser is signed in as a different account. Open the link in a private window. No password was changed."
          );
          return;
        }

        if (needsPassword) {
          sessionStorage.setItem(PASSWORD_USER_KEY, user.id);
          router.replace("/reset-password");
          return;
        }

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        router.replace(homeForRole(profile?.role));
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setMessage("This link is invalid or has expired. Request a new invitation or reset your password.");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      router.replace(homeForRole(profile?.role));
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
