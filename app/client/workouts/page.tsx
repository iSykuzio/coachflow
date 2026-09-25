import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

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
  description: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export default async function ClientWorkoutsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignments, error } = await supabase
    .from("assigned_workouts")
    .select("id, status, assigned_date, due_date, workout_id")
    .eq("client_id", user.id)
    .order("assigned_date", { ascending: false })
    .overrideTypes<AssignmentRow[], { merge: false }>();

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load your workouts right now.
        </CardContent>
      </Card>
    );
  }

  const workoutIds = [...new Set((assignments ?? []).map((item) => item.workout_id))];
  const workoutMap = new Map<string, WorkoutRow>();

  if (workoutIds.length > 0) {
    const { data: workouts } = await supabase
      .from("workouts")
      .select("id, name, description")
      .in("id", workoutIds)
      .overrideTypes<WorkoutRow[], { merge: false }>();
    for (const workout of workouts ?? []) workoutMap.set(workout.id, workout);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your workouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open an assignment to log sets and complete the session.
        </p>
      </div>

      {(assignments ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workouts assigned yet. They’ll show up here when your trainer sends one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(assignments ?? []).map((assignment) => {
            const workout = workoutMap.get(assignment.workout_id);
            return (
              <Link
                key={assignment.id}
                href={`/client/workouts/${assignment.id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="transition-colors hover:bg-secondary/40">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{workout?.name ?? "Workout"}</p>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
