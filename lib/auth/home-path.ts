export function homeForRole(role: string | null | undefined): string {
  if (role === "trainer") return "/trainer/dashboard";
  if (role === "client") return "/client/dashboard";
  return "/";
}

export function safeNextPath(next: string | null | undefined, role: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (role === "trainer" && next.startsWith("/trainer")) return next;
  if (role === "client" && next.startsWith("/client")) return next;
  return null;
}
