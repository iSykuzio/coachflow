import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type SessionRow = {
  id: string;
  assigned_workout_id: string;
  completed_at: string | null;
  started_at: string;
};

type AssignmentRow = {
  id: string;
  workout_id: string;
};

type WorkoutRow = {
  id: string;
  name: string;
};

export default async function ClientHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("id, assigned_workout_id, completed_at, started_at")
    .eq("client_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .overrideTypes<SessionRow[], { merge: false }>();

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load your history right now.
        </CardContent>
      </Card>
    );
  }

  const assignmentIds = [...new Set((sessions ?? []).map((item) => item.assigned_workout_id))];
  const assignmentMap = new Map<string, AssignmentRow>();
  const workoutMap = new Map<string, string>();

  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabase
      .from("assigned_workouts")
      .select("id, workout_id")
      .in("id", assignmentIds)
      .overrideTypes<AssignmentRow[], { merge: false }>();
    for (const assignment of assignments ?? []) assignmentMap.set(assignment.id, assignment);

    const workoutIds = [...new Set((assignments ?? []).map((item) => item.workout_id))];
    if (workoutIds.length > 0) {
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id, name")
        .in("id", workoutIds)
        .overrideTypes<WorkoutRow[], { merge: false }>();
      for (const workout of workouts ?? []) workoutMap.set(workout.id, workout.name);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Completed sessions.</p>
      </div>

      {(sessions ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No completed workouts yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(sessions ?? []).map((session) => {
            const assignment = assignmentMap.get(session.assigned_workout_id);
            const name = assignment ? workoutMap.get(assignment.workout_id) : "Workout";
            return (
              <Link
                key={session.id}
                href={`/client/workouts/${session.assigned_workout_id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="transition-colors hover:bg-secondary/40">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{name ?? "Workout"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(session.completed_at ?? session.started_at)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Completed</span>
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
