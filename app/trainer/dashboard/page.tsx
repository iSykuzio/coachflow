import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

type ProfileSummary = { full_name: string | null };
type AssignmentRow = {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string | null;
  client_id: string;
  workout_id: string;
};

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export default async function TrainerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()
    .overrideTypes<ProfileSummary | null, { merge: false }>();

  const [active, pending, workouts, assigned, inProgress, recentResult] = await Promise.all([
    supabase
      .from("trainer_clients")
      .select("*", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .eq("status", "active"),
    supabase
      .from("client_invitations")
      .select("*", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("trainer_id", user.id),
    supabase
      .from("assigned_workouts")
      .select("*", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .eq("status", "assigned"),
    supabase
      .from("assigned_workouts")
      .select("*", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .eq("status", "in_progress"),
    supabase
      .from("assigned_workouts")
      .select("id, status, assigned_date, due_date, client_id, workout_id")
      .eq("trainer_id", user.id)
      .order("assigned_date", { ascending: false })
      .limit(5)
      .overrideTypes<AssignmentRow[], { merge: false }>(),
  ]);

  const recent = recentResult.data ?? [];
  const clientIds = [...new Set(recent.map((item) => item.client_id))];
  const workoutIds = [...new Set(recent.map((item) => item.workout_id))];
  const clientNames = new Map<string, string>();
  const workoutNames = new Map<string, string>();

  if (clientIds.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds)
      .overrideTypes<{ id: string; full_name: string | null }[], { merge: false }>();
    for (const person of people ?? []) clientNames.set(person.id, person.full_name ?? "Client");
  }
  if (workoutIds.length > 0) {
    const { data: rows } = await supabase
      .from("workouts")
      .select("id, name")
      .in("id", workoutIds)
      .overrideTypes<{ id: string; name: string }[], { merge: false }>();
    for (const row of rows ?? []) workoutNames.set(row.id, row.name);
  }

  const attention = recent.filter((item) => item.status === "assigned" || item.status === "in_progress");
  const stats = [
    { label: "Active clients", value: active.count ?? 0, href: "/trainer/clients" },
    { label: "Pending invitations", value: pending.count ?? 0, href: "/trainer/clients" },
    { label: "Workouts", value: workouts.count ?? 0, href: "/trainer/workouts" },
    { label: "Not started", value: assigned.count ?? 0, href: "/trainer/workouts" },
    { label: "In progress", value: inProgress.count ?? 0, href: "/trainer/workouts" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clients, invitations, and the workouts you have already assigned.
          </p>
        </div>
        <Link href="/trainer/clients" className={cn(buttonVariants({ size: "sm" }))}>
          Invite a client
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-colors hover:bg-secondary/40">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Needs a look
        </h2>
        {attention.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Nothing waiting. Assigned workouts that are not finished will show up here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {attention.map((item) => (
              <Link
                key={item.id}
                href={`/trainer/clients/${item.client_id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:bg-secondary/40">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium">{clientNames.get(item.client_id) ?? "Client"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {workoutNames.get(item.workout_id) ?? "Workout"}
                        {item.due_date ? ` · due ${formatDate(item.due_date)}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
