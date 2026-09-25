import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { SessionLogger, type LoggerLine, type LoggerSet } from "./session-logger";

type AssignmentRow = {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string | null;
  workout_id: string;
  trainer_id: string;
};

type WorkoutRow = {
  id: string;
  name: string;
  description: string | null;
};

type LineRow = {
  id: string;
  order_index: number;
  sets: number;
  reps: string;
  weight: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise_id: string;
};

type ExerciseRow = {
  id: string;
  name: string;
};

type SessionRow = {
  id: string;
  status: string;
};

type SetLogRow = LoggerSet;

export default async function ClientAssignedWorkoutPage({
  params,
}: {
  params: { assignedWorkoutId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment, error: assignmentError } = await supabase
    .from("assigned_workouts")
    .select("id, status, assigned_date, due_date, workout_id, trainer_id")
    .eq("id", params.assignedWorkoutId)
    .eq("client_id", user.id)
    .maybeSingle()
    .overrideTypes<AssignmentRow | null, { merge: false }>();

  if (assignmentError || !assignment) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Workout assignment not found.
        </CardContent>
      </Card>
    );
  }

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, description")
    .eq("id", assignment.workout_id)
    .maybeSingle()
    .overrideTypes<WorkoutRow | null, { merge: false }>();

  const { data: lines, error: linesError } = await supabase
    .from("workout_exercises")
    .select("id, order_index, sets, reps, weight, rest_seconds, notes, exercise_id")
    .eq("workout_id", assignment.workout_id)
    .order("order_index")
    .overrideTypes<LineRow[], { merge: false }>();

  if (linesError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          We couldn’t load the exercises on this workout.
        </CardContent>
      </Card>
    );
  }

  const exerciseIds = [...new Set((lines ?? []).map((line) => line.exercise_id))];
  const exerciseMap = new Map<string, string>();
  if (exerciseIds.length > 0) {
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds)
      .overrideTypes<ExerciseRow[], { merge: false }>();
    for (const exercise of exercises ?? []) exerciseMap.set(exercise.id, exercise.name);
  }

  const { data: openSession } = await supabase
    .from("workout_sessions")
    .select("id, status")
    .eq("assigned_workout_id", assignment.id)
    .eq("client_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle()
    .overrideTypes<SessionRow | null, { merge: false }>();

  const { data: latestCompleted } = openSession
    ? { data: null as SessionRow | null }
    : await supabase
        .from("workout_sessions")
        .select("id, status")
        .eq("assigned_workout_id", assignment.id)
        .eq("client_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .overrideTypes<SessionRow | null, { merge: false }>();

  const session = openSession ?? latestCompleted;
  let logs: SetLogRow[] = [];
  if (session) {
    const { data } = await supabase
      .from("set_logs")
      .select("workout_exercise_id, set_number, reps, weight, notes")
      .eq("workout_session_id", session.id)
      .overrideTypes<SetLogRow[], { merge: false }>();
    logs = data ?? [];
  }

  const loggerLines: LoggerLine[] = (lines ?? []).map((line) => ({
    id: line.id,
    name: exerciseMap.get(line.exercise_id) ?? "Exercise",
    sets: line.sets,
    reps: line.reps,
    weight: line.weight,
    rest_seconds: line.rest_seconds,
    notes: line.notes,
  }));

  const completed = assignment.status === "completed" || session?.status === "completed";

  return (
    <div className="space-y-6">
      <Link
        href="/client/workouts"
        className="inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to workouts
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{workout?.name ?? "Workout"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assigned {formatDate(assignment.assigned_date)}
          {assignment.due_date ? ` · due ${formatDate(assignment.due_date)}` : ""}
          {workout?.description ? ` · ${workout.description}` : ""}
        </p>
      </div>

      {loggerLines.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This workout has no exercises yet.
          </CardContent>
        </Card>
      ) : (
        <SessionLogger
          assignmentId={assignment.id}
          sessionId={session?.id ?? null}
          completed={completed}
          lines={loggerLines}
          logs={logs}
        />
      )}
    </div>
  );
}
