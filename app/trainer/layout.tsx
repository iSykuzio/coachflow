
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

type ProfileSummary = {
  full_name: string;
  email: string;
  role: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/trainer/dashboard", icon: "dashboard" },
  { label: "Clients", href: "/trainer/clients", icon: "users" },
  { label: "Exercises", href: "/trainer/exercises", icon: "dumbbell" },
  { label: "Workouts", href: "/trainer/workouts", icon: "clipboard" },
  { label: "Messages", href: "/trainer/messages", icon: "messages" },
];

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (profileError || !profile || profile.role !== "trainer") {
    redirect("/client/dashboard");
  }

  return (
    <AppShell
      navItems={NAV_ITEMS}
      userName={profile.full_name}
      userEmail={profile.email}
      brandHref="/trainer/dashboard"
    >
      {children}
    </AppShell>
  );
}