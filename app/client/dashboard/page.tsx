import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { PendingInvitations, type PendingInvitation } from "./pending-invitations";

type ProfileSummary = { full_name: string };
type TrainerLink = { trainer_id: string; status: string };
type AssignmentRow = {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string | null;
  workout_id: string;
};
type WorkoutRow = { id: string; name: string };
type HistoryItem = {
  session_id: string;
  assigned_workout_id: string;
  completed_at: string | null;
  workout_name: string;
};

const STATUS_LABEL: Record<string, string> = {
  assigned: "Ready to start",
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
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load your dashboard. Refresh and try again.
        </CardContent>
      </Card>
    );
  }

  const { data: pendingInvites } = trainerLink
    ? { data: [] as PendingInvitation[] }
    : await supabase.rpc("list_my_pending_invitations");

  const invitations = (pendingInvites ?? []) as PendingInvitation[];
  let trainerName: string | null = null;
  let openAssignments: Array<AssignmentRow & { workoutName: string }> = [];
  let latestCompleted: HistoryItem | null = null;

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

    openAssignments = (assignments ?? [])
      .map((assignment) => ({
        ...assignment,
        workoutName: workoutMap.get(assignment.workout_id) ?? "Workout",
      }))
      .sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });

    const { data: history } = await supabase
      .rpc("list_my_completed_sessions")
      .overrideTypes<HistoryItem[], { merge: false }>();
    latestCompleted = Array.isArray(history) ? history[0] ?? null : null;
  }

  const nextWorkout = openAssignments[0];

  return (
    <div className="space-y-8">
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
                ? "A trainer invited you. Connect to see their workouts."
                : "You're not linked to a trainer yet. Workouts appear after you accept an invitation."}
        </p>
      </div>

      {!trainerLink && invitations.length > 0 && <PendingInvitations invitations={invitations} />}

      {trainerLink && nextWorkout && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {nextWorkout.status === "in_progress" ? "Continue" : "Next workout"}
              </p>
              <p className="mt-1 text-lg font-semibold">{nextWorkout.workoutName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {STATUS_LABEL[nextWorkout.status] ?? nextWorkout.status}
                {nextWorkout.due_date ? ` · due ${formatDate(nextWorkout.due_date)}` : ""}
              </p>
            </div>
            <Link
              href={`/client/workouts/${nextWorkout.id}`}
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              {nextWorkout.status === "in_progress" ? "Continue workout" : "Start workout"}
            </Link>
          </CardContent>
        </Card>
      )}

      {trainerLink && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Still to do
            </h2>
            <Link href="/client/workouts" className="text-sm font-medium text-foreground hover:underline">
              View all
            </Link>
          </div>
          {openAssignments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                Nothing waiting. Your trainer hasn’t assigned an open workout.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {openAssignments.map((assignment) => (
                <Link key={assignment.id} href={`/client/workouts/${assignment.id}`} className="block rounded-lg">
                  <Card className="transition-colors hover:bg-secondary/40">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium">{assignment.workoutName}</p>
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

      {trainerLink && latestCompleted && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Last completed
            </h2>
            <Link href="/client/history" className="text-sm font-medium text-foreground hover:underline">
              History
            </Link>
          </div>
          <Link href={`/client/workouts/${latestCompleted.assigned_workout_id}`} className="block rounded-lg">
            <Card className="transition-colors hover:bg-secondary/40">
              <CardContent className="py-4">
                <p className="font-medium">{latestCompleted.workout_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latestCompleted.completed_at ? formatDate(latestCompleted.completed_at) : "Completed"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}
    </div>
  );
}
