import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isClientRoute = pathname.startsWith("/client");

  // Redirect unauthenticated users to login.
  if (!user) {
    if (isTrainerRoute || isClientRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);

      return NextResponse.redirect(url);
    }

    return response;
  }

  // Fetch the user's profile.
  if (isAuthRoute || isTrainerRoute || isClientRoute) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    // Never redirect between dashboards if the profile is missing.
    if (error || !profile || !["trainer", "client"].includes(profile.role)) {
      console.error("Profile lookup failed:", error?.message ?? "Missing or invalid profile");

      if (isTrainerRoute || isClientRoute) {
        return NextResponse.redirect(
          new URL("/login?error=profile_missing", request.url)
        );
      }

      return response;
    }

    const dashboard =
      profile.role === "trainer"
        ? "/trainer/dashboard"
        : "/client/dashboard";

    if (isAuthRoute) {
      return NextResponse.redirect(new URL(dashboard, request.url));
    }

    if (
      (isTrainerRoute && profile.role !== "trainer") ||
      (isClientRoute && profile.role !== "client")
    ) {
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
