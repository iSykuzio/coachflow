import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { PendingInvitations, type PendingInvitation } from "./pending-invitations";

type ProfileSummary = {
  full_name: string;
};

type TrainerLink = {
  trainer_id: string;
  status: string;
};

type AssignmentRow = {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string | null;
  workout_id: string;
};

type WorkoutRow = {
  id: string;
  name: string;
};

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export default async function ClientDashboardPage() {
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

  const { data: trainerLink, error: trainerLinkError } = await supabase
    .from("trainer_clients")
    .select("trainer_id, status")
    .eq("client_id", user.id)
    .eq("status", "active")
    .maybeSingle()
    .overrideTypes<TrainerLink | null, { merge: false }>();

  if (profileError || trainerLinkError) {
    redirect("/login");
  }

  const { data: pendingInvites } = trainerLink
    ? { data: [] as PendingInvitation[] }
    : await supabase.rpc("list_my_pending_invitations");

  const invitations = (pendingInvites ?? []) as PendingInvitation[];

  let trainerName: string | null = null;
  let openAssignments: Array<AssignmentRow & { workoutName: string }> = [];

  if (trainerLink) {
    const { data: trainerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", trainerLink.trainer_id)
      .maybeSingle()
      .overrideTypes<ProfileSummary | null, { merge: false }>();
    trainerName = trainerProfile?.full_name ?? "Your trainer";

    const { data: assignments } = await supabase
      .from("assigned_workouts")
      .select("id, status, assigned_date, due_date, workout_id")
      .eq("client_id", user.id)
      .neq("status", "completed")
      .order("assigned_date", { ascending: false })
      .overrideTypes<AssignmentRow[], { merge: false }>();

    const workoutIds = [...new Set((assignments ?? []).map((item) => item.workout_id))];
    const workoutMap = new Map<string, string>();
    if (workoutIds.length > 0) {
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id, name")
        .in("id", workoutIds)
        .overrideTypes<WorkoutRow[], { merge: false }>();
      for (const workout of workouts ?? []) workoutMap.set(workout.id, workout.name);
    }

    openAssignments = (assignments ?? []).map((assignment) => ({
      ...assignment,
      workoutName: workoutMap.get(assignment.workout_id) ?? "Workout",
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Hey, {profile?.full_name?.split(" ")[0] ?? "there"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {trainerLink
          ? `You're training with ${trainerName}.`
          : invitations.length > 1
            ? "More than one trainer invited you. Choose who you want to train with."
            : invitations.length === 1
              ? "A trainer invited you. Connect to start training with them."
              : "You're not linked to a trainer yet — once they invite you, your workouts will show up here."}
      </p>

      {!trainerLink && invitations.length > 0 && (
        <PendingInvitations invitations={invitations} />
      )}

      {trainerLink && (
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Open workouts
            </h2>
            <Link href="/client/workouts" className="text-sm font-medium text-foreground hover:underline">
              View all
            </Link>
          </div>
          {openAssignments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No open workouts. Your trainer hasn’t assigned one yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {openAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/client/workouts/${assignment.id}`}
                  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="transition-colors hover:bg-secondary/40">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium text-foreground">{assignment.workoutName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Assigned {formatDate(assignment.assigned_date)}
                          {assignment.due_date ? ` · due ${formatDate(assignment.due_date)}` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {STATUS_LABEL[assignment.status] ?? assignment.status}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
