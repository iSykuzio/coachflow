"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { homeForRole } from "@/lib/auth/home-path";

export default function FinishAuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const type = hash.get("type") ?? query.get("type");
    const next = query.get("next");
    const needsPassword = type === "invite" || type === "recovery" || next === "/reset-password";
    const supabase = createClient();
    let settled = false;

    async function go(sessionUserId: string) {
      if (settled) return;
      settled = true;
      if (needsPassword) {
        router.replace("/reset-password");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionUserId)
        .maybeSingle();
      router.replace(homeForRole(profile?.role));
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void go(session.user.id);
        return;
      }
      if (event === "INITIAL_SESSION") {
        window.setTimeout(() => {
          if (!settled) setMessage("This link is invalid or has expired. Request a new invitation or reset your password.");
        }, 800);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
