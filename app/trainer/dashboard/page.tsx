import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileSummary = {
  full_name: string;
};

export default async function TrainerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()
    .overrideTypes<ProfileSummary | null, { merge: false }>();

  if (profileError) redirect("/login");

  const { count: clientCount } = await supabase
    .from("trainer_clients")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .eq("status", "active");

  const { count: workoutCount } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", user.id);

  const { count: assignedCount } = await supabase
    .from("assigned_workouts")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .eq("status", "assigned");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s where your coaching business stands today.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{clientCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workouts built</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{workoutCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{assignedCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {(clientCount ?? 0) === 0
              ? "Invite your first client to start coaching."
              : "Your client roster is ready. Next up: exercises and workouts."}
          </p>
          {(clientCount ?? 0) === 0 && (
            <Link
              href="/trainer/clients"
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              Invite a client
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
