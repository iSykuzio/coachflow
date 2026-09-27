import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { AddExerciseForm } from "./add-exercise-form";
import { WorkoutLines } from "./workout-lines";
import { DuplicateWorkoutButton, EditWorkoutForm } from "./workout-actions";
import { AssignWorkoutForm } from "@/components/workouts/assign-workout-form";

type WorkoutRow = {
  id: string;
  name: string;
  description: string | null;
  trainer_id: string;
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
  trainer_id: string | null;
};

type ClientLink = {
  client_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type AssignmentRow = {
  id: string;
  status: string;
  assigned_date: string;
  due_date: string | null;
  client_id: string;
};

export default async function TrainerWorkoutBuilderPage({
  params,
}: {
  params: { workoutId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id, name, description, trainer_id")
    .eq("id", params.workoutId)
    .eq("trainer_id", user.id)
    .maybeSingle()
    .overrideTypes<WorkoutRow | null, { merge: false }>();

  if (workoutError || !workout) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Workout not found.
        </CardContent>
      </Card>
    );
  }

  const [{ data: lines }, { data: exercises }, { data: clientLinks }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("workout_exercises")
        .select("id, order_index, sets, reps, weight, rest_seconds, notes, exercise_id")
        .eq("workout_id", workout.id)
        .order("order_index")
        .overrideTypes<LineRow[], { merge: false }>(),
      supabase
        .from("exercises")
        .select("id, name, trainer_id")
        .or(`trainer_id.is.null,trainer_id.eq.${user.id}`)
        .order("name")
        .overrideTypes<ExerciseRow[], { merge: false }>(),
      supabase
        .from("trainer_clients")
        .select("client_id")
        .eq("trainer_id", user.id)
        .eq("status", "active")
        .overrideTypes<ClientLink[], { merge: false }>(),
      supabase
        .from("assigned_workouts")
        .select("id, status, assigned_date, due_date, client_id")
        .eq("workout_id", workout.id)
        .eq("trainer_id", user.id)
        .order("assigned_date", { ascending: false })
        .overrideTypes<AssignmentRow[], { merge: false }>(),
    ]);

  const exerciseMap = new Map((exercises ?? []).map((item) => [item.id, item]));
  const clientIds = (clientLinks ?? []).map((link) => link.client_id);
  let clientProfiles: ProfileRow[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds)
      .overrideTypes<ProfileRow[], { merge: false }>();
    clientProfiles = data ?? [];
  }

  const clientName = new Map(clientProfiles.map((profile) => [profile.id, profile.full_name ?? "Client"]));
  const nextOrder = (lines ?? []).reduce((max, line) => Math.max(max, line.order_index), -1) + 1;

  return (
    <div className="space-y-6">
      <Link
        href="/trainer/workouts"
        className="inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to workouts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{workout.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workout.description || "Add movements from your exercise library, then assign this session to a client."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditWorkoutForm workoutId={workout.id} name={workout.name} description={workout.description} />
          <DuplicateWorkoutButton
            name={workout.name}
            description={workout.description}
            lines={(lines ?? []).map((line) => ({
              id: line.id,
              order_index: line.order_index,
              sets: line.sets,
              reps: line.reps,
              weight: line.weight,
              rest_seconds: line.rest_seconds,
              notes: line.notes,
              exerciseId: line.exercise_id,
              name: exerciseMap.get(line.exercise_id)?.name ?? "Exercise",
            }))}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Session
        </h2>
        {(lines ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No exercises yet. Add a movement from your library below.
            </CardContent>
          </Card>
        ) : (
          <WorkoutLines
            lines={(lines ?? []).map((line) => ({
              id: line.id,
              order_index: line.order_index,
              sets: line.sets,
              reps: line.reps,
              weight: line.weight,
              rest_seconds: line.rest_seconds,
              notes: line.notes,
              exerciseId: line.exercise_id,
              name: exerciseMap.get(line.exercise_id)?.name ?? "Exercise",
            }))}
          />
        )}
        <AddExerciseForm
          workoutId={workout.id}
          nextOrder={nextOrder}
          exercises={exercises ?? []}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Assign to a client
        </h2>
        <AssignWorkoutForm
          defaultWorkoutId={workout.id}
          blockedReason={
            (lines ?? []).length === 0
              ? "Add at least one exercise before assigning this workout."
              : undefined
          }
          workouts={[{ id: workout.id, name: workout.name }]}
          clients={clientProfiles.map((profile) => ({
            id: profile.id,
            name: profile.full_name ?? "Client",
          }))}
        />
        {(assignments ?? []).length > 0 && (
          <div className="grid gap-3">
            {(assignments ?? []).map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {clientName.get(assignment.client_id) ?? "Client"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Assigned {formatDate(assignment.assigned_date)}
                      {assignment.due_date ? ` · due ${formatDate(assignment.due_date)}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {assignment.status.replace("_", " ")}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
