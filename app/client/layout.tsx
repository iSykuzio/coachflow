import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

type ProfileSummary = {
  full_name: string;
  email: string;
  role: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/client/dashboard", icon: "dashboard" },
  { label: "Workouts", href: "/client/workouts", icon: "dumbbell" },
  { label: "History", href: "/client/history", icon: "clipboard" },
  { label: "Messages", href: "/client/messages", icon: "messages" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle()
    .overrideTypes<ProfileSummary | null, { merge: false }>();

  if (profileError || !profile || profile.role !== "client") {
    redirect("/trainer/dashboard");
  }

  await supabase.rpc("accept_pending_invitations");

  return (
    <AppShell
      navItems={NAV_ITEMS}
      userName={profile.full_name}
      userEmail={profile.email}
      brandHref="/client/dashboard"
    >
      {children}
    </AppShell>
  );
}
