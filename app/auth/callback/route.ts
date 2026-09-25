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
    const allowed =
      (role === "trainer" && requested?.startsWith("/trainer")) ||
      (role === "client" && requested?.startsWith("/client"));
    destination = allowed && requested ? requested : homeForRole(role);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
