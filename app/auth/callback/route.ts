import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/auth/home-path";
import { safeAppPath } from "@/lib/invitations/errors";

/**
 * Handles the redirect from Supabase invite and magic-link emails.
 * Exchanges the one-time code, then only follows a same-role in-app path.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let destination = "/";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = profile?.role ?? null;
    }

    const requested = safeAppPath(searchParams.get("next"));
    const setPassword =
      searchParams.get("type") === "recovery" ||
      searchParams.get("type") === "invite" ||
      requested === "/reset-password";
    if (setPassword) {
      destination = "/reset-password";
    } else {
      const allowed =
        (role === "trainer" && requested?.startsWith("/trainer")) ||
        (role === "client" && requested?.startsWith("/client"));
      destination = allowed && requested ? requested : homeForRole(role);
    }
  }

  if (!code) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title></head><body><p>Signing you in…</p><script>
      window.location.replace("/auth/finish" + window.location.search + window.location.hash);
    </script></body></html>`;
    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
